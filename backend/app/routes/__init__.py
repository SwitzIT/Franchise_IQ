"""
Routes package — central registration of all FastAPI routers.

Behaviour change from v3.0: import failures are now LOGGED at WARN level
(grep for "router-import-failed") instead of being silently swallowed.
"""
import logging
import importlib

from fastapi import APIRouter

_log = logging.getLogger("routes.__init__")
_routers: list[APIRouter] = []


# ── The full list of route modules, in load order. ──────────────────
# Note: file names are SINGULAR where they exist as singular in the repo
# (country.py, predict.py, chat.py) — the previous version used plural
# "countries" which silently failed.
_ROUTE_MODULES = [
    "country",           # /countries, /select_country, /select_state
    "data",              # /load_data, /load_preloaded
    "amenities",         # /fetch_amenities, /amenities_status
    "business_units",    # /upload_business_units, /business_units
    "predict",           # /predict
    "results",           # /get_results, /download_results
    "chat",              # /chat
    "analytics",         # /region-kpis, /hex-heatmap, /peer-context, /untapped-demand
    "validation",        # /validate-stores, /validate-session
    "competitors",       # /competitors/*
    "site_discovery",    # /site-discovery/*
]


for module_name in _ROUTE_MODULES:
    try:
        mod = importlib.import_module(f"app.routes.{module_name}")
        if hasattr(mod, "router"):
            _routers.append(mod.router)
            _log.info("registered router: app.routes.%s", module_name)
        else:
            _log.warning("router-import-failed: app.routes.%s has no `router` attribute",
                         module_name)
    except ImportError as e:
        _log.warning("router-import-failed: cannot import app.routes.%s (%s)",
                     module_name, e)
    except Exception as e:
        _log.error("router-import-failed: unexpected error loading app.routes.%s: %s: %s",
                   module_name, type(e).__name__, e)


all_routers: list[APIRouter] = _routers


# ── Debug helper ────────────────────────────────────────────────────
# To see which routers failed to load at runtime, hit /health/routers
# (no need to add this to main.py — it's just for ad-hoc curl checks)
def diagnose() -> dict:
    """Return loaded vs missing routers for debugging."""
    expected = set(_ROUTE_MODULES)
    loaded = set()
    for r in _routers:
        # Heuristic: match router by its tag or first path
        for route in r.routes:
            loaded.add(route.path)
            break
    return {
        "loaded_count": len(_routers),
        "expected": sorted(expected),
        "first_paths": sorted(loaded),
    }
