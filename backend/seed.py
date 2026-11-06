"""Load a demo account with made-up matters. Safe to run more than once."""
from datetime import date, timedelta

from sqlalchemy import select

from app.activity import log_activity
from app.database import Base, SessionLocal, engine
from app.models import Hearing, Matter, Task, User
from app.security import hash_password

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo-pass-123"

# All names are invented.
MATTERS = [
    {
        "title": "Mehta Traders v. Orion Logistics",
        "court": "Bombay High Court",
        "case_number": "COMAP 212/2026",
        "status": "active",
        "days": 1,
        "notes": "File rejoinder before the date",
        "hearings": [(-62, "Admission", "heard"), (-27, "Reply", "adjourned"), (-6, "Arguments", "heard")],
        "tasks": [("File rejoinder", 0), ("Index the compilation", -2)],
    },
    {
        "title": "Kavya Rao v. State of Maharashtra",
        "court": "Bombay High Court",
        "case_number": "WP 1184/2026",
        "status": "active",
        "days": 3,
        "notes": None,
        "hearings": [(-40, "Notice", "heard"), (-13, "Reply", "adjourned")],
        "tasks": [("Prepare the list of dates", 2)],
    },
    {
        "title": "Sunrise Developers v. Nikhil Joshi",
        "court": "NCLT Mumbai",
        "case_number": "CP 77/2026",
        "status": "adjourned",
        "days": 5,
        "notes": "Adjourned at the respondent's request",
        "hearings": [(-95, "Admission", "heard"), (-54, "Reply", "adjourned"), (-20, "Arguments", "adjourned")],
        "tasks": [("Call the client about settlement", 4)],
    },
    {
        "title": "Greenfield Foods v. Union of India",
        "court": "Supreme Court of India",
        "case_number": "SLP(C) 3021/2026",
        "status": "active",
        "days": 12,
        "notes": "Paper book to be indexed",
        "hearings": [(-34, "Admission", "reserved")],
        "tasks": [("Index the paper book", 9), ("Brief the senior counsel", 10)],
    },
    {
        "title": "Anita Desai v. Prime Motors",
        "court": "NCDRC",
        "case_number": "CC 450/2025",
        "status": "active",
        "days": 20,
        "notes": None,
        "hearings": [(-140, "Evidence", "heard"), (-75, "Evidence", "adjourned")],
        "tasks": [],
    },
    {
        "title": "Rohan Kulkarni v. Union of India",
        "court": "Central Administrative Tribunal",
        "case_number": "OA 96/2026",
        "status": "adjourned",
        "days": 34,
        "notes": None,
        "hearings": [(-110, "Notice", "adjourned")],
        "tasks": [],
    },
    {
        "title": "Patil Agencies v. Coastal Bank",
        "court": "Bombay High Court",
        "case_number": "COMAP 58/2024",
        "status": "closed",
        "days": None,
        "notes": "Disposed of by consent",
        "hearings": [(-150, "Final hearing", "disposed")],
        "tasks": [],
    },
]


def main():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == DEMO_EMAIL)):
            print("Demo account already exists.")
            return
        user = User(name="Demo Advocate", email=DEMO_EMAIL, password_hash=hash_password(DEMO_PASSWORD))
        db.add(user)
        db.flush()
        today = date.today()
        for item in MATTERS:
            days = item["days"]
            matter = Matter(
                user_id=user.id,
                title=item["title"],
                court=item["court"],
                case_number=item["case_number"],
                status=item["status"],
                next_hearing=None if days is None else today + timedelta(days=days),
                notes=item["notes"],
            )
            db.add(matter)
            for offset, purpose, outcome in item["hearings"]:
                matter.hearings.append(
                    Hearing(hearing_date=today + timedelta(days=offset), purpose=purpose, outcome=outcome)
                )
            for title, due_in in item["tasks"]:
                matter.tasks.append(Task(title=title, due_date=today + timedelta(days=due_in)))
            log_activity(db, user, f"Added {matter.title}", matter)
        db.commit()
    print(f"Demo account ready: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
