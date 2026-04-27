import json
import os
from pathlib import Path

def shrink():
    input_path = Path("amenities_cache/sri_lanka_sri_lanka.geojson")
    output_path = Path("amenities_cache/srilanka_light.geojson")
    
    if not input_path.exists():
        print(f"Error: Could not find {input_path}")
        return

    print(f"Reading {input_path} (this may take a moment)...")
    with open(input_path, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    new_features = []
    print("Shrinking data...")
    for feat in data.get('features', []):
        props = feat.get('properties', {})
        # Keep only what we need for scoring
        clean_props = {
            "amenity": props.get("amenity"),
            "shop":    props.get("shop"),
            "leisure": props.get("leisure")
        }
        # Remove empty properties
        clean_props = {k: v for k, v in clean_props.items() if v}
        
        if clean_props:
            feat['properties'] = clean_props
            new_features.append(feat)
            
    data['features'] = new_features
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    
    original_size = os.path.getsize(input_path) / (1024*1024)
    new_size = os.path.getsize(output_path) / (1024*1024)
    
    print(f"✅ Success!")
    print(f"Original: {original_size:.2f} MB")
    print(f"Shrunken: {new_size:.2f} MB")
    print(f"Next: Update your render.yaml to use srilanka_light.geojson or rename srilanka_light.geojson to the original name.")

if __name__ == "__main__":
    shrink()
