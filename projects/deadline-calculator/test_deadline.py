from datetime import date

import pytest

from deadline import add_working_days, read_holidays

MONDAY = date(2026, 11, 2)
FRIDAY = date(2026, 11, 6)


def test_counts_within_a_week():
    assert add_working_days(MONDAY, 3) == date(2026, 11, 5)


def test_skips_the_weekend():
    assert add_working_days(FRIDAY, 1) == date(2026, 11, 9)


def test_skips_holidays():
    assert add_working_days(MONDAY, 1, {date(2026, 11, 3)}) == date(2026, 11, 4)


def test_zero_days_returns_the_start():
    assert add_working_days(FRIDAY, 0) == FRIDAY


def test_negative_days_are_rejected():
    with pytest.raises(ValueError):
        add_working_days(MONDAY, -1)


def test_read_holidays_skips_comments_and_blanks(tmp_path):
    file = tmp_path / "holidays.txt"
    file.write_text("# Diwali\n2026-11-08\n\n2026-12-25\n", encoding="utf-8")
    assert read_holidays(file) == {date(2026, 11, 8), date(2026, 12, 25)}
