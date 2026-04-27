import osmnx as ox
import json
from pathlib import Path
import os

# Configuration matching your config.py logic
REGIONS = [
    {"country": "India", "state": "West Bengal", "query": "West Bengal, India"},
    {"country": "India", "state": "Odisha",      "query": "Odisha, India"}
]

OSM_TAGS = {
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

CACHE_DIR = Path("amenities_cache")
CACHE_DIR.mkdir(exist_ok=True)

def fetch_and_shrink():
    for region in REGIONS:
        country = region["country"]
        state = region["state"]
        query = region["query"]
        
        # Consistent filename logic from config.py
        file_key = f"{country.lower().replace(' ', '_')}_{state.lower().replace(' ', '_')}"
        output_path = CACHE_DIR / f"{file_key}.geojson"
        
        print(f"\n🚀 Processing {state}, {country}...")
        
        try:
            print(f"📡 Fetching data from OpenStreetMap (this may take a few minutes)...")
            gdf = ox.features_from_place(query, tags=OSM_TAGS)
            
            print(f"🧹 Cleaning and Shrinking {len(gdf)} features...")
            
            # 1. Convert Polygons/MultiPolygons to Centroids
            gdf = gdf[gdf.geometry.notna()].copy()
            mask_poly = gdf.geometry.geom_type.isin(["Polygon", "MultiPolygon"])
            gdf.loc[mask_poly, "geometry"] = gdf.loc[mask_poly, "geometry"].centroid
            
            # 2. Keep only Point geometries
            gdf = gdf[gdf.geometry.geom_type == "Point"].copy()
            
            # 3. Filter only necessary columns to save RAM
            keep_cols = [c for c in ["amenity", "shop", "leisure", "geometry"] if c in gdf.columns]
            gdf = gdf[keep_cols]
            
            # 4. Save to GeoJSON
            gdf.to_file(output_path, driver="GeoJSON")
            
            size_mb = os.path.getsize(output_path) / (1024*1024)
            print(f"✅ Success! Saved to: {output_path}")
            print(f"📦 Final Size: {size_mb:.2f} MB")
            
        except Exception as e:
            print(f"❌ Error processing {state}: {e}")

if __name__ == "__main__":
    fetch_and_shrink()
