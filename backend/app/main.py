from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from .routers import auth, matters

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Hearing Diary API", version="1.0.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(matters.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


# Mounted last so it cannot shadow the API. Absent during frontend dev and in tests.
if FRONTEND_DIST.is_dir():
    app.mount("/", StaticFiles(directory=FRONTEND_DIST, html=True), name="frontend")
