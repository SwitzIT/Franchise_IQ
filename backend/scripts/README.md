# Platform Data Fetch Scripts

These scripts populate the platform-level data sources FranchiseIQ uses to
enrich tenant analytics. **Run them once per country**, then refresh on the
cadence below. Tenants don't trigger these — they're operator/admin tools.

| Script | What it pulls | Source | Refresh |
|---|---|---|---|
| `fetch_worldpop.py` | 1km population grid (GeoTIFF) | WorldPop | Annual |
| `fetch_meta_rwi.py` | 2.4km Relative Wealth Index (CSV) | Meta / HDX | Annual |
| `fetch_gadm.py` | Country/state/district shapefiles (GeoJSON) | GADM | Annual |

OSM amenity data is fetched on demand via the existing `amenities_service`
(Overpass API). Refreshed quarterly via the cron in `app/main.py`.
Competitor locations come from Google Places via `competitor_service.py`
— refreshed monthly via cron.

---

## Setup

From the `backend/` directory:

```bash
cd scripts
python -m pip install requests
```

## One-time setup for India + Sri Lanka (the current product scope)

```bash
# Population grids (~25 MB each)
python fetch_worldpop.py --country IND --year 2020 --output ../app/data/worldpop/
python fetch_worldpop.py --country LKA --year 2020 --output ../app/data/worldpop/

# Relative Wealth Index (~30-100 MB)
python fetch_meta_rwi.py --country IND --output ../app/data/meta_rwi/
python fetch_meta_rwi.py --country LKA --output ../app/data/meta_rwi/

# Admin boundaries (level 0=country, 1=state, 2=district)
python fetch_gadm.py --country IND --all-levels --output ../app/data/gadm/
python fetch_gadm.py --country LKA --all-levels --output ../app/data/gadm/
```

Total disk usage after all three: roughly **150 MB per country**.

## When data sources change

- **HDX (Meta RWI)** sometimes re-versions their dataset URLs. If the
  default URL fails, visit https://data.humdata.org/dataset/relative-wealth-index
  and grab the current CSV link, then re-run with `--url <link>`.

- **WorldPop** publishes yearly updates. Update `--year` to use a newer file.

- **GADM** publishes major releases (~every 2-3 years). The current default
  is `gadm4.1`. If you need a newer version, update the URL pattern at the
  top of `fetch_gadm.py`.

## What the app does with this data

- **`worldpop/*.tif`** → loaded by `demographics_service` via `rasterio`,
  sampled at query coords to give `population` per hex.
- **`meta_rwi/*.csv`** → loaded into a KDTree at startup; nearest-neighbour
  lookup gives `income_index` per query coord.
- **`gadm/*.json`** → loaded as `geopandas.GeoDataFrame` and used to:
  - Power the city/state dropdown in Site Discovery
  - Provide bounding boxes for territory analyses
  - Offline reverse-geocode fallback when Nominatim is rate-limited

## Validation against your own data

You mentioned you have your own amenities, population, income, and real-
estate datasets that you'll share for validation. The platform's
`demographics_service` should be designed to accept a pluggable data source
— at minimum, sample at a coordinate. As long as your data covers the
markets and exposes a similar interface, it can replace these public
datasets entirely. Recommendation: ship both, let tenants/admins toggle
which source to use. Real estate data is your moat — keep it private.
