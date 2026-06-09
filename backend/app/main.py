"""
FranchiseIQ — FastAPI Application Entry Point
"""
import threading
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import APP_TITLE, APP_VERSION
from app.services.session_store import purge_expired
from app.utils import get_logger
from app.routes import all_routers

log = get_logger("main")


def _background_cleanup():
    """Purge expired sessions every 10 minutes."""
    while True:
        time.sleep(600)
        purge_expired()


@asynccontextmanager
async def lifespan(app: FastAPI):
    log.info(f"🚀 {APP_TITLE} v{APP_VERSION} starting up")
    t = threading.Thread(target=_background_cleanup, daemon=True)
    t.start()
    yield
    log.info(f"👋 {APP_TITLE} shutting down")


app = FastAPI(
    title=APP_TITLE,
    version=APP_VERSION,
    description="Production-grade Franchise Location Intelligence API",
    lifespan=lifespan,
)


# ✅ CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:8000",
        "https://franchise-iq-frontend.onrender.com",
        "https://franchise-iq.onrender.com",
        "*"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ✅ REGISTER ROUTES (FIXED)
for router in all_routers:
    app.include_router(router, prefix="/api")


@app.get("/health")
def health():
    return {"status": "ok", "app": APP_TITLE, "version": APP_VERSION}


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    log.exception(f"Unhandled: {exc}")
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )