"""
Batch region enrichment for an uploaded session.

Reverse-geocodes every store in the session via Nominatim and persists
the region/district/city/suburb to the store record. After this runs,
no further geocoding happens at query time.

Usage:
    python extract_regions_for_session.py --session-id <session_id>

This is normally called automatically from the upload pipeline. The
script is provided for re-running on existing sessions if the upload
flow didn't trigger it, or for testing.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.region_enrichment_pipeline import enrich_session_stores  # noqa: E402


def main():
    p = argparse.ArgumentParser(description="Batch region enrichment for a session")
    p.add_argument("--session-id", required=True, help="Session ID to enrich")
    args = p.parse_args()

    print(f"[info] Enriching regions for session {args.session_id}")
    print("[info] Expect ~1 sec per uncached coord (Nominatim rate limit)")
    print()

    try:
        result = enrich_session_stores(args.session_id)
    except ValueError as e:
        print(f"[error] {e}")
        sys.exit(1)

    print(f"[done] {result['message']}")
    if not result.get("skipped"):
        coverage = result["enriched_count"] / result["total_stores"] * 100
        print(f"       Coverage: {coverage:.1f}%")


if __name__ == "__main__":
    main()
