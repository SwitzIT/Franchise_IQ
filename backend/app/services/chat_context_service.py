"""
Chat context builder — aggregates session analytics data into a compact
JSON context dict for injection into the AI system prompt.
No ML logic; pure data aggregation.
"""
import math
from typing import Any
import pandas as pd

from app.services.session_store import get_key
from app.utils import get_logger, safe_float, safe_int

log = get_logger("chat_context_service")


def build_chat_context(session_id: str) -> dict[str, Any]:
    """
    Collect current session analytics state and return as a structured dict.
    Used to inject real-time context into the AI system prompt.
    """
    results = get_key(session_id, "results")
    if not results:
        return {"error": "No analysis results available yet."}

    stores       = results.get("stores", [])
    all_cands    = results.get("all_candidates", [])
    top_picks    = results.get("top_picks", [])
    kpis         = results.get("kpis", {})
    model_metrics = results.get("model_metrics", {})
    region_stats  = results.get("region_stats", [])

    # ── Top 5 / Bottom 5 candidates ──────────────────────────
    def _cand_summary(c: dict) -> dict:
        return {
            "name": c.get("name", ""),
            "lat": c.get("lat"),
            "lng": c.get("lng"),
            "score": round(safe_float(c.get("score", 0)), 2),
            "predicted_revenue": round(safe_float(c.get("revenue", 0)), 2),
            "rev_lower": round(safe_float(c.get("rev_lower", 0)), 2),
            "rev_upper": round(safe_float(c.get("rev_upper", 0)), 2),
            "confidence_width": round(
                safe_float(c.get("rev_upper", 0)) - safe_float(c.get("rev_lower", 0)), 2
            ),
            "region": c.get("region", "Unassigned"),
            "district": c.get("district", ""),
            "nearest_store_km": round(safe_float(c.get("nearest_store_km", 0)), 2),
            "is_too_close": c.get("is_too_close", False),
            "population": safe_int(c.get("population", 0)),
        }

    sorted_cands = sorted(all_cands, key=lambda x: -safe_float(x.get("score", 0)))
    top5    = [_cand_summary(c) for c in sorted_cands[:5]]
    bottom5 = [_cand_summary(c) for c in sorted_cands[-5:]] if len(sorted_cands) >= 5 else []

    # ── Geographic bounding box of stores ────────────────────
    lats = [safe_float(s.get("lat")) for s in stores if s.get("lat")]
    lngs = [safe_float(s.get("lng")) for s in stores if s.get("lng")]
    bbox = None
    if lats and lngs:
        bbox = {
            "lat_min": round(min(lats), 4), "lat_max": round(max(lats), 4),
            "lng_min": round(min(lngs), 4), "lng_max": round(max(lngs), 4),
        }

    # ── Model feature importances (RF only) ──────────────────
    feature_importances = None
    try:
        model_obj = get_key(session_id, "_model_ref")
        if model_obj and hasattr(model_obj, "feature_importances_"):
            fi = dict(zip(
                getattr(model_obj, "feature_cols", []),
                model_obj.feature_importances_.tolist()
            ))
            feature_importances = dict(sorted(fi.items(), key=lambda x: -x[1])[:8])
    except Exception:
        pass

    # ── Region KPI summary ────────────────────────────────────
    region_summary = []
    for r in region_stats[:10]:  # cap to avoid huge prompts
        region_summary.append({
            "district": r.get("district", ""),
            "store_count": r.get("store_count", 0),
            "avg_sales": round(safe_float(r.get("avg_sales", 0)), 2),
            "avg_score": round(safe_float(r.get("avg_score", 0)), 2),
            "performance": r.get("performance", ""),
        })

    return {
        "analysis_summary": {
            "total_stores": len(stores),
            "total_candidates_scored": len(all_cands),
            "top_picks_count": len(top_picks),
            "avg_store_revenue": round(safe_float(kpis.get("avg_sales", 0)), 2),
            "total_store_revenue": round(safe_float(kpis.get("total_sales", 0)), 2),
            "avg_predicted_revenue": round(safe_float(kpis.get("avg_predicted_revenue", 0)), 2),
            "best_score": round(safe_float(kpis.get("max_score", 0)), 2),
            "avg_score": round(safe_float(kpis.get("avg_score", 0)), 2),
            "cannibalization_risk_pct": round(safe_float(kpis.get("cannibalization_risk", 0)), 1),
            "logistics_coverage_pct": round(safe_float(kpis.get("logistics_coverage", 0)), 1),
            "top_sales_driving_amenity": kpis.get("top_amenity_label", ""),
            "geographic_bounding_box": bbox,
        },
        "top_5_candidates": top5,
        "bottom_5_candidates": bottom5,
        "region_performance": region_summary,
        "model_metadata": {
            "model_type": "Random Forest Regressor (200 trees)" if model_metrics.get("n_samples", 0) >= 3 else "Ridge Regression (fallback, < 3 training samples)",
            "training_stores": model_metrics.get("n_samples", len(stores)),
            "cross_val_r2": round(safe_float(model_metrics.get("r2", 0)), 3),
            "feature_importances": feature_importances,
            "confidence_interval": "90% CI derived from variance across all 200 trees",
        },
    }
