from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(100))


class Matter(Base):
    __tablename__ = "matters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    court: Mapped[str] = mapped_column(String(120))
    case_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    next_hearing: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now)

    hearings: Mapped[list["Hearing"]] = relationship(
        back_populates="matter", cascade="all, delete-orphan"
    )
    tasks: Mapped[list["Task"]] = relationship(
        back_populates="matter", cascade="all, delete-orphan"
    )
    # No delete cascade: the timeline keeps its entry after a matter is deleted.
    activities: Mapped[list["Activity"]] = relationship(back_populates="matter")


class Hearing(Base):
    """What happened on a past date; Matter.next_hearing holds the date still to come."""

    __tablename__ = "hearings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    matter_id: Mapped[int] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), index=True)
    hearing_date: Mapped[date] = mapped_column(Date, index=True)
    purpose: Mapped[str | None] = mapped_column(String(200), nullable=True)
    outcome: Mapped[str] = mapped_column(String(20))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    matter: Mapped[Matter] = relationship(back_populates="hearings")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    matter_id: Mapped[int] = mapped_column(ForeignKey("matters.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True, index=True)
    done: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

    matter: Mapped[Matter] = relationship(back_populates="tasks")

    @property
    def matter_title(self) -> str:
        return self.matter.title


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    matter_id: Mapped[int | None] = mapped_column(
        ForeignKey("matters.id", ondelete="SET NULL"), nullable=True, index=True
    )
    message: Mapped[str] = mapped_column(String(300))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utc_now, index=True)

    matter: Mapped[Matter | None] = relationship(back_populates="activities")
