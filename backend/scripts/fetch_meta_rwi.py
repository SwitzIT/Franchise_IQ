"""
Meta Relative Wealth Index (RWI) Fetcher
─────────────────────────────────────────
Downloads the Meta Data for Good's Relative Wealth Index — a satellite-
derived wealth estimate at 2.4km resolution for low/middle-income countries.

Wealth is a relative score per cell (not absolute income — there's no good
public dataset for that in India/SL). Useful as an income proxy for
peer-context clustering and untapped-demand scoring.

The data is hosted on Humanitarian Data Exchange (HDX). Each country has a
CSV with columns: latitude, longitude, rwi, error.

Usage:
    python fetch_meta_rwi.py --country IND --output ../app/data/meta_rwi/
    python fetch_meta_rwi.py --country LKA --output ../app/data/meta_rwi/

References:
    https://data.humdata.org/dataset/relative-wealth-index
    https://dataforgood.facebook.com/dfg/tools/relative-wealth-index
"""
import argparse
import sys
from pathlib import Path

import requests

# HDX URL pattern for the RWI CSVs. Note: HDX dataset URLs change occasionally;
# if a download fails, the most reliable path is to visit
#   https://data.humdata.org/dataset/relative-wealth-index
# and grab the latest CSV link for the country, then drop it into args.url.
DEFAULT_URLS = {
    "IND": "https://data.humdata.org/dataset/76f2a2ea-ba50-40f5-b79c-db95d668b843/resource/1a168c0a-f1d2-471e-94c4-d2c2dd6ac0a1/download/ind_relative_wealth_index.csv",
    "LKA": "https://data.humdata.org/dataset/76f2a2ea-ba50-40f5-b79c-db95d668b843/resource/cee29cd7-3a40-4a5e-bbf9-eebb95bb1f8d/download/lka_relative_wealth_index.csv",
}


def fetch_rwi(country_iso: str, output_dir: Path, url_override: str | None = None) -> Path:
    iso = country_iso.lower()
    url = url_override or DEFAULT_URLS.get(country_iso.upper())
    if not url:
        raise ValueError(
            f"No default URL configured for {country_iso}. "
            f"Visit https://data.humdata.org/dataset/relative-wealth-index, "
            f"grab the CSV URL for your country, and re-run with --url <url>"
        )

    out_file = output_dir / f"{iso}_relative_wealth_index.csv"
    if out_file.exists():
        print(f"[skip] {out_file.name} already exists ({out_file.stat().st_size / 1e6:.1f} MB)")
        return out_file

    print(f"[download] {url}")
    output_dir.mkdir(parents=True, exist_ok=True)

    with requests.get(url, stream=True, timeout=120) as r:
        r.raise_for_status()
        total = int(r.headers.get("Content-Length", 0))
        downloaded = 0
        with open(out_file, "wb") as f:
            for chunk in r.iter_content(chunk_size=512 * 1024):
                if chunk:
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total:
                        pct = downloaded * 100 / total
                        print(f"\r  {pct:5.1f}%  ({downloaded / 1e6:.1f} / {total / 1e6:.1f} MB)",
                              end="", flush=True)
        print()

    print(f"[done] saved to {out_file}")
    print()
    print("To use this in the app:")
    print("  1. Load with pandas.read_csv()")
    print("  2. For a query coord (lat, lng), find the nearest row (KDTree)")
    print("  3. Use the `rwi` column as your income_index (range roughly -2 to 2)")
    return out_file


def main():
    p = argparse.ArgumentParser(description="Download Meta Relative Wealth Index data")
    p.add_argument("--country", required=True, help="ISO3 country code (IND, LKA)")
    p.add_argument("--output", default="../app/data/meta_rwi/", help="Output directory")
    p.add_argument("--url", default=None,
                   help="Override URL (if the HDX dataset version changed)")
    args = p.parse_args()

    output_dir = Path(args.output).resolve()
    try:
        fetch_rwi(args.country, output_dir, url_override=args.url)
    except requests.HTTPError as e:
        print(f"[error] HTTP {e.response.status_code}")
        print(f"        The HDX dataset URL may have changed. Visit:")
        print(f"        https://data.humdata.org/dataset/relative-wealth-index")
        print(f"        Grab the latest CSV link and pass it via --url")
        sys.exit(1)


if __name__ == "__main__":
    main()
