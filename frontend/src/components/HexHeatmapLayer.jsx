import React, { useEffect, useState } from 'react';
import { Polygon, Tooltip } from 'react-leaflet';
import useAppStore from '../store/useAppStore';
import { getHexHeatmap } from '../services/api';

/**
 * HexHeatmapLayer (v3.1 drop-in)
 * ──────────────────────────────
 * Self-contained component that:
 *   1. Subscribes to sessionId + results from the store
 *   2. Fetches hex-heatmap data when ready
 *   3. Renders Polygons on the Leaflet map
 *   4. Respects the mapLayers.hexHeatmap toggle
 *
 * To use:
 *     import HexHeatmapLayer from './HexHeatmapLayer';
 *     // then inside <MapContainer> (or wherever you render layers):
 *     <HexHeatmapLayer />
 *
 * That's it — no other wiring needed.
 *
 * Console logs are intentional for debugging; remove the `console.log`
 * lines once you've confirmed it's working.
 */
export default function HexHeatmapLayer() {
  const {
    sessionId, results, mapLayers,
    hexHeatmap, setHexHeatmap, hexResolutionOverride,
  } = useAppStore();

  const [error, setError] = useState(null);

  useEffect(() => {
    if (!sessionId || !results) return;
    let cancelled = false;

    console.log('[HexLayer] fetching hex-heatmap…', { sessionId, hexResolutionOverride });
    getHexHeatmap(sessionId, hexResolutionOverride)
      .then((data) => {
        if (cancelled) return;
        console.log('[HexLayer] received', data?.hexes?.length, 'cells at res', data?.resolution);
        setHexHeatmap(data);
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        console.error('[HexLayer] fetch failed:', e);
        setError(e?.message || 'fetch failed');
      });

    return () => { cancelled = true; };
  }, [sessionId, results, hexResolutionOverride, setHexHeatmap]);

  if (!mapLayers.hexHeatmap) return null;
  if (!hexHeatmap?.hexes?.length) {
    if (error) console.warn('[HexLayer] not rendering — error:', error);
    return null;
  }

  return (
    <>
      {hexHeatmap.hexes.map((hex) => {
        const cls = hex.classification;
        const color =
          cls === 'above' ? '#22C55E' :
          cls === 'below' ? '#EF4444' :
          '#F59E0B';

        // Defensive: skip cells without valid boundaries (shouldn't happen,
        // but guards against backend changes).
        if (!Array.isArray(hex.boundary) || hex.boundary.length < 3) {
          return null;
        }

        return (
          <Polygon
            key={hex.cell}
            positions={hex.boundary}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.32,
              weight: 1.5,
              opacity: 0.9,
            }}
          >
            <Tooltip direction="top" sticky>
              <div className="text-xs leading-tight">
                <div className="font-bold mb-0.5">
                  {hex.store_count} store{hex.store_count !== 1 ? 's' : ''}
                </div>
                <div>
                  {cls === 'above' ? '↑ above' : cls === 'below' ? '↓ below' : '= on target'}
                  {' '}({hex.pct_of_network_avg?.toFixed(0)}% of net avg)
                </div>
                <div className="text-[10px] text-gray-600 mt-0.5">
                  Avg ₹{(hex.avg_revenue / 10000000).toFixed(2)} Cr
                </div>
              </div>
            </Tooltip>
          </Polygon>
        );
      })}
    </>
  );
}
