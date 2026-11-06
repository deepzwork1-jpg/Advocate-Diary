from collections import Counter
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import get_current_user
from .matters import get_owned_matter

router = APIRouter(prefix="/api", tags=["insights"])

Activity = models.Activity
Hearing = models.Hearing
Matter = models.Matter
Task = models.Task

MAX_CALENDAR_DAYS = 62
MONTHS_SHOWN = 6


def month_starts(today: date, count: int) -> list[date]:
    """The first day of the last `count` months, oldest first."""
    starts = [today.replace(day=1)]
    for _ in range(count - 1):
        starts.append((starts[-1] - timedelta(days=1)).replace(day=1))
    return starts[::-1]


@router.get("/activity", response_model=list[schemas.ActivityOut])
def recent_activity(
    limit: int = Query(10, ge=1, le=50),
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return db.scalars(
        select(Activity)
        .where(Activity.user_id == user.id)
        .order_by(Activity.created_at.desc(), Activity.id.desc())
        .limit(limit)
    ).all()


@router.get("/matters/{matter_id}/activity", response_model=list[schemas.ActivityOut])
def matter_activity(
    matter_id: int,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    matter = get_owned_matter(matter_id, user, db)
    return db.scalars(
        select(Activity)
        .where(Activity.matter_id == matter.id)
        .order_by(Activity.created_at.desc(), Activity.id.desc())
    ).all()


@router.get("/calendar", response_model=list[schemas.CalendarEntry])
def calendar(
    start: date,
    end: date,
    user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if end < start or (end - start).days > MAX_CALENDAR_DAYS:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_CONTENT,
            f"Choose a range of up to {MAX_CALENDAR_DAYS} days.",
        )
    scheduled = db.scalars(
        select(Matter).where(
            Matter.user_id == user.id,
            Matter.next_hearing.between(start, end),
            Matter.status != "closed",
        )
    ).all()
    recorded = db.execute(
        select(Hearing, Matter)
        .join(Hearing.matter)
        .where(Matter.user_id == user.id, Hearing.hearing_date.between(start, end))
    ).all()
    entries = [
        {
            "date": matter.next_hearing,
            "matter_id": matter.id,
            "title": matter.title,
            "court": matter.court,
            "kind": "scheduled",
        }
        for matter in scheduled
    ] + [
        {
            "date": hearing.hearing_date,
            "matter_id": matter.id,
            "title": matter.title,
            "court": matter.court,
            "kind": "recorded",
            "outcome": hearing.outcome,
        }
        for hearing, matter in recorded
    ]
    return sorted(entries, key=lambda entry: (entry["date"], entry["title"]))


@router.get("/analytics", response_model=schemas.Analytics)
def analytics(user: models.User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today()

    by_court = db.execute(
        select(Matter.court, func.count())
        .where(Matter.user_id == user.id)
        .group_by(Matter.court)
        .order_by(func.count().desc(), Matter.court)
        .limit(6)
    ).all()
    by_status = dict(
        db.execute(
            select(Matter.status, func.count())
            .where(Matter.user_id == user.id)
            .group_by(Matter.status)
        ).all()
    )

    outcomes = db.execute(
        select(Hearing.hearing_date, Hearing.outcome)
        .join(Hearing.matter)
        .where(Matter.user_id == user.id)
    ).all()
    adjourned = sum(1 for _, outcome in outcomes if outcome == "adjourned")

    months = month_starts(today, MONTHS_SHOWN)
    per_month = Counter(
        hearing_date.replace(day=1) for hearing_date, _ in outcomes if hearing_date >= months[0]
    )

    open_task_dates = db.scalars(
        select(Task.due_date)
        .join(Task.matter)
        .where(Matter.user_id == user.id, Task.done.is_(False))
    ).all()

    return {
        "by_court": [{"label": court, "count": count} for court, count in by_court],
        "by_status": [
            {"label": label, "count": by_status.get(label, 0)}
            for label in ("active", "adjourned", "closed")
        ],
        "hearings_by_month": [
            {"label": month.strftime("%b"), "count": per_month[month]} for month in months
        ],
        "adjournment_rate": round(100 * adjourned / len(outcomes)) if outcomes else 0,
        "open_tasks": len(open_task_dates),
        "overdue_tasks": sum(1 for due in open_task_dates if due and due < today),
    }
