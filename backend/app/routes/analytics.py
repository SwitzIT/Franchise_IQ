"""Analytics routes — Region KPI aggregation."""
import math
import pandas as pd
from fastapi import APIRouter, HTTPException
from app.services import get_key, session_exists
from app.utils import get_logger, safe_float, safe_int

log = get_logger("routes.analytics")
router = APIRouter(tags=["Analytics"])


@router.get("/region-kpis")
def region_kpis(session_id: str):
    """
    Compute per-region KPIs from the current session's store data and prediction results.
    Returns best/worst region, full region list with performance labels.
    """
    if not session_exists(session_id):
        raise HTTPException(404, "Session not found.")

    results = get_key(session_id, "results")
    stores_df: pd.DataFrame | None = get_key(session_id, "stores_df")

    if results is None:
        raise HTTPException(400, "No results yet. Run /predict first.")

    stores_records = results.get("stores", [])
    all_candidates = results.get("all_candidates", [])

    if not stores_records:
        return {"regions": [], "best_region": None, "worst_region": None, "region_count": 0}

    # ── Aggregate stores by Region ────────────────────────────
    region_map: dict[str, dict] = {}

    for s in stores_records:
        region = s.get("region") or "Unassigned"
        if region not in region_map:
            region_map[region] = {
                "name": region,
                "store_count": 0,
                "total_revenue": 0.0,
                "revenues": [],
                "scores": [],
                "candidates": [],
            }
        rm = region_map[region]
        rm["store_count"] += 1
        rev = safe_float(s.get("revenue", 0))
        rm["revenues"].append(rev)
        rm["total_revenue"] += rev

    # ── Attach prediction scores by region ───────────────────
    # Use district as proxy since candidates don't carry Region directly
    # (grid candidates have no region; request candidates inherit from requests_df)
    for c in all_candidates:
        region = c.get("region") or "Unassigned"
        if region in region_map:
            region_map[region]["scores"].append(safe_float(c.get("score", 0)))
            region_map[region]["candidates"].append(c)

    # ── Build output list ─────────────────────────────────────
    regions_out = []
    for region, data in region_map.items():
        revs = data["revenues"]
        avg_rev = sum(revs) / len(revs) if revs else 0.0
        scores = data["scores"]
        avg_score = sum(scores) / len(scores) if scores else 0.0

        # Top candidate in this region
        top_cand = None
        if data["candidates"]:
            best = max(data["candidates"], key=lambda x: x.get("score", 0))
            top_cand = {
                "name": best.get("name", ""),
                "lat": best.get("lat"),
                "lng": best.get("lng"),
                "score": safe_float(best.get("score", 0)),
            }

        regions_out.append({
            "name": region,
            "store_count": data["store_count"],
            "avg_revenue": round(avg_rev, 2),
            "total_revenue": round(data["total_revenue"], 2),
            "avg_final_score": round(avg_score, 2),
            "top_candidate": top_cand,
            "revenue_rank": 0,          # filled below
            "performance_label": "mid", # filled below
        })

    # ── Rank by avg_revenue ───────────────────────────────────
    regions_out.sort(key=lambda x: x["avg_revenue"], reverse=True)
    n = len(regions_out)
    third = max(1, math.ceil(n / 3))

    for i, r in enumerate(regions_out):
        r["revenue_rank"] = i + 1
        if i < third:
            r["performance_label"] = "top"
        elif i >= n - third:
            r["performance_label"] = "low"
        else:
            r["performance_label"] = "mid"

    best_region = regions_out[0]["name"] if regions_out else None
    worst_region = regions_out[-1]["name"] if regions_out else None

    return {
        "regions": regions_out,
        "best_region": best_region,
        "worst_region": worst_region,
        "region_count": len(regions_out),
    }
