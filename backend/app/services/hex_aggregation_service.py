"""
H3 Hex Aggregation Service
──────────────────────────
Aggregates store revenue into H3 hexagonal cells and classifies each cell
vs the network average, producing an area-level performance heatmap.

KEY FEATURE: Auto-resolution
────────────────────────────
The product is multi-tenant: one company has 10 stores in a city, another
has 1,000 across a country. A fixed default resolution breaks for both.
`suggest_resolution()` picks the resolution balancing aggregation quality
(≥3 stores per cell on average) against cell count (10–100 cells is the
visual sweet spot).

Validated against:
  Mio Amore   (384 stores · West Bengal, 56,000 km²) → resolution 5
  Caravan     (69 stores · Sri Lanka, 1,500 km²)     → resolution 6
"""
from typing import Any, Dict, List, Optional, Tuple

import h3

from app.utils import safe_float, get_logger

log = get_logger("services.hex_aggregation")

# ── Defaults ────────────────────────────────────────────────────────────────
MIN_RESOLUTION = 4
MAX_RESOLUTION = 9
FALLBACK_RESOLUTION = 7   # used when input is empty / unanalysable

DEFAULT_ABOVE_THRESHOLD = 1.10   # ≥110% of network avg → "above"
DEFAULT_BELOW_THRESHOLD = 0.90   # ≤ 90% of network avg → "below"

# Auto-resolution tuning constants
TARGET_AVG_PER_CELL = 5.0     # ideal stores per non-empty cell
IDEAL_CELL_COUNT_LO = 10      # below this and the map looks empty
IDEAL_CELL_COUNT_HI = 100     # above this and the map looks noisy


# ─────────────────────────────────────────────────────────────────────────────
# Adaptive resolution
# ─────────────────────────────────────────────────────────────────────────────

def _extract_valid_points(stores: List[Dict[str, Any]]) -> List[Tuple[float, float]]:
    """Pull (lat, lng) tuples from store records, filtering out junk values."""
    pts: List[Tuple[float, float]] = []
    for s in stores:
        try:
            lat = safe_float(s.get("lat"))
            lng = safe_float(s.get("lng"))
        except Exception:
            continue
        if lat == 0.0 and lng == 0.0:
            continue
        if not (-90.0 < lat < 90.0) or not (-180.0 < lng < 180.0):
            continue
        pts.append((lat, lng))
    return pts


def suggest_resolution(stores: List[Dict[str, Any]]) -> int:
    """
    Pick an H3 resolution that aggregates the given stores into a useful
    number of cells with meaningful within-cell aggregation.

    Strategy: walk resolutions MIN..MAX, score each, return the winner.
    Score components:
      + 10 if average stores/cell is in [3, 8]; else linear distance from 5
      +  5 if cell count is in [10, 100];      else linear penalty
      −10 × singleton_ratio (one-store cells dilute the aggregation)
    """
    valid_pts = _extract_valid_points(stores)
    if len(valid_pts) < 3:
        log.info("suggest_resolution: <3 valid points, returning fallback %d", FALLBACK_RESOLUTION)
        return FALLBACK_RESOLUTION

    best_score = float("-inf")
    best_res = FALLBACK_RESOLUTION

    for res in range(MIN_RESOLUTION, MAX_RESOLUTION + 1):
        cell_counts: Dict[str, int] = {}
        for lat, lng in valid_pts:
            try:
                c = h3.latlng_to_cell(lat, lng, res)
                cell_counts[c] = cell_counts.get(c, 0) + 1
            except Exception:
                continue

        if not cell_counts:
            continue

        n_cells = len(cell_counts)
        avg_per_cell = len(valid_pts) / n_cells
        singleton_ratio = sum(1 for v in cell_counts.values() if v == 1) / n_cells

        if 3 <= avg_per_cell <= 8:
            avg_score = 10.0
        else:
            avg_score = -abs(avg_per_cell - TARGET_AVG_PER_CELL) * 2

        if IDEAL_CELL_COUNT_LO <= n_cells <= IDEAL_CELL_COUNT_HI:
            count_score = 5.0
        elif n_cells < IDEAL_CELL_COUNT_LO:
            count_score = -(IDEAL_CELL_COUNT_LO - n_cells)
        else:
            count_score = -(n_cells - IDEAL_CELL_COUNT_HI) * 0.05

        singleton_penalty = -singleton_ratio * 10.0
        total = avg_score + count_score + singleton_penalty

        if total > best_score:
            best_score = total
            best_res = res

    log.info(
        "suggest_resolution: %d stores → picked resolution %d (score %.2f)",
        len(valid_pts), best_res, best_score,
    )
    return best_res


# ─────────────────────────────────────────────────────────────────────────────
# Main aggregation
# ─────────────────────────────────────────────────────────────────────────────

def compute_hex_heatmap(
    stores: List[Dict[str, Any]],
    resolution: Optional[int] = None,
    above_threshold: float = DEFAULT_ABOVE_THRESHOLD,
    below_threshold: float = DEFAULT_BELOW_THRESHOLD,
) -> Dict[str, Any]:
    """
    Build the hex-level performance heatmap.

    resolution=None (default) → auto-select via suggest_resolution.
    resolution=int (4–9)      → force this resolution.

    Returns a dict with `hexes`, `network_avg`, `resolution`, `auto_selected`,
    `total_cells`, `total_stores`, and `thresholds`.
    """
    auto_selected = resolution is None
    if auto_selected:
        resolution = suggest_resolution(stores)
    else:
        resolution = max(MIN_RESOLUTION, min(MAX_RESOLUTION, int(resolution)))

    thresholds_out = {
        "above_pct": above_threshold * 100,
        "below_pct": below_threshold * 100,
    }

    if not stores:
        return {
            "hexes": [],
            "network_avg": 0.0,
            "resolution": resolution,
            "auto_selected": auto_selected,
            "total_cells": 0,
            "total_stores": 0,
            "thresholds": thresholds_out,
        }

    # Network average across all stores
    revenues = [safe_float(s.get("revenue", 0)) for s in stores]
    network_avg = sum(revenues) / len(revenues) if revenues else 0.0

    # Aggregate stores into hex cells
    hex_map: Dict[str, Dict[str, Any]] = {}
    valid_count = 0

    for s in stores:
        lat = safe_float(s.get("lat"))
        lng = safe_float(s.get("lng"))

        if lat == 0.0 and lng == 0.0:
            continue
        if not (-90.0 < lat < 90.0) or not (-180.0 < lng < 180.0):
            continue

        try:
            cell = h3.latlng_to_cell(lat, lng, resolution)
        except Exception:
            continue

        valid_count += 1
        rev = safe_float(s.get("revenue", 0))

        bucket = hex_map.setdefault(cell, {
            "cell": cell,
            "store_count": 0,
            "total_revenue": 0.0,
            "store_names": [],
        })
        bucket["store_count"] += 1
        bucket["total_revenue"] += rev
        bucket["store_names"].append(s.get("name", ""))

    # Build output
    hexes_out: List[Dict[str, Any]] = []
    for cell, data in hex_map.items():
        n = data["store_count"]
        avg = data["total_revenue"] / n if n else 0.0
        pct = (avg / network_avg) if network_avg > 0 else 1.0

        if pct >= above_threshold:
            classification = "above"
        elif pct <= below_threshold:
            classification = "below"
        else:
            classification = "on_target"

        boundary = [[float(lat), float(lng)] for lat, lng in h3.cell_to_boundary(cell)]
        clat, clng = h3.cell_to_latlng(cell)

        hexes_out.append({
            "cell": cell,
            "boundary": boundary,
            "center": [float(clat), float(clng)],
            "store_count": n,
            "total_revenue": round(data["total_revenue"], 2),
            "avg_revenue": round(avg, 2),
            "pct_of_network_avg": round(pct * 100, 1),
            "classification": classification,
            "store_names": data["store_names"],
        })

    order = {"above": 0, "on_target": 1, "below": 2}
    hexes_out.sort(key=lambda h: (order[h["classification"]], -h["avg_revenue"]))

    return {
        "hexes": hexes_out,
        "network_avg": round(network_avg, 2),
        "resolution": resolution,
        "auto_selected": auto_selected,
        "total_cells": len(hexes_out),
        "total_stores": valid_count,
        "thresholds": thresholds_out,
    }
