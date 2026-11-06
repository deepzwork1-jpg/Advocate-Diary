"""Work out a due date by counting working days, skipping weekends and listed holidays."""
import argparse
from datetime import date, timedelta
from pathlib import Path

SATURDAY = 5


def is_working_day(day: date, holidays: set[date]) -> bool:
    return day.weekday() < SATURDAY and day not in holidays


def add_working_days(start: date, days: int, holidays: set[date] | None = None) -> date:
    """Return the date `days` working days after `start`; the start date itself is not counted."""
    if days < 0:
        raise ValueError("days cannot be negative")
    holidays = holidays or set()
    current = start
    remaining = days
    while remaining:
        current += timedelta(days=1)
        if is_working_day(current, holidays):
            remaining -= 1
    return current


def read_holidays(path: Path) -> set[date]:
    """Read one ISO date per line; blank lines and lines starting with # are skipped."""
    lines = (line.strip() for line in path.read_text(encoding="utf-8").splitlines())
    return {date.fromisoformat(line) for line in lines if line and not line.startswith("#")}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("start", type=date.fromisoformat, help="start date, YYYY-MM-DD")
    parser.add_argument("days", type=int, help="working days to add")
    parser.add_argument("--holidays", type=Path, help="file with one YYYY-MM-DD per line")
    args = parser.parse_args()

    holidays = read_holidays(args.holidays) if args.holidays else set()
    print(add_working_days(args.start, args.days, holidays).isoformat())


if __name__ == "__main__":
    main()
