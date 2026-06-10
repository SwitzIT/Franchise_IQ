#!/usr/bin/env python3
"""
Prewarm OSM Cache for FranchiseIQ
==================================
Standalone script. Run separately from the main pipeline.

Splits the state bounding box into chunks and fetches OSM data per-chunk,
so each Overpass request stays small and responds in reasonable time.
Saves the combined result to amenities_cache/ where the backend will pick it up.

Usage (from the backend directory or anywhere with the same Python env):
  python Prewarm-OSM-Cache.py
  python Prewarm-OSM-Cache.py --country India --state "West Bengal"
  python Prewarm-OSM-Cache.py --divisor 3   # 9 chunks instead of 4

The script will:
  1. Print the bounding box and chunk plan
  2. Fetch roads chunk-by-chunk with progress
  3. Fetch landuse chunk-by-chunk with progress
  4. Save combined caches as:
       amenities_cache/roads_<country>_<state>.geojson
       amenities_cache/landuse_<country>_<state>.geojson

After it completes, restart uvicorn and re-run the pipeline. The next /predict
call will use these cache files and populate the 6 geographic features for
every store and candidate.
"""
import argparse
import sys
import time
from pathlib import Path

try:
    import osmnx as ox
    import geopandas as gpd
    import pandas as pd
except ImportError as e:
    print(f"ERROR: missing dependency: {e}")
    print("Run this script inside the franchiseiq Python env (where uvicorn runs).")
    sys.exit(1)


# Mirrors the lists in osm_geographic_service.py - keep these in sync
RETAIL_VIABLE_HIGHWAYS = [
    "trunk", "primary", "secondary", "tertiary",
    "unclassified", "residential", "living_street", "pedestrian",
]
LANDUSE_VALUES = [
    "commercial", "retail", "residential",
    "industrial", "quarry", "depot", "landfill", "port",
    "farmland", "farmyard", "orchard", "vineyard", "meadow", "allotments",
    "forest", "forestry",
]
NATURAL_VALUES = [
    "wood", "tree_row", "scrub", "heath", "grassland",
    "water", "wetland", "bay", "coastline", "beach", "reef",
    "bare_rock", "scree", "cliff",
]

# State bounding boxes [lat_min, lat_max, lon_min, lon_max]
STATE_BOUNDS = {
    ("India", "West Bengal"):  [21.0, 27.5, 85.8, 89.9],
    ("India", "Odisha"):       [17.8, 22.6, 81.4, 87.5],
    ("Sri Lanka", "Sri Lanka"): [5.8, 9.9, 79.5, 82.0],
}


def split_bbox(bbox, divisor):
    """Split (north, south, east, west) into divisor x divisor chunks."""
    north, south, east, west = bbox
    lat_step = (north - south) / divisor
    lon_step = (east - west) / divisor
    chunks = []
    for i in range(divisor):
        for j in range(divisor):
            c_north = north - i * lat_step
            c_south = north - (i + 1) * lat_step
            c_west = west + j * lon_step
            c_east = west + (j + 1) * lon_step
            chunks.append((c_north, c_south, c_east, c_west))
    return chunks


def fetch_chunk(bbox, tags, label, timeout_s=900):
    """Fetch a single chunk via OSMnx, with retries."""
    north, south, east, west = bbox
    ox.settings.requests_timeout = timeout_s
    try:
        ox.settings.timeout = timeout_s
    except Exception:
        pass

    for attempt in range(1, 4):
        try:
            t0 = time.time()
            print(f"  [{label}] attempt {attempt}/3 ({timeout_s}s max)...", flush=True)
            try:
                gdf = ox.features_from_bbox(north, south, east, west, tags=tags)
            except TypeError:
                gdf = ox.features_from_bbox(bbox=(north, south, east, west), tags=tags)
            elapsed = time.time() - t0
            n = len(gdf) if gdf is not None else 0
            print(f"  [{label}] success in {elapsed:.0f}s: {n} features", flush=True)
            return gdf
        except Exception as e:
            print(f"  [{label}] attempt {attempt} failed: {type(e).__name__}: {e}", flush=True)
            if attempt < 3:
                wait = 5 * attempt
                print(f"  [{label}] retrying in {wait}s...", flush=True)
                time.sleep(wait)
    print(f"  [{label}] EXHAUSTED RETRIES, skipping chunk", flush=True)
    return None


def fetch_all_chunks(bbox, tags, kind, divisor, geom_types, timeout_s):
    """Fetch every chunk, concatenate, return GeoDataFrame."""
    chunks = split_bbox(bbox, divisor)
    print(f"\n=== Fetching {kind} in {len(chunks)} chunks ===")
    all_gdfs = []
    for i, c in enumerate(chunks, 1):
        gdf = fetch_chunk(c, tags, label=f"{kind} {i}/{len(chunks)}", timeout_s=timeout_s)
        if gdf is not None and not gdf.empty:
            all_gdfs.append(gdf)

    if not all_gdfs:
        print(f"  No data collected for {kind}.")
        return gpd.GeoDataFrame(columns=list(tags.keys()) + ["geometry"], geometry="geometry", crs="EPSG:4326")

    combined = pd.concat(all_gdfs, ignore_index=True)
    combined = gpd.GeoDataFrame(combined, geometry="geometry", crs="EPSG:4326")
    combined = combined[combined.geometry.geom_type.isin(geom_types)].copy()
    print(f"  Combined {kind}: {len(combined)} features")
    return combined


def save(gdf, path):
    if gdf is None or gdf.empty:
        print(f"  Not saving empty {path.name}")
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    keep_cols = [c for c in gdf.columns if c == "geometry" or c in ("highway", "name", "landuse", "natural")]
    gdf[keep_cols].to_file(str(path), driver="GeoJSON")
    print(f"  Saved {path.name} ({path.stat().st_size // 1024} KB)")


def main():
    parser = argparse.ArgumentParser(description="Prewarm OSM cache for FranchiseIQ")
    parser.add_argument("--country", default="India")
    parser.add_argument("--state", default="West Bengal")
    parser.add_argument("--divisor", type=int, default=2,
                        help="Split bbox into divisor x divisor chunks (default 2 = 4 chunks)")
    parser.add_argument("--timeout", type=int, default=900,
                        help="Per-chunk timeout in seconds (default 900 = 15min)")
    parser.add_argument("--out-dir", default=None,
                        help="Cache directory (default: ../amenities_cache relative to script)")
    args = parser.parse_args()

    key = (args.country, args.state)
    if key not in STATE_BOUNDS:
        print(f"ERROR: no bounds configured for {key}. Add to STATE_BOUNDS dict.")
        sys.exit(1)
    gb = STATE_BOUNDS[key]
    bbox = (gb[1], gb[0], gb[3], gb[2])  # (north, south, east, west)

    if args.out_dir:
        out_dir = Path(args.out_dir)
    else:
        # Try ./amenities_cache, ../amenities_cache, then ../../FranchiseIQ/amenities_cache
        candidates = [
            Path.cwd() / "amenities_cache",
            Path.cwd().parent / "amenities_cache",
            Path("C:/Users/RajeevK/Desktop/FranchiseIQ/amenities_cache"),
        ]
        out_dir = next((c for c in candidates if c.parent.exists()), candidates[0])

    print(f"Country/State : {args.country} / {args.state}")
    print(f"Bounding box  : {bbox}  (N, S, E, W)")
    print(f"Chunk plan    : {args.divisor}x{args.divisor} = {args.divisor**2} chunks")
    print(f"Timeout/chunk : {args.timeout}s")
    print(f"Output dir    : {out_dir}")
    print()

    key_slug = f"{args.country.lower().replace(' ', '_')}_{args.state.lower().replace(' ', '_')}"

    # Roads
    roads = fetch_all_chunks(
        bbox, {"highway": RETAIL_VIABLE_HIGHWAYS},
        kind="ROADS", divisor=args.divisor,
        geom_types=["LineString", "MultiLineString"],
        timeout_s=args.timeout,
    )
    save(roads, out_dir / f"roads_{key_slug}.geojson")

    # Landuse + natural together (saves Overpass round-trips)
    landuse = fetch_all_chunks(
        bbox, {"landuse": LANDUSE_VALUES, "natural": NATURAL_VALUES},
        kind="LANDUSE", divisor=args.divisor,
        geom_types=["Polygon", "MultiPolygon"],
        timeout_s=args.timeout,
    )
    save(landuse, out_dir / f"landuse_{key_slug}.geojson")

    print()
    print("Done. Now restart uvicorn and re-run the pipeline.")
    print("The geographic features will be populated for every store and candidate.")


if __name__ == "__main__":
    main()