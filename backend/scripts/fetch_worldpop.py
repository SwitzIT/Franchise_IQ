"""
WorldPop Population Data Fetcher
─────────────────────────────────
Downloads population grids from WorldPop's public datasets for the countries
the product supports.

WorldPop provides 100m and 1km resolution population grids derived from
satellite imagery + census data. Free, no API key required.

For India and Sri Lanka, we use the latest unconstrained estimates.

Usage:
    python fetch_worldpop.py --country IND --output ../app/data/worldpop/
    python fetch_worldpop.py --country LKA --output ../app/data/worldpop/

The output files are .tif (GeoTIFF) — large but spatially-aware. The
demographics service in the app should load these via rasterio and
sample them at query coordinates.

References:
    https://www.worldpop.org/datacatalog/
    Country codes: ISO 3166-1 alpha-3 (IND, LKA, BGD, NPL, ARE, etc.)
"""
import argparse
import os
import sys
from pathlib import Path

import requests

# WorldPop URL pattern for unconstrained population (1km) 2020 data
WORLDPOP_URL = (
    "https://data.worldpop.org/GIS/Population/Global_2000_2020/"
    "{year}/{ISO}/{iso}_ppp_{year}_1km_Aggregated.tif"
)

# Country code → human name
COUNTRIES = {
    "IND": "India",
    "LKA": "Sri Lanka",
    "BGD": "Bangladesh",
    "NPL": "Nepal",
    "ARE": "UAE",
}


def fetch_worldpop(country_iso: str, year: int, output_dir: Path) -> Path:
    """Download the WorldPop 1km GeoTIFF for a country."""
    iso = country_iso.lower()
    ISO = country_iso.upper()
    url = WORLDPOP_URL.format(year=year, ISO=ISO, iso=iso)

    out_file = output_dir / f"{iso}_ppp_{year}_1km.tif"
    if out_file.exists():
        print(f"[skip] {out_file.name} already exists at {out_file.stat().st_size / 1e6:.1f} MB")
        return out_file

    print(f"[download] {url}")
    output_dir.mkdir(parents=True, exist_ok=True)

    with requests.get(url, stream=True, timeout=120) as r:
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
    p = argparse.ArgumentParser(description="Download WorldPop population grids")
    p.add_argument("--country", required=True, help="ISO3 country code (e.g. IND, LKA)")
    p.add_argument("--year", type=int, default=2020, help="Year of population estimate")
    p.add_argument("--output", default="../app/data/worldpop/", help="Output directory")
    args = p.parse_args()

    if args.country.upper() not in COUNTRIES:
        print(f"[warn] Country code '{args.country}' not in known list — proceeding anyway.")

    output_dir = Path(args.output).resolve()
    try:
        fetch_worldpop(args.country, args.year, output_dir)
    except requests.HTTPError as e:
        print(f"[error] HTTP {e.response.status_code} — file may not exist for this year/country.")
        sys.exit(1)
    except Exception as e:
        print(f"[error] {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
