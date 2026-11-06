"""A small URL shortener: FastAPI on top of the standard library's sqlite3."""
import os
import secrets
import sqlite3
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, HttpUrl

SCHEMA = """
CREATE TABLE IF NOT EXISTS links (
    code TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    visits INTEGER NOT NULL DEFAULT 0
)
"""


def database_path() -> str:
    return os.getenv("SHORTENER_DB", "links.db")


def get_db():
    connection = sqlite3.connect(database_path())
    connection.row_factory = sqlite3.Row
    try:
        yield connection
    finally:
        connection.close()


@asynccontextmanager
async def lifespan(_: FastAPI):
    connection = sqlite3.connect(database_path())
    connection.execute(SCHEMA)
    connection.commit()
    connection.close()
    yield


app = FastAPI(title="URL Shortener", lifespan=lifespan)


class LinkIn(BaseModel):
    # HttpUrl accepts only http and https, so javascript: links cannot be stored.
    url: HttpUrl


def create_code(db: sqlite3.Connection, url: str) -> str:
    for _ in range(5):
        code = secrets.token_urlsafe(5)
        try:
            with db:
                db.execute("INSERT INTO links (code, url) VALUES (?, ?)", (code, url))
            return code
        except sqlite3.IntegrityError:
            continue  # Two random codes matched; try another.
    raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Could not create a link. Try again.")


@app.post("/links", status_code=status.HTTP_201_CREATED)
def shorten(body: LinkIn, request: Request, db: sqlite3.Connection = Depends(get_db)):
    code = create_code(db, str(body.url))
    return {"code": code, "short_url": f"{request.base_url}{code}"}


@app.get("/links/{code}")
def link_stats(code: str, db: sqlite3.Connection = Depends(get_db)):
    row = db.execute("SELECT code, url, visits FROM links WHERE code = ?", (code,)).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found.")
    return dict(row)


@app.get("/{code}")
def follow(code: str, db: sqlite3.Connection = Depends(get_db)):
    with db:
        # One statement, so two visits at the same moment cannot lose a count.
        row = db.execute(
            "UPDATE links SET visits = visits + 1 WHERE code = ? RETURNING url", (code,)
        ).fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Link not found.")
    return RedirectResponse(row["url"], status.HTTP_307_TEMPORARY_REDIRECT)
