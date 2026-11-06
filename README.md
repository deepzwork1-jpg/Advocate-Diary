# Hearing Diary

A full-stack practice manager for advocates. Track matters, record what happened at each hearing, see every date on a calendar, manage tasks and watch trends on an analytics page. Each user signs in and sees only their own data.

This is a sample project. All demo data is invented.

**Stack:** Python, FastAPI, SQLAlchemy, SQLite (or Postgres through `DATABASE_URL`), React 18, React Router, Recharts, Vite, pytest, GitHub Actions, Docker.

## Features

- **Dashboard:** summary cards, the next seven days, open tasks and recent activity
- **Matters:** search, status filter, server-side pagination and CSV export
- **Hearing history:** recording an outcome updates the matter's status and next date
- **Calendar:** a month view of scheduled dates and recorded hearings
- **Tasks:** linked to a matter, with due dates and overdue flags
- **Analytics:** hearings per month, matters by court and status, adjournment rate
- **Activity timeline:** kept for each matter and across the account
- **Accounts:** bcrypt password hashing, JWT tokens and per-user data isolation
- **Interface:** dark mode, phone layout with bottom tabs, loading and empty states

## Run it locally

You need Python 3.12+ and Node 20+.

**Backend** (from `backend/`, on Windows use `venv\Scripts\activate`):

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements-dev.txt
python seed.py
uvicorn app.main:app --reload
```

The interactive API docs are at http://localhost:8000/docs.

**Frontend** (from `frontend/`, in a second terminal):

```bash
npm install
npm run dev
```

Open http://localhost:5173 and sign in with the demo account `demo@example.com` / `demo-pass-123`.

**Docker** serves the API and the built UI together on one port:

```bash
docker build -t hearing-diary .
docker run -p 8000:8000 -e SECRET_KEY=change-me hearing-diary
```

## Tests

```bash
cd backend
python -m pytest
```

GitHub Actions runs every test suite and the frontend build on each push.

## API

Full details are in the interactive docs at `/docs`.

| Area | Endpoints |
| --- | --- |
| Accounts | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Matters | `GET, POST /api/matters`, `GET, PATCH, DELETE /api/matters/{id}`, `GET /api/matters/export` |
| Hearings | `GET, POST /api/matters/{id}/hearings`, `GET /api/hearings/upcoming` |
| Tasks | `GET /api/tasks`, `POST /api/matters/{id}/tasks`, `PATCH, DELETE /api/tasks/{id}` |
| Insights | `GET /api/stats`, `GET /api/analytics`, `GET /api/calendar`, `GET /api/activity`, `GET /api/matters/{id}/activity` |

## Design notes

- **PATCH uses `exclude_unset`.** Only fields the client sent are written, so a status change cannot blank the notes. An explicit `null` still clears an optional field.
- **Back-filling is safe.** Recording an older hearing keeps the history but does not change the status or next date set by a later one.
- **Another user's record returns 404, not 403**, so ids belonging to other users stay hidden.
- **Login gives one error** for a wrong password and an unknown email, so the form does not reveal who has an account.
- **No default secret key.** If `SECRET_KEY` is missing, a random one is generated at start-up. Sessions end on restart, but a known key can never ship by accident.
- **CSV cells are neutralised**, so a matter titled `=SOMETHING` cannot run as a formula in Excel.
- **Analytics loads on demand.** The chart library is split into its own bundle, so other pages stay light.

## Small projects

The [`projects`](projects) folder holds three small exercises, each with its own tests:

- [Deadline Calculator](projects/deadline-calculator): a Python command-line tool for working-day deadlines
- [URL Shortener](projects/url-shortener): a FastAPI service using hand-written SQL
- [Expense Splitter](projects/expense-splitter): a JavaScript module that settles shared costs

## What I would add next

- Database migrations with Alembic (tables are created at start-up today)
- Refresh tokens, and an httpOnly cookie in place of `localStorage`
- Rate limiting on login
- Email reminders the day before a hearing
