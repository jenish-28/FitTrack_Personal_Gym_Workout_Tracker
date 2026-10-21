from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.database import SessionLocal
from app.services.seed import seed_initial_data
from app.api import auth, exercises, routines, workouts, stats, settings as settings_router, admin

FRONTEND_DIST = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        db = SessionLocal()
        try:
            seed_initial_data(db)
        finally:
            db.close()
    except Exception:
        pass
    yield


app = FastAPI(
    title="FitTrack API",
    description="Personal Gym & Workout Tracking Platform REST API (FastAPI + PostgreSQL + SQLAlchemy 2.0)",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(exercises.router)
app.include_router(routines.router)
app.include_router(workouts.router)
app.include_router(stats.router)
app.include_router(settings_router.router)
app.include_router(admin.router)


@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok", "service": "FitTrack API"}


if FRONTEND_DIST.exists() and (FRONTEND_DIST / "index.html").exists():
    assets_dir = FRONTEND_DIST / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=str(assets_dir)), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(request: Request, full_path: str):
        candidate = FRONTEND_DIST / full_path
        if full_path and candidate.is_file():
            return FileResponse(str(candidate))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
