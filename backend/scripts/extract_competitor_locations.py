"""
One-time / on-demand competitor location extraction script.

Run this to populate the DB cache for a country, either from the
competitor_templates.yaml (all configured brands) or from an explicit
brand list.

Usage:
    # Extract every brand in the YAML for India / Bakery
    python extract_competitor_locations.py --country India --category Bakery

    # Extract specific brands
    python extract_competitor_locations.py --country "Sri Lanka" \\
        --brands "Perera & Sons" "The Fab"

    # Extract every brand for a country in every configured category
    python extract_competitor_locations.py --country India --all-categories

Prerequisites:
    - GOOGLE_PLACES_API_KEY env var set
    - YAML templates configured (or use --brands)

This is the same code path the monthly cron uses — just driven from CLI.
"""
import argparse
import os
import sys

# Make app imports work when run as a script
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.competitor_service import (  # noqa: E402
    get_suggested_competitors, get_available_categories,
)
from app.services.competitor_extraction_service import extract_brands_batch  # noqa: E402


def main():
    p = argparse.ArgumentParser(description="Extract competitor locations from Places API → DB")
    p.add_argument("--country", required=True, help="Country name (e.g. 'India')")
    p.add_argument("--category", help="Single category (e.g. 'Bakery')")
    p.add_argument("--all-categories", action="store_true",
                   help="Extract every category configured for the country")
    p.add_argument("--brands", nargs="+",
                   help="Explicit brand list (overrides --category)")
    p.add_argument("--region-hint", default=None,
                   help="Optional geographic hint to narrow Places search")
    args = p.parse_args()

    if not os.environ.get("GOOGLE_PLACES_API_KEY"):
        print("[error] GOOGLE_PLACES_API_KEY not set")
        sys.exit(1)

    # Build the brand list
    brands = []
    if args.brands:
        brands = args.brands
    elif args.all_categories:
        for cat in get_available_categories(args.country):
            brands.extend(get_suggested_competitors(args.country, cat))
    elif args.category:
        brands = get_suggested_competitors(args.country, args.category)
    else:
        print("[error] Must provide --brands, --category, or --all-categories")
        sys.exit(1)

    # Dedupe while preserving order
    seen, deduped = set(), []
    for b in brands:
        if b not in seen:
            seen.add(b); deduped.append(b)

    if not deduped:
        print(f"[warn] No brands resolved for {args.country}; check your YAML config")
        sys.exit(1)

    print(f"[info] Extracting {len(deduped)} brand(s) for {args.country}:")
    for b in deduped:
        print(f"        - {b}")
    print()

    results = extract_brands_batch(deduped, args.country, args.region_hint)

    print("\n[done] Extraction complete:")
    print(f"  {'BRAND':<30} {'LOCATIONS':>10}")
    print(f"  {'-' * 30} {'-' * 10}")
    for brand, count in results.items():
        print(f"  {brand:<30} {count:>10}")
    print(f"\n  Total locations stored: {sum(results.values())}")


if __name__ == "__main__":
    main()
