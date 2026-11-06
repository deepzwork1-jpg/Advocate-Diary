# Hearing Diary

A small full-stack app for tracking court matters and the next hearing date in each one.
Each user signs in and sees only their own matters, a summary, and the hearings due in the next seven days.

Built as a compact sample project: every part (API, auth, database, UI, tests, CI, Docker) is small enough to read in one sitting.

**Stack:** Python, FastAPI, SQLAlchemy, SQLite (or Postgres through `DATABASE_URL`), React 18, Vite, pytest, GitHub Actions, Docker.

## Features

- Register and sign in with hashed passwords (bcrypt) and JWT bearer tokens
- Create, update and delete matters
- Search, status filter and server-side pagination
- Summary counts and a seven-day hearing list
- Per-user data isolation, covered by tests
- Dark mode and a phone-friendly layout

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

Open http://localhost:5173 and sign in with the demo account `demo@example.com` / `demo-pass-123`. All seed data is invented.

**Or with Docker**, which serves the API and the built UI together on one port:

```bash
docker build -t hearing-diary .
docker run -p 8000:8000 -e SECRET_KEY=change-me hearing-diary
```

## Tests

```bash
cd backend
python -m pytest
```

GitHub Actions runs the backend tests and the frontend build on every push.

## API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Get a token |
| GET | `/api/auth/me` | Current user |
| GET | `/api/matters` | List, with `q`, `status`, `page`, `page_size` |
| POST | `/api/matters` | Add a matter |
| GET | `/api/matters/{id}` | Read one matter |
| PATCH | `/api/matters/{id}` | Change only the fields sent |
| DELETE | `/api/matters/{id}` | Delete a matter |
| GET | `/api/hearings/upcoming` | Hearings in the next `days` (default 7) |
| GET | `/api/stats` | Summary counts |
| GET | `/api/health` | Health check |

## Design notes

- **PATCH uses `exclude_unset`.** Only fields the client actually sent are written, so a status change cannot blank the notes. Clearing an optional field with an explicit `null` still works.
- **Another user's matter returns 404, not 403**, so ids belonging to other users stay hidden.
- **Login gives one error** for a wrong password and an unknown email, so the form does not reveal who has an account.
- **No default secret key.** If `SECRET_KEY` is missing, a random one is generated at start-up. Sessions end on restart, but a known key can never ship by accident.
- **Sorting ends with the id**, so a matter cannot appear on two pages when several share a date.

## What I would add next

- Database migrations with Alembic (tables are created at start-up today)
- Refresh tokens, and an httpOnly cookie in place of `localStorage`
- Rate limiting on login
- Email reminders the day before a hearing
