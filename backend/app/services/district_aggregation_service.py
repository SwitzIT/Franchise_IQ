"""
District Aggregation Service
────────────────────────────
Group stores by administrative district (admin2 level via offline reverse
geocoding) and produce a performance rollup.

Used by the District View panel in the frontend dashboard. This is the
"executive-friendly" lens that complements the spatial hex view.

Reverse geocoding uses `reverse_geocoder` (offline, ~50MB bundled dataset).
No network calls; fast even for thousands of stores.

District names are normalised from GADM's transliterations to the
English business names leadership recognises (Haora → Howrah, etc.).
"""
from typing import Any, Dict, List

import reverse_geocoder as _rg

from app.utils import get_logger, safe_float

log = get_logger("services.district_aggregation")

# GADM uses local transliterations; business reports use these English names.
# Add to this dict as new districts surface.
DISTRICT_RENAME: Dict[str, str] = {
    # West Bengal
    "Haora":              "Howrah",
    "Hugli":              "Hooghly",
    "Barddhaman":         "Bardhaman",
    "Purba Medinipur":    "East Midnapore",
    "Paschim Medinipur":  "West Midnapore",
    "South 24 Paraganas": "South 24 Parganas",
    "Koch Bihar":         "Cooch Behar",
    # Add others as Mio/Caravan expand
}

DEFAULT_ABOVE_THRESHOLD = 1.10
DEFAULT_BELOW_THRESHOLD = 0.90


def _normalise_district(raw: str) -> str:
    return DISTRICT_RENAME.get(raw, raw) if raw else "Unassigned"


def _reverse_geocode_missing(stores: List[Dict[str, Any]]) -> int:
    """
    For any store lacking a `district` field, reverse-geocode in batch and
    enrich in place. Returns the number of stores enriched.
    """
    coords: List[tuple] = []
    indices: List[int] = []
    for i, s in enumerate(stores):
        if s.get("district"):
            continue
        lat = safe_float(s.get("lat"))
        lng = safe_float(s.get("lng"))
        if lat == 0.0 and lng == 0.0:
            continue
        coords.append((lat, lng))
        indices.append(i)

    if not coords:
        return 0

    results = _rg.search(coords, mode=1, verbose=False)
    for idx, r in zip(indices, results):
        stores[idx]["district"] = _normalise_district(r.get("admin2", ""))
        if not stores[idx].get("state"):
            stores[idx]["state"] = r.get("admin1", "")
        if not stores[idx].get("city"):
            stores[idx]["city"] = r.get("name", "")

    log.info("reverse-geocoded %d stores → district", len(coords))
    return len(coords)


def aggregate_stores_by_district(
    stores: List[Dict[str, Any]],
    above_threshold: float = DEFAULT_ABOVE_THRESHOLD,
    below_threshold: float = DEFAULT_BELOW_THRESHOLD,
) -> Dict[str, Any]:
    """
    Group stores by district and compute per-district performance metrics.

    Returns
    -------
    {
        "districts": [
            {
                "district":            "North 24 Parganas",
                "state":               "West Bengal",
                "store_count":         105,
                "total_revenue":       ...,
                "avg_revenue":         ...,
                "min_revenue":         ...,
                "max_revenue":         ...,
                "pct_of_network_avg":  103.8,
                "classification":      "above" | "on_target" | "below",
                "stores": [
                    {"name", "revenue", "lat", "lng", "pct_of_network_avg"}, ...
                ]
            }, ...
        ],
        "network_avg":      float,
        "total_stores":     int,
        "total_districts":  int,
        "thresholds":       {"above_pct": 110.0, "below_pct": 90.0},
    }
    """
    if not stores:
        return {
            "districts": [], "network_avg": 0.0,
            "total_stores": 0, "total_districts": 0,
            "thresholds": {"above_pct": above_threshold * 100,
                           "below_pct": below_threshold * 100},
        }

    # Step 1: enrich any stores missing district info
    _reverse_geocode_missing(stores)

    # Step 2: compute network avg
    revenues = [safe_float(s.get("revenue", 0)) for s in stores]
    network_avg = sum(revenues) / len(revenues) if revenues else 0.0

    # Step 3: bucket stores by district
    district_map: Dict[str, Dict[str, Any]] = {}
    for s in stores:
        district = s.get("district") or "Unassigned"
        state    = s.get("state") or ""
        rev      = safe_float(s.get("revenue", 0))
        store_pct = (rev / network_avg * 100) if network_avg > 0 else 0.0

        bucket = district_map.setdefault(district, {
            "district":      district,
            "state":         state,
            "total_revenue": 0.0,
            "stores":        [],
        })
        bucket["total_revenue"] += rev
        bucket["stores"].append({
            "name":               s.get("name", "") or s.get("id", ""),
            "revenue":            round(rev, 2),
            "lat":                safe_float(s.get("lat")),
            "lng":                safe_float(s.get("lng")),
            "pct_of_network_avg": round(store_pct, 1),
        })

    # Step 4: compute per-district stats + classify
    districts_out: List[Dict[str, Any]] = []
    for district, data in district_map.items():
        n = len(data["stores"])
        if n == 0:
            continue
        avg = data["total_revenue"] / n
        pct = avg / network_avg if network_avg > 0 else 1.0
        store_revenues = [s["revenue"] for s in data["stores"]]

        if pct >= above_threshold:
            classification = "above"
        elif pct <= below_threshold:
            classification = "below"
        else:
            classification = "on_target"

        # Sort stores within the district by revenue desc
        sorted_stores = sorted(data["stores"], key=lambda x: -x["revenue"])

        districts_out.append({
            "district":           district,
            "state":              data["state"],
            "store_count":        n,
            "total_revenue":      round(data["total_revenue"], 2),
            "avg_revenue":        round(avg, 2),
            "min_revenue":        round(min(store_revenues), 2),
            "max_revenue":        round(max(store_revenues), 2),
            "pct_of_network_avg": round(pct * 100, 1),
            "classification":     classification,
            "stores":             sorted_stores,
        })

    # Sort districts by store count desc (biggest market first)
    districts_out.sort(key=lambda d: -d["store_count"])

    log.info("district rollup: %d districts, %d stores, net avg %.2f",
             len(districts_out), len(stores), network_avg)

    return {
        "districts":       districts_out,
        "network_avg":     round(network_avg, 2),
        "total_stores":    len(stores),
        "total_districts": len(districts_out),
        "thresholds":      {"above_pct": above_threshold * 100,
                            "below_pct": below_threshold * 100},
    }
