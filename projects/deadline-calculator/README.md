# Deadline Calculator

A command-line tool that adds working days to a date, skipping weekends and any holidays you list. It uses only the Python standard library.

```bash
python deadline.py 2026-11-06 10 --holidays holidays.txt
```

`holidays.txt` holds one `YYYY-MM-DD` per line. Run the tests with `python -m pytest`.
