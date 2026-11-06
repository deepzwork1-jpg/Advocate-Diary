from fastapi import APIRouter, Depends, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..activity import log_activity
from ..database import get_db
from ..security import get_current_user
from .matters import get_owned_matter

router = APIRouter(prefix="/api/matters/{matter_id}/hearings", tags=["hearings"])

Hearing = models.Hearing


def apply_outcome(matter: models.Matter, body: schemas.HearingCreate) -> None:
    if body.outcome == "disposed":
        matter.status = "closed"
        matter.next_hearing = None
        return
    matter.status = "adjourned" if body.outcome == "adjourned" else "active"
    if body.next_date:
        matter.next_hearing = body.next_date
    elif matter.next_hearing and matter.next_hearing <= body.hearing_date:
        # That date has now been used up, and no new one was given.
        matter.next_hearing = None


@router.get("", response_model=list[schemas.HearingOut])
def list_hearings(
    matter_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = get_owned_matter(matter_id, user, db)
    return db.scalars(
        select(Hearing)
        .where(Hearing.matter_id == matter.id)
        .order_by(Hearing.hearing_date.desc(), Hearing.id.desc())
    ).all()


@router.post("", response_model=schemas.HearingOut, status_code=status.HTTP_201_CREATED)
def record_hearing(
    matter_id: int,
    body: schemas.HearingCreate,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = get_owned_matter(matter_id, user, db)
    latest = db.scalar(select(func.max(Hearing.hearing_date)).where(Hearing.matter_id == matter.id))
    # Filling in an older date must not undo what a later hearing already decided.
    if latest is None or body.hearing_date >= latest:
        apply_outcome(matter, body)

    hearing = Hearing(
        matter_id=matter.id,
        hearing_date=body.hearing_date,
        purpose=body.purpose,
        outcome=body.outcome,
        notes=body.notes,
    )
    db.add(hearing)
    log_activity(db, user, f"Recorded a hearing in {matter.title}: {body.outcome}", matter)
    db.commit()
    db.refresh(hearing)
    return hearing
