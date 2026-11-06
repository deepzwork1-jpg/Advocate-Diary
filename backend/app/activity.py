from sqlalchemy.orm import Session

from .models import Activity, Matter, User


def log_activity(db: Session, user: User, message: str, matter: Matter | None = None) -> None:
    """Add a timeline entry to the caller's open transaction, so both commit together."""
    db.add(Activity(user_id=user.id, matter=matter, message=message))
