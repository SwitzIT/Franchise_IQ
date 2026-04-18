"""
Agent 3 — Amenities Manager Service
Implements: cache-check → OSMnx fetch → GeoJSON save.
Never fetches if a valid cache file exists for the country/state key.
"""
import json
import time
from pathlib import Path

import geopandas as gpd
import pandas as pd

from app.config import (
    get_amenities_cache_path,
    OSM_TAGS,
    AMENITY_BUCKETS,
    OSM_RETRY_LIMIT,
    BUFFER_RADIUS_M,
)
from app.utils import get_logger

log = get_logger("amenities_service")


# ─────────────────────────────────────────────────────────────
# PUBLIC API
# ─────────────────────────────────────────────────────────────
def get_amenities(country: str, state: str) -> tuple[gpd.GeoDataFrame, bool]:
    """
    Returns (amenities_gdf, was_cached).
    If cache exists → load from GeoJSON.
    Otherwise → fetch via OSMnx, save, return.
    """
    cache_path = get_amenities_cache_path(country, state)

    if cache_path.exists():
        log.info(f"[Amenities] Cache hit → {cache_path}")
        
        # ADVANCED RAM OPTIMIZATION: Tell the reader to ONLY pull these columns
        # This prevents the 95MB file from expanding to 400MB+ in memory
        needed_cols = ["geometry", "amenity", "shop", "leisure"]
        
        try:
            # We use ignore_fields to keep the memory footprint tiny during ingestion
            gdf = gpd.read_file(cache_path, columns=needed_cols)
            gdf = _ensure_crs(gdf)
            log.info(f"[Amenities] Optimized load complete. n={len(gdf)}")
            return gdf, True
        except Exception as e:
            log.warning(f"[Amenities] Column-limited read failed, trying standard: {e}")
            gdf = gpd.read_file(cache_path)
            gdf = _ensure_crs(gdf)
            return gdf, True

    log.info(f"[Amenities] Cache miss → fetching OSM data for '{state}, {country}'")
    gdf = _fetch_with_retry(country, state)
    _save_cache(gdf, cache_path)
    return gdf, False


def count_amenities_near_points(
    points_df: pd.DataFrame,
    amenities_gdf: gpd.GeoDataFrame,
    buffer_m: int = BUFFER_RADIUS_M,
) -> pd.DataFrame:
    """
    For each row in points_df (must have Latitude, Longitude),
    count amenities of each bucket category within buffer_m metres.
    Adds columns: cnt_food, cnt_retail, cnt_education, cnt_health,
                  cnt_leisure, cnt_transport, cnt_finance, Total_Amenities
    """
    import geopandas as gpd
    from shapely.geometry import Point

    log.info(f"[Amenities] Counting within {buffer_m}m for {len(points_df)} points")

    # Project everything to metric CRS
    gdf_proj = amenities_gdf.to_crs(epsg=3857)
    pts_gdf = gpd.GeoDataFrame(
        points_df.copy(),
        geometry=gpd.points_from_xy(points_df["Longitude"], points_df["Latitude"]),
        crs="EPSG:4326",
    ).to_crs(epsg=3857)

    pts_gdf["_buf"] = pts_gdf.geometry.buffer(buffer_m)
    buf_gdf = pts_gdf.set_geometry("_buf").copy()
    buf_gdf["_idx"] = range(len(buf_gdf))

    # Spatial join
    joined = gpd.sjoin(gdf_proj, buf_gdf[["_idx", "_buf"]], how="inner",
                       predicate="intersects")

    # Map amenity type → bucket
    def _bucket(row):
        for col in ["amenity", "shop", "leisure"]:
            val = row.get(col)
            if val and isinstance(val, str) and val in AMENITY_BUCKETS:
                return AMENITY_BUCKETS[val]
        return None

    joined["_bucket"] = joined.apply(_bucket, axis=1)
    joined = joined.dropna(subset=["_bucket"])

    # Aggregate
    counts = (
        joined.groupby(["_idx", "_bucket"])
        .size()
        .unstack(fill_value=0)
    )

    bucket_cols = ["food", "retail", "education", "health", "leisure", "transport", "finance"]
    for b in bucket_cols:
        if b not in counts.columns:
            counts[b] = 0

    n = len(points_df)
    for b in bucket_cols:
        col_name = f"cnt_{b}"
        points_df[col_name] = [
            int(counts.loc[i, b]) if i in counts.index else 0
            for i in range(n)
        ]

    points_df["Total_Amenities"] = points_df[[f"cnt_{b}" for b in bucket_cols]].sum(axis=1)
    return points_df


def get_cache_status(country: str, state: str) -> dict:
    path = get_amenities_cache_path(country, state)
    exists = path.exists()
    size_mb = round(path.stat().st_size / (1024 * 1024), 2) if exists else 0
    return {
        "cached": exists,
        "path": str(path),
        "size_mb": size_mb,
    }


# ─────────────────────────────────────────────────────────────
# Private helpers
# ─────────────────────────────────────────────────────────────
def _fetch_with_retry(country: str, state: str) -> gpd.GeoDataFrame:
    from app.config import get_state_config
    cfg = get_state_config(country, state)
    osm_query = cfg["osm_query"]

    attempt = 0
    last_err = None
    while attempt < OSM_RETRY_LIMIT:
        attempt += 1
        try:
            log.info(f"[Amenities] OSMnx attempt {attempt}/{OSM_RETRY_LIMIT}: '{osm_query}'")
            import osmnx as ox
            gdf = ox.features_from_place(osm_query, tags=OSM_TAGS)
            gdf = _ensure_crs(gdf)
            # Keep only Point and Polygon geometries; convert polygons to centroids
            gdf = gdf[gdf.geometry.notna()].copy()
            mask_poly = gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
            gdf.loc[mask_poly, "geometry"] = gdf.loc[mask_poly, "geometry"].centroid
            gdf = gdf[gdf.geometry.geom_type == "Point"].copy()
            log.info(f"[Amenities] Fetched {len(gdf)} amenity points")
            return gdf
        except Exception as e:
            last_err = e
            log.warning(f"[Amenities] Attempt {attempt} failed: {e}")
            time.sleep(2 ** attempt)  # exponential back-off

    raise RuntimeError(
        f"OSMnx fetch failed after {OSM_RETRY_LIMIT} attempts for '{osm_query}': {last_err}"
    )


def _save_cache(gdf: gpd.GeoDataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    # Keep only lightweight columns before saving
    keep = [c for c in ["amenity", "shop", "leisure", "name", "geometry"] if c in gdf.columns]
    gdf[keep].to_file(str(path), driver="GeoJSON")
    log.info(f"[Amenities] Saved cache → {path} ({path.stat().st_size // 1024} KB)")


def _ensure_crs(gdf: gpd.GeoDataFrame) -> gpd.GeoDataFrame:
    if gdf.crs is None:
        gdf = gdf.set_crs(epsg=4326)
    return gdf
