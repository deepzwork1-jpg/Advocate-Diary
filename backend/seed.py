"""Load a demo account with made-up matters. Safe to run more than once."""
from datetime import date, timedelta

from sqlalchemy import select

from app.database import Base, SessionLocal, engine
from app.models import Matter, User
from app.security import hash_password

DEMO_EMAIL = "demo@example.com"
DEMO_PASSWORD = "demo-pass-123"

# All names are invented. (title, court, case number, status, days from today, notes)
MATTERS = [
    ("Mehta Traders v. Orion Logistics", "Bombay High Court", "COMAP 212/2026", "active", 1, "File rejoinder before the date"),
    ("Kavya Rao v. State of Maharashtra", "Bombay High Court", "WP 1184/2026", "active", 3, None),
    ("Sunrise Developers v. Nikhil Joshi", "NCLT Mumbai", "CP 77/2026", "adjourned", 5, "Adjourned at the respondent's request"),
    ("Greenfield Foods v. Union of India", "Supreme Court of India", "SLP(C) 3021/2026", "active", 12, "Paper book to be indexed"),
    ("Anita Desai v. Prime Motors", "NCDRC", "CC 450/2025", "active", 20, None),
    ("Rohan Kulkarni v. Union of India", "Central Administrative Tribunal", "OA 96/2026", "adjourned", 34, None),
    ("Patil Agencies v. Coastal Bank", "Bombay High Court", "COMAP 58/2024", "closed", None, "Disposed of by consent"),
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
        for title, court, case_number, status, days, notes in MATTERS:
            db.add(
                Matter(
                    user_id=user.id,
                    title=title,
                    court=court,
                    case_number=case_number,
                    status=status,
                    next_hearing=None if days is None else today + timedelta(days=days),
                    notes=notes,
                )
            )
        db.commit()
    print(f"Demo account ready: {DEMO_EMAIL} / {DEMO_PASSWORD}")


if __name__ == "__main__":
    main()
