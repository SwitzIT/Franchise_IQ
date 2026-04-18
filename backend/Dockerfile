FROM python:3.11-slim

WORKDIR /app

# System deps needed by geopandas/osmnx
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgdal-dev gdal-bin libspatialindex-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend app code
COPY backend/ .

# Copy demographics and map cache from the root
COPY data/ ./data
COPY amenities_cache/ ./amenities_cache

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
