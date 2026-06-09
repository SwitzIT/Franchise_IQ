# """
# Services package — central exports.

# This file re-exports the functions and helpers that route handlers use,
# so they can import from `app.services` directly. New v3 services are
# added at the bottom.
# """

# # ── v1 / v2 exports (existing) ──────────────────────────────────────────────
# # These are imported defensively — if the surrounding repo evolves and any
# # of them moves, the rest of v3 still loads.
# try:
#     from app.services.session_store import (  # noqa: F401
#         get_key, set_key, session_exists, create_session, delete_session,
#     )
# except ImportError:
#     # Provide minimal shims so v3 services still import; the real app should
#     # have session_store.py from the existing codebase.
#     _MEM: dict = {}

#     def get_key(session_id, key):
#         return _MEM.get(session_id, {}).get(key)

#     def set_key(session_id, key, value):
#         _MEM.setdefault(session_id, {})[key] = value

#     def session_exists(session_id):
#         return session_id in _MEM

#     def create_session(session_id):
#         _MEM.setdefault(session_id, {})

#     def delete_session(session_id):
#         _MEM.pop(session_id, None)

# # ── v2 hex aggregation ──────────────────────────────────────────────────────
# from app.services.hex_aggregation_service import (  # noqa: F401
#     compute_hex_heatmap, suggest_resolution,
# )

# # ── v3 NEW services ─────────────────────────────────────────────────────────
# from app.services.data_validation_service import validate_stores  # noqa: F401
# from app.services.peer_context_service import cluster_stores_by_catchment  # noqa: F401
# from app.services.competitor_service import (  # noqa: F401
#     load_templates, get_suggested_competitors, get_available_categories,
#     initialize_tenant_competitors, refresh_all_competitor_locations,
#     aggregate_competitors_to_hexes, fetch_brand_locations,
#     CompetitorBrand,
# )
# from app.services.untapped_demand_service import (  # noqa: F401
#     compute_untapped_demand, generate_candidate_grid,
# )
# from app.services.site_discovery_service import (  # noqa: F401
#     list_available_territories, get_territory_bbox, analyse_territory,
# )
# from app.services.region_geocoding_service import (  # noqa: F401
#     reverse_geocode, reverse_geocode_many, enrich_stores_with_regions,
# )

# __all__ = [
#     # session
#     "get_key", "set_key", "session_exists", "create_session", "delete_session",
#     # hex
#     "compute_hex_heatmap", "suggest_resolution",
#     # v3 new
#     "validate_stores",
#     "cluster_stores_by_catchment",
#     "load_templates", "get_suggested_competitors", "get_available_categories",
#     "initialize_tenant_competitors", "refresh_all_competitor_locations",
#     "aggregate_competitors_to_hexes", "fetch_brand_locations",
#     "CompetitorBrand",
#     "compute_untapped_demand", "generate_candidate_grid",
#     "list_available_territories", "get_territory_bbox", "analyse_territory",
#     "reverse_geocode", "reverse_geocode_many", "enrich_stores_with_regions",
# ]

"""
Services package — central exports (SAFE VERSION)

Avoids hard crashes when optional v3 functions are missing.
"""

# ─────────────────────────────────────────────
# Session store (v1/v2)
# ─────────────────────────────────────────────
try:
    from app.services.session_store import (
        get_key, set_key, session_exists, create_session, delete_session,
        purge_expired,
    )
except ImportError:
    _MEM = {}

    def get_key(session_id, key):
        return _MEM.get(session_id, {}).get(key)

    def set_key(session_id, key, value):
        _MEM.setdefault(session_id, {})[key] = value

    def session_exists(session_id):
        return session_id in _MEM

    def create_session(session_id):
        _MEM.setdefault(session_id, {})

    def delete_session(session_id):
        _MEM.pop(session_id, None)

    def purge_expired():
        pass


# ─────────────────────────────────────────────
# Hex / analytics
# ─────────────────────────────────────────────
try:
    from app.services.hex_aggregation_service import (
        compute_hex_heatmap, suggest_resolution,
    )
except ImportError:
    pass


# ─────────────────────────────────────────────
# Core v3 services (optional-safe imports)
# ─────────────────────────────────────────────
try:
    from app.services.data_validation_service import validate_stores
except ImportError:
    def validate_stores(*args, **kwargs):
        return []

try:
    from app.services.peer_context_service import cluster_stores_by_catchment
except ImportError:
    def cluster_stores_by_catchment(*args, **kwargs):
        return {}


# ─────────────────────────────────────────────
# Competitor service (FIXED)
# ─────────────────────────────────────────────
try:
    from app.services.competitor_service import (
        load_templates,
        get_suggested_competitors,
        get_available_categories,
        initialize_tenant_competitors,
        get_competitor_locations_for_tenant,
        aggregate_locations_to_hexes,
        get_competitor_density_for_tenant,
        CompetitorBrand,
    )
except ImportError:
    # safe fallbacks so app still boots
    def load_templates(): return {}
    def get_suggested_competitors(*a, **k): return []
    def get_available_categories(*a, **k): return []
    def initialize_tenant_competitors(*a, **k): return []
    def get_competitor_locations_for_tenant(*a, **k): return []
    def aggregate_locations_to_hexes(*a, **k): return {"hexes": []}
    def get_competitor_density_for_tenant(*a, **k): return {"hexes": []}

    class CompetitorBrand:
        pass


# ─────────────────────────────────────────────
# Site discovery / untapped demand
# ─────────────────────────────────────────────
try:
    from app.services.untapped_demand_service import (
        compute_untapped_demand, generate_candidate_grid,
    )
except ImportError:
    def compute_untapped_demand(*a, **k): return {}
    def generate_candidate_grid(*a, **k): return []


try:
    from app.services.site_discovery_service import (
        list_available_territories, get_territory_bbox, analyse_territory,
    )
except ImportError:
    def list_available_territories(*a, **k): return []
    def get_territory_bbox(*a, **k): return {}
    def analyse_territory(*a, **k): return {}


try:
    from app.services.region_geocoding_service import (
        reverse_geocode, reverse_geocode_many, enrich_stores_with_regions,
    )
except ImportError:
    def reverse_geocode(*a, **k): return {}
    def reverse_geocode_many(*a, **k): return []
    def enrich_stores_with_regions(*a, **k): return []


# ─────────────────────────────────────────────
# Exports
# ─────────────────────────────────────────────
__all__ = [
    "get_key", "set_key", "session_exists", "create_session", "delete_session",
    "purge_expired",

    "compute_hex_heatmap", "suggest_resolution",

    "validate_stores",
    "cluster_stores_by_catchment",

    "load_templates",
    "get_suggested_competitors",
    "get_available_categories",
    "initialize_tenant_competitors",
    "get_competitor_locations_for_tenant",
    "aggregate_locations_to_hexes",
    "get_competitor_density_for_tenant",
    "CompetitorBrand",

    "compute_untapped_demand",
    "generate_candidate_grid",

    "list_available_territories",
    "get_territory_bbox",
    "analyse_territory",

    "reverse_geocode",
    "reverse_geocode_many",
    "enrich_stores_with_regions",
]