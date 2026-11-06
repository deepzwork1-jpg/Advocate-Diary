import csv
import io
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..activity import log_activity
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/api", tags=["matters"])

Matter = models.Matter


def get_owned_matter(matter_id: int, user: models.User, db: Session) -> Matter:
    matter = db.get(Matter, matter_id)
    # 404 rather than 403, so one user cannot learn which ids exist for another.
    if matter is None or matter.user_id != user.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Matter not found.")
    return matter


def upcoming_filter(user: models.User, days: int):
    today = date.today()
    return (
        Matter.user_id == user.id,
        Matter.next_hearing.between(today, today + timedelta(days=days)),
        Matter.status != "closed",
    )


def matter_filters(user: models.User, matter_status: str | None, q: str | None) -> list:
    filters = [Matter.user_id == user.id]
    if matter_status:
        filters.append(Matter.status == matter_status)
    if q:
        filters.append(
            or_(
                Matter.title.icontains(q, autoescape=True),
                Matter.court.icontains(q, autoescape=True),
                Matter.case_number.icontains(q, autoescape=True),
            )
        )
    return filters


# Dated matters first, soonest on top; id keeps paging stable between requests.
MATTER_ORDER = (Matter.next_hearing.is_(None), Matter.next_hearing, Matter.id)


def csv_safe(value) -> str:
    text = "" if value is None else str(value)
    # A cell starting with these runs as a formula when the file opens in Excel.
    return f"'{text}" if text[:1] in ("=", "+", "-", "@") else text


@router.get("/matters", response_model=schemas.MatterPage)
def list_matters(
    matter_status: schemas.Status | None = Query(None, alias="status"),
    q: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    filters = matter_filters(user, matter_status, q)
    total = db.scalar(select(func.count()).select_from(Matter).where(*filters))
    items = db.scalars(
        select(Matter)
        .where(*filters)
        .order_by(*MATTER_ORDER)
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {"items": items, "total": total, "page": page, "page_size": page_size}


# Declared before /matters/{matter_id}, or "export" would be read as an id.
@router.get("/matters/export")
def export_matters(
    matter_status: schemas.Status | None = Query(None, alias="status"),
    q: str | None = None,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matters = db.scalars(
        select(Matter).where(*matter_filters(user, matter_status, q)).order_by(*MATTER_ORDER)
    ).all()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Title", "Court", "Case number", "Status", "Next hearing", "Notes"])
    for matter in matters:
        writer.writerow(
            csv_safe(value)
            for value in (
                matter.title,
                matter.court,
                matter.case_number,
                matter.status,
                matter.next_hearing,
                matter.notes,
            )
        )
    return Response(
        output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="matters.csv"'},
    )


@router.post("/matters", response_model=schemas.MatterOut, status_code=status.HTTP_201_CREATED)
def create_matter(
    body: schemas.MatterCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = Matter(**body.model_dump(), user_id=user.id)
    db.add(matter)
    log_activity(db, user, f"Added {matter.title}", matter)
    db.commit()
    db.refresh(matter)
    return matter


@router.get("/matters/{matter_id}", response_model=schemas.MatterOut)
def get_matter(
    matter_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_owned_matter(matter_id, user, db)


@router.patch("/matters/{matter_id}", response_model=schemas.MatterOut)
def update_matter(
    matter_id: int,
    body: schemas.MatterUpdate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = get_owned_matter(matter_id, user, db)
    # exclude_unset: a field the client left out must not be blanked.
    changes = body.model_dump(exclude_unset=True)
    previous_status = matter.status
    for field, value in changes.items():
        setattr(matter, field, value)
    if matter.status != previous_status:
        log_activity(db, user, f"Marked {matter.title} as {matter.status}", matter)
    elif changes:
        log_activity(db, user, f"Updated {matter.title}", matter)
    db.commit()
    db.refresh(matter)
    return matter


@router.delete("/matters/{matter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_matter(
    matter_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = get_owned_matter(matter_id, user, db)
    log_activity(db, user, f"Deleted {matter.title}")
    db.delete(matter)
    db.commit()


@router.get("/hearings/upcoming", response_model=list[schemas.MatterOut])
def upcoming_hearings(
    days: int = Query(7, ge=1, le=90),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Matter).where(*upcoming_filter(user, days)).order_by(Matter.next_hearing)
    ).all()


@router.get("/stats", response_model=schemas.Stats)
def stats(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    counts = dict(
        db.execute(
            select(Matter.status, func.count())
            .where(Matter.user_id == user.id)
            .group_by(Matter.status)
        ).all()
    )
    this_week = db.scalar(select(func.count()).select_from(Matter).where(*upcoming_filter(user, 7)))
    return {
        "active": counts.get("active", 0),
        "adjourned": counts.get("adjourned", 0),
        "closed": counts.get("closed", 0),
        "hearings_this_week": this_week,
    }
