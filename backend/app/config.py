"""
FranchiseIQ — Central Configuration
Defines all country/state metadata, paths, and app settings.
No hardcoded file paths outside this file.
"""
import os
from pathlib import Path

# PROJECT_ROOT = FranchiseIQ/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent

# ─────────────────────────────────────────────────────────────
# DIRECTORY PATHS  (resolved at runtime, Docker-friendly)
# ─────────────────────────────────────────────────────────────
DATA_DIR          = Path(os.getenv("DATA_DIR",          str(PROJECT_ROOT / "data")))
AMENITIES_DIR     = Path(os.getenv("AMENITIES_DIR",     str(PROJECT_ROOT / "amenities_cache")))
UPLOADS_DIR       = Path(os.getenv("UPLOADS_DIR",       str(PROJECT_ROOT / "uploads")))
OUTPUTS_DIR       = Path(os.getenv("OUTPUTS_DIR",       str(PROJECT_ROOT / "outputs")))
LOGS_DIR          = Path(os.getenv("LOGS_DIR",          str(PROJECT_ROOT / "logs")))

for _d in [DATA_DIR, AMENITIES_DIR, UPLOADS_DIR, OUTPUTS_DIR, LOGS_DIR]:
    _d.mkdir(parents=True, exist_ok=True)

# ─────────────────────────────────────────────────────────────
# APP SETTINGS
# ─────────────────────────────────────────────────────────────
APP_TITLE         = "FranchiseIQ"
APP_VERSION       = "2.0.0"
BUFFER_RADIUS_M   = int(os.getenv("BUFFER_RADIUS_M",   "10000"))   # 10 km in metres
GRID_STEP_DEG     = float(os.getenv("GRID_STEP_DEG",   "0.05"))
TOP_N_LOCATIONS   = int(os.getenv("TOP_N_LOCATIONS",   "10"))
OSM_RETRY_LIMIT   = int(os.getenv("OSM_RETRY_LIMIT",   "2"))
SESSION_TTL_SEC   = int(os.getenv("SESSION_TTL_SEC",   "3600"))    # 1 hour

# ─────────────────────────────────────────────────────────────
# COUNTRY / STATE REGISTRY
# ─────────────────────────────────────────────────────────────
COUNTRIES: dict = {
    "India": {
        "code": "IN",
        "currency_symbol": "₹",
        "currency_code": "INR",
        "states": {
            "West Bengal": {
                "demographics_file": "india/west_bengal/demographics.xlsx",
                "center":       [22.9868, 87.8550],
                "zoom":         8,
                "grid_bounds":  [21.0, 27.5, 85.8, 89.9],   # [lat_min, lat_max, lon_min, lon_max]
                "osm_query":    "West Bengal, India",
                "default_kitchen": None,
            },
            "Odisha": {
                "demographics_file": "india/odisha/demographics.xlsx",
                "center":       [20.9517, 85.0985],
                "zoom":         7,
                "grid_bounds":  [17.8, 22.6, 81.4, 87.5],
                "osm_query":    "Odisha, India",
                "default_kitchen": None,
            },
        },
    },
    "Sri Lanka": {
        "code": "LK",
        "currency_symbol": "රු",
        "currency_code": "LKR",
        "states": {
            "Sri Lanka": {
                "demographics_file": "srilanka/demographics.xlsx",
                "center":       [7.8731,  80.7718],
                "zoom":         8,
                "grid_bounds":  [5.8, 9.9, 79.5, 82.0],
                "osm_query":    "Sri Lanka",
                "default_kitchen": [6.9271, 79.8612],         # Colombo
            },
        },
    },
}

# ─────────────────────────────────────────────────────────────
# AMENITY TAGS (OSMnx)
# ─────────────────────────────────────────────────────────────
OSM_TAGS: dict = {
    "amenity": [
        "restaurant", "cafe", "fast_food",
        "school", "college", "university",
        "hospital", "clinic", "pharmacy",
        "bank", "atm",
        "place_of_worship",
        "bus_station",
    ],
    "shop": ["supermarket", "mall", "department_store"],
    "leisure": ["park"],
}

# Amenity category → bucket name for scoring
AMENITY_BUCKETS = {
    "restaurant":        "food",
    "cafe":              "food",
    "fast_food":         "food",
    "supermarket":       "retail",
    "mall":              "retail",
    "department_store":  "retail",
    "school":            "education",
    "college":           "education",
    "university":        "education",
    "hospital":          "health",
    "clinic":            "health",
    "pharmacy":          "health",
    "park":              "leisure",
    "bus_station":       "transport",
    "bank":              "finance",
    "atm":               "finance",
}

# ─────────────────────────────────────────────────────────────
# FEATURE SCORING WEIGHTS  (tuned via scipy in scoring_service)
# ─────────────────────────────────────────────────────────────
DEFAULT_FEATURE_WEIGHTS = {
    "food_score":      0.20,
    "retail_score":    0.15,
    "education_score": 0.15,
    "health_score":    0.10,
    "Population":      0.25,
    "Income":          0.15,
}

# ─────────────────────────────────────────────────────────────
# CORS ORIGINS
# ─────────────────────────────────────────────────────────────
CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000").split(",")


def get_state_config(country: str, state: str) -> dict:
    """Safe accessor for country/state config. Raises ValueError on bad keys."""
    c = COUNTRIES.get(country)
    if not c:
        raise ValueError(f"Unsupported country: '{country}'. Available: {list(COUNTRIES)}")
    s = c["states"].get(state)
    if not s:
        raise ValueError(
            f"Unsupported state: '{state}' in '{country}'. "
            f"Available: {list(c['states'])}"
        )
    return s


def get_demographics_path(country: str, state: str) -> Path:
    cfg = get_state_config(country, state)
    return DATA_DIR / cfg["demographics_file"]


def get_amenities_cache_path(country: str, state: str) -> Path:
    key = f"{country.lower().replace(' ', '_')}_{state.lower().replace(' ', '_')}"
    return AMENITIES_DIR / f"{key}.geojson"
