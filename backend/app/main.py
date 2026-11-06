from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from .database import Base, engine
from .routers import auth, hearings, insights, matters, tasks

FRONTEND_DIST = Path(__file__).resolve().parents[2] / "frontend" / "dist"


class SinglePageApp(StaticFiles):
    """Send index.html for unknown paths, so reloading /matters/3 reaches React's router."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as error:
            if error.status_code == 404 and not path.startswith(("api", "assets")):
                return await super().get_response("index.html", scope)
            raise


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="Hearing Diary API", version="2.0.0", lifespan=lifespan)
app.include_router(auth.router)
app.include_router(matters.router)
app.include_router(hearings.router)
app.include_router(tasks.router)
app.include_router(insights.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}


# Mounted last so it cannot shadow the API. Absent during frontend dev and in tests.
if FRONTEND_DIST.is_dir():
    app.mount("/", SinglePageApp(directory=FRONTEND_DIST, html=True), name="frontend")
