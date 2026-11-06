from datetime import date, datetime
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    EmailStr,
    StringConstraints,
    field_validator,
    model_validator,
)

Status = Literal["active", "adjourned", "closed"]
Outcome = Literal["heard", "adjourned", "reserved", "disposed"]
RequiredText = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class UserCreate(BaseModel):
    name: RequiredText
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def check_password(cls, value):
        if len(value) < 8:
            raise ValueError("must be at least 8 characters")
        # bcrypt only accepts 72 bytes, and a non-English letter can take several.
        if len(value.encode()) > 72:
            raise ValueError("is too long")
        return value


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class MatterCreate(BaseModel):
    title: RequiredText
    court: RequiredText
    case_number: str | None = None
    status: Status = "active"
    next_hearing: date | None = None
    notes: str | None = None


class MatterUpdate(BaseModel):
    """Every field is optional so a PATCH changes only what the client sent."""

    title: RequiredText | None = None
    court: RequiredText | None = None
    case_number: str | None = None
    status: Status | None = None
    next_hearing: date | None = None
    notes: str | None = None

    # Omitting these is fine, but an explicit null would break a NOT NULL column.
    @field_validator("title", "court", "status")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("cannot be empty")
        return value


class MatterOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    court: str
    case_number: str | None
    status: Status
    next_hearing: date | None
    notes: str | None
    created_at: datetime


class MatterPage(BaseModel):
    items: list[MatterOut]
    total: int
    page: int
    page_size: int


class Stats(BaseModel):
    active: int
    adjourned: int
    closed: int
    hearings_this_week: int


class HearingCreate(BaseModel):
    hearing_date: date
    outcome: Outcome
    purpose: str | None = None
    notes: str | None = None
    next_date: date | None = None

    @model_validator(mode="after")
    def check_next_date(self):
        if self.next_date is None:
            return self
        if self.outcome == "disposed":
            raise ValueError("A disposed matter has no next date.")
        if self.next_date <= self.hearing_date:
            raise ValueError("The next date must be after this hearing.")
        return self


class HearingOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    matter_id: int
    hearing_date: date
    purpose: str | None
    outcome: Outcome
    notes: str | None


class TaskCreate(BaseModel):
    title: RequiredText
    due_date: date | None = None


class TaskUpdate(BaseModel):
    title: RequiredText | None = None
    due_date: date | None = None
    done: bool | None = None

    @field_validator("title", "done")
    @classmethod
    def reject_null(cls, value):
        if value is None:
            raise ValueError("cannot be empty")
        return value


class TaskOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    matter_id: int
    matter_title: str
    title: str
    due_date: date | None
    done: bool


class ActivityOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    matter_id: int | None
    message: str
    created_at: datetime


class CalendarEntry(BaseModel):
    date: date
    matter_id: int
    title: str
    court: str
    kind: Literal["scheduled", "recorded"]
    outcome: Outcome | None = None


class CountByLabel(BaseModel):
    label: str
    count: int


class Analytics(BaseModel):
    by_court: list[CountByLabel]
    by_status: list[CountByLabel]
    hearings_by_month: list[CountByLabel]
    adjournment_rate: int
    open_tasks: int
    overdue_tasks: int
