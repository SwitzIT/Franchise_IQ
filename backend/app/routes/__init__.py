"""
Routes package — central registration of all FastAPI routers.

In main.py, do:
    from app.routes import all_routers
    for r in all_routers:
        app.include_router(r, prefix="/api")
"""
from fastapi import APIRouter

# v1 routers (existing) — imported defensively in case the surrounding
# repo's file names differ slightly.
_existing_routers: list[APIRouter] = []

try:
    from app.routes.analytics import router as analytics_router
    _existing_routers.append(analytics_router)
except ImportError:
    pass

# v3 NEW routers
try:
    from app.routes.validation import router as validation_router
    _existing_routers.append(validation_router)
except ImportError:
    pass

try:
    from app.routes.competitors import router as competitors_router
    _existing_routers.append(competitors_router)
except ImportError:
    pass

try:
    from app.routes.site_discovery import router as site_discovery_router
    _existing_routers.append(site_discovery_router)
except ImportError:
    pass

# Try to import existing routers from the repo (so __init__.py works as a
# drop-in replacement). If any of these don't exist, just skip them.
for module_name in [
    "countries", "data", "amenities", "business_units",
    "predict", "results", "chat",
]:
    try:
        mod = __import__(f"app.routes.{module_name}", fromlist=["router"])
        if hasattr(mod, "router"):
            _existing_routers.append(mod.router)
    except ImportError:
        pass

all_routers: list[APIRouter] = _existing_routers
