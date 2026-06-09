"""
GADM Admin Boundaries Fetcher
─────────────────────────────
Downloads administrative boundary shapefiles from the GADM project.
Used for:
- The country/state/district dropdown in Site Discovery mode
- Reverse geocoding fallback (offline)
- Bounding box lookup for territories

GADM is free for non-commercial use. For commercial use, check their
licence (current docs at gadm.org/licence.html).

Usage:
    python fetch_gadm.py --country IND --level 2 --output ../app/data/gadm/
    python fetch_gadm.py --country LKA --level 2 --output ../app/data/gadm/

Levels:
    0 = country
    1 = state / province
    2 = district / county
    3 = sub-district (large countries only)

For the dropdown we typically want level 1 (state) and level 2 (district).

References:
    https://gadm.org/download_country.html
"""
import argparse
import sys
from pathlib import Path

import requests

GADM_URL = "https://geodata.ucdavis.edu/gadm/gadm4.1/json/gadm41_{ISO}_{level}.json"


def fetch_gadm(country_iso: str, level: int, output_dir: Path) -> Path:
    ISO = country_iso.upper()
    url = GADM_URL.format(ISO=ISO, level=level)

    out_file = output_dir / f"gadm41_{ISO}_{level}.json"
    if out_file.exists():
        print(f"[skip] {out_file.name} already exists ({out_file.stat().st_size / 1e6:.1f} MB)")
        return out_file

    print(f"[download] {url}")
    output_dir.mkdir(parents=True, exist_ok=True)

    with requests.get(url, stream=True, timeout=180) as r:
        r.raise_for_status()
        total = int(r.headers.get("Content-Length", 0))
        downloaded = 0
        with open(out_file, "wb") as f:
            for chunk in r.iter_content(chunk_size=1024 * 1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded * 100 / total
                        print(f"\r  {pct:5.1f}%  ({downloaded / 1e6:.1f} / {total / 1e6:.1f} MB)",
                              end="", flush=True)
        print()

    print(f"[done] saved to {out_file}")
    return out_file


def main():
    p = argparse.ArgumentParser(description="Download GADM admin boundaries")
    p.add_argument("--country", required=True, help="ISO3 country code (e.g. IND, LKA)")
    p.add_argument("--level", type=int, default=2, choices=[0, 1, 2, 3],
                   help="0=country, 1=state, 2=district, 3=sub-district")
    p.add_argument("--output", default="../app/data/gadm/", help="Output directory")
    p.add_argument("--all-levels", action="store_true",
                   help="Download levels 0-2 in one go (common setup)")
    args = p.parse_args()

    output_dir = Path(args.output).resolve()
    levels = [0, 1, 2] if args.all_levels else [args.level]

    try:
        for level in levels:
            fetch_gadm(args.country, level, output_dir)
    except requests.HTTPError as e:
        print(f"[error] HTTP {e.response.status_code}")
        sys.exit(1)


if __name__ == "__main__":
    main()
