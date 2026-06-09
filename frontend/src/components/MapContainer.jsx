import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Polygon, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import useAppStore from '../store/useAppStore';
import HexHeatmapLayer from './HexHeatmapLayer';

// ─── FlyTo on store/prediction selection ──────────────────────
function FlyToLocation() {
  const map = useMap();
  const flyToCoords = useAppStore(s => s.flyToCoords);

  useEffect(() => {
    if (flyToCoords?.lat && flyToCoords?.lng) {
      map.flyTo([flyToCoords.lat, flyToCoords.lng], flyToCoords.zoom || 15, { duration: 1.2 });
    }
  }, [flyToCoords, map]);

  return null;
}

// ─── Icons ────────────────────────────────────────────────────
const emojiIcon = (emoji, size = 26) => L.divIcon({
  html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.25));">${emoji}</div>`,
  className: '',
  iconSize: [size, size],
  iconAnchor: [size / 2, size / 2],
});

const storeMarkerIcon = (classification) => {
  const colors = { above: '#22C55E', on_target: '#F59E0B', below: '#EF4444' };
  const color = colors[classification] || colors.on_target;
  // Lucide-style "Store" SVG path, rendered in white inside a colored circle
  return L.divIcon({
    html: `<div style="
      width:20px;height:20px;border-radius:50%;
      background:${color};border:2px solid white;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 5px rgba(0,0,0,0.35);
    ">
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
           stroke="white" stroke-width="2.5"
           stroke-linecap="round" stroke-linejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/>
        <line x1="2" x2="22" y1="11" y2="11"/>
        <path d="M5 11v10h14V11"/>
        <path d="M10 21v-6h4v6"/>
      </svg>
    </div>`,
    className: 'fiq-store-marker',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });
};

// ─── Score → colour ───────────────────────────────────────────
const predictionColor = (score, maxScore) => {
  if (maxScore <= 0) return '#94a3b8';
  const pct = score / maxScore;
  if (pct >= 0.7) return '#22C55E';
  if (pct >= 0.4) return '#F59E0B';
  return '#EF4444';
};
const scoreSize = (s) => 8 + (s / 100) * 14;

// ─── Hex classification → colour ──────────────────────────────
// Matches existing design tokens for visual consistency.
const HEX_COLORS = {
  above: '#22C55E',  // success
  on_target: '#F59E0B',  // warning / amber
  below: '#EF4444',  // danger
};
const HEX_LABELS = {
  above: 'Above network avg',
  on_target: 'On target',
  below: 'Below network avg',
};

// ─── Hex tooltip card ─────────────────────────────────────────
function HexInfoCard({ hex, networkAvg, currencySymbol, country }) {
  const cur = (val) => {
    if (val == null) return '—';
    if (country === 'India') {
      if (val >= 10000000) return `${currencySymbol}${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `${currencySymbol}${(val / 100000).toFixed(1)} L`;
      return `${currencySymbol}${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(2)} M`;
    if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)} K`;
    return `${currencySymbol}${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  const color = HEX_COLORS[hex.classification];
  const label = HEX_LABELS[hex.classification];

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', width: 240, padding: 0 }}>
      <div style={{
        background: `linear-gradient(135deg, ${color}, ${color}dd)`,
        padding: '10px 14px',
        borderRadius: '12px 12px 0 0',
      }}>
        <div style={{
          fontSize: 9, color: 'rgba(255,255,255,0.85)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          Performance Zone · {label}
        </div>
        <div style={{
          fontSize: 22, fontWeight: 800, color: '#fff', marginTop: 4,
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
        }}>
          {hex.pct_of_network_avg.toFixed(1)}%
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
          of network average
        </div>
      </div>
      <div style={{ padding: '10px 14px', background: '#fff', borderRadius: '0 0 12px 12px', fontSize: 12 }}>
        {[
          ['Stores in zone', hex.store_count],
          ['Zone avg revenue', cur(hex.avg_revenue)],
          ['Network avg', cur(networkAvg)],
          ['Total revenue', cur(hex.total_revenue)],
        ].map(([lbl, val]) => (
          <div key={lbl} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '4px 0', borderBottom: '1px solid #F3F4F6', fontSize: 11,
          }}>
            <span style={{ color: '#6B7280' }}>{lbl}</span>
            <span style={{ fontWeight: 700, color: '#111827' }}>{val}</span>
          </div>
        ))}
        {hex.store_names && hex.store_names.length > 0 && (
          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>
              Stores
            </div>
            <div style={{ fontSize: 10, color: '#6B7280', lineHeight: 1.5 }}>
              {hex.store_names.slice(0, 4).join(' · ')}
              {hex.store_names.length > 4 && ` · +${hex.store_names.length - 4} more`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Light-theme popup card (existing — unchanged) ────────────
function InfoCard({ d, avgSales }) {
  const { currencySymbol, country } = useAppStore();

  const fmt = (n) => {
    if (n == null) return '—';
    return n.toLocaleString(country === 'India' ? 'en-IN' : 'en-US', { maximumFractionDigits: 0 });
  };

  const cur = (val) => {
    if (val == null) return '—';
    if (country === 'India') {
      if (val >= 10000000) return `${currencySymbol}${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000) return `${currencySymbol}${(val / 100000).toFixed(1)} L`;
      return `${currencySymbol}${fmt(val)}`;
    }
    if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(2)} M`;
    if (val >= 1000) return `${currencySymbol}${(val / 1000).toFixed(1)} K`;
    return `${currencySymbol}${fmt(val)}`;
  };

  const typeLabel = d.type === 'prediction' ? 'Top Candidate'
    : d.type === 'store' ? 'Existing Store'
      : d.type === 'request' ? 'Franchise Request'
        : 'Business Unit';

  const headerColor =
    d.type === 'prediction' ? 'linear-gradient(135deg,#6C4CF1,#8B5CF6)' :
      d.type === 'store' && avgSales > 0
        ? (d.revenue >= avgSales
          ? 'linear-gradient(135deg,#16a34a,#22C55E)'
          : 'linear-gradient(135deg,#dc2626,#EF4444)')
        : 'linear-gradient(135deg,#6C4CF1,#06b6d4)';

  const rows = [
    [d.type === 'store' ? 'Total Revenue' : 'Est. Revenue', cur(d.revenue)],
    ['Population', d.population != null ? fmt(d.population) : null],
    ['Avg Income', d.income > 0 ? cur(d.income) : null],
    ['Property Price', d.avg_property_price_3km > 0 ? cur(d.avg_property_price_3km) : (d.avg_property_price_5km > 0 ? cur(d.avg_property_price_5km) : 'N/A')],
    ['Nearest Store', d.nearest_store ? `${d.nearest_store} (${d.nearest_store_km?.toFixed(1)} km)` : null],
    ['Business Unit', d.bu_name || null],
    ['BU Distance', (['store', 'prediction', 'request'].includes(d.type) && d.bu_name) ? `${d.bu_dist_km?.toFixed(1)} km` : null],
  ].filter(([, v]) => v != null);

  return (
    <div style={{ fontFamily: 'Inter,system-ui,sans-serif', width: 280, padding: 0 }}>
      <div style={{ background: headerColor, padding: '10px 14px', borderRadius: '12px 12px 0 0' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <span>{typeLabel}</span>
          {d.region && d.region !== 'Unassigned' && (
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)' }}>
              📍 {d.region}
            </span>
          )}
          {d.type === 'store' && avgSales > 0 && (
            <span style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.15)' }}>
              {d.revenue >= avgSales ? '▲ Above Avg' : '▼ Below Avg'}
            </span>
          )}
        </div>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 800, marginTop: 4, lineHeight: 1.3 }}>{d.name || 'Unknown'}</div>
        {d.score > 0 && (
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>
            {d.score?.toFixed(1)}<span style={{ fontSize: 11, fontWeight: 500 }}>/100</span>
          </div>
        )}
      </div>

      <div style={{ padding: '12px 14px', background: '#ffffff', borderRadius: '0 0 12px 12px' }}>
        {rows.map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '4px 0', borderBottom: '1px solid #F3F4F6', fontSize: 12 }}>
            <span style={{ color: '#6B7280' }}>{lbl}</span>
            <span style={{ fontWeight: 700, color: '#111827', fontSize: 11, textAlign: 'right', maxWidth: 150 }}>{val}</span>
          </div>
        ))}

        {d.total_amenities != null && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid #F3F4F6' }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Key Amenities (10km)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {[['🍽️ Food', d.cnt_food], ['🛒 Retail', d.cnt_retail], ['🏫 Education', d.cnt_education], ['🏥 Health', d.cnt_health]]
                .map(([lbl, cnt]) => (
                  <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6B7280', padding: '2px 0' }}>
                    <span>{lbl}</span>
                    <span style={{ fontWeight: 700, color: '#111827' }}>{cnt ?? 0}</span>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div style={{ marginTop: 12, textAlign: 'center' }}>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}`}
            target="_blank" rel="noopener noreferrer"
            style={{ color: '#6C4CF1', fontSize: 12, textDecoration: 'none', fontWeight: 600 }}
          >
            🗺️ Open in Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}

const getAmenityEmoji = (type) => {
  if (['restaurant', 'fast_food'].includes(type)) return '🍽️';
  if (type === 'cafe') return '☕';
  if (type === 'supermarket') return '🛒';
  if (['mall', 'department_store'].includes(type)) return '🏬';
  if (type === 'school') return '🏫';
  if (['college', 'university'].includes(type)) return '🎓';
  if (['hospital', 'clinic', 'pharmacy'].includes(type)) return '🏥';
  return '📍';
};

// v3.5.4: Amenity category styles (colored border + emoji)
const getAmenityStyle = (type) => {
  if (['hospital', 'clinic', 'pharmacy'].includes(type))
    return { color: '#DC2626', emoji: '🏥', label: 'Healthcare' };
  if (['school', 'college', 'university'].includes(type))
    return { color: '#2563EB', emoji: type === 'school' ? '🏫' : '🎓', label: 'Education' };
  if (['restaurant', 'fast_food', 'cafe'].includes(type))
    return { color: '#EA580C', emoji: type === 'cafe' ? '☕' : '🍽️', label: 'Food' };
  if (['supermarket', 'mall', 'department_store'].includes(type))
    return { color: '#7C3AED', emoji: type === 'supermarket' ? '🛒' : '🏬', label: 'Retail' };
  return { color: '#6B7280', emoji: '📍', label: 'Other' };
};

const amenityIcon = (type) => {
  const { color, emoji } = getAmenityStyle(type);
  return L.divIcon({
    html: `<div style="
      width:18px;height:18px;border-radius:50%;
      background:white;border:1.5px solid ${color};
      display:flex;align-items:center;justify-content:center;
      font-size:10px;line-height:1;
      box-shadow:0 1px 3px rgba(0,0,0,0.25);
    ">${emoji}</div>`,
    className: 'fiq-amenity-icon',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
};

// ─── Main Map ─────────────────────────────────────────────────
export default function MapContainer_() {
  const {
    results, stateConfig, mapLayers, storeFilter, selectedRegion,
    currencySymbol, country, hexHeatmap, mapStoreFilter,
  } = useAppStore();
  const center = stateConfig?.center || [20, 78];
  const zoom = stateConfig?.zoom || 6;

  const { stores, requests, predictions, business_units, amenities, real_estate, avgSales, maxPredScore } = useMemo(() => {
    const allStores = results?.stores || [];
    const allPreds = results?.top_picks || [];

    const totalSales = allStores.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const avg = allStores.length > 0 ? totalSales / allStores.length : 0;
    const maxS = allPreds.reduce((mx, p) => Math.max(mx, p.score || 0), 0);

    let filteredStores = allStores;
    let filteredRequests = results?.requests || [];
    let filteredPreds = allPreds;

    if (storeFilter === 'above') filteredStores = filteredStores.filter(s => s.revenue >= avg);
    if (storeFilter === 'below') filteredStores = filteredStores.filter(s => s.revenue < avg);

    if (selectedRegion) {
      filteredStores = filteredStores.filter(s => s.region === selectedRegion);
      filteredRequests = filteredRequests.filter(r => r.region === selectedRegion);
      filteredPreds = filteredPreds.filter(p => p.region === selectedRegion);
    }

    return {
      stores: filteredStores,
      requests: filteredRequests,
      predictions: filteredPreds,
      business_units: results?.business_units || [],
      amenities: results?.amenities || [],
      real_estate: results?.real_estate || [],
      avgSales: avg,
      maxPredScore: maxS,
    };
  }, [results, storeFilter, selectedRegion, mapStoreFilter]);

  if (!results) return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-surface-2 gap-3">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
        <span style={{ fontSize: 28 }}>🗺️</span>
      </div>
      <p className="text-sm font-semibold text-ink">No map data yet</p>
      <p className="text-xs text-ink-muted">Run a prediction to visualise opportunities on the map.</p>
    </div>
  );

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
    >
      <ZoomControl position="bottomright" />
      <FlyToLocation />
      {/* Light CartoDB tile */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {/* ── HEX HEATMAP (rendered FIRST so pins/markers draw on top) ───────
          Each polygon is an H3 cell aggregating stores inside it, coloured
          by performance vs network avg. */}
      {mapLayers.hexHeatmap && hexHeatmap?.hexes?.length > 0 && hexHeatmap.hexes.map((hex) => {
        const color = HEX_COLORS[hex.classification];
        return (
          <Polygon
            key={`hex-${hex.cell}`}
            positions={hex.boundary}
            pathOptions={{
              color,
              fillColor: color,
              fillOpacity: 0.32,
              weight: 1.2,
              opacity: 0.85,
            }}
          >
            <Tooltip sticky direction="top" offset={[0, -8]}>
              <div style={{ fontFamily: 'Inter', minWidth: 140 }}>
                <div style={{ fontWeight: 800, fontSize: 12, color }}>
                  {HEX_LABELS[hex.classification]} · {hex.pct_of_network_avg.toFixed(0)}%
                </div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>
                  {hex.store_count} store{hex.store_count !== 1 ? 's' : ''} in this zone
                </div>
              </div>
            </Tooltip>
            <Popup maxWidth={260}>
              <HexInfoCard
                hex={hex}
                networkAvg={hexHeatmap.network_avg}
                currencySymbol={currencySymbol}
                country={country}
              />
            </Popup>
          </Polygon>
        );
      })}

      {/* ── Amenities (clustered) ──────────────── */}
      {(mapLayers.amenities ?? true) && amenities.length > 0 && (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {amenities.map((d, i) => (
            <Marker key={`am-${i}`} position={[d.lat, d.lng]} icon={amenityIcon(d.type)}>
              <Tooltip sticky direction="top">
                <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600, color: '#111827' }}>
                  {d.name || d.type.replace('_', ' ')}
                </span>
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {/* ── Existing Stores (slim dots, 3-state) ────────────────────── */}
      {mapLayers.stores && stores.length > 0 && stores.map((d, i) => {
        const ratio = avgSales > 0 ? d.revenue / avgSales : 1;
        const classification =
          ratio >= 1.10 ? 'above' :
          ratio <= 0.90 ? 'below' : 'on_target';
        const color =
          classification === 'above' ? '#22C55E' :
          classification === 'below' ? '#EF4444' : '#F59E0B';
        const label =
          classification === 'above' ? 'Above network avg' :
          classification === 'below' ? 'Below network avg' : 'On target';
        return (
          <Marker key={`store-${i}`} position={[d.lat, d.lng]} icon={storeMarkerIcon(classification)}>
            <Popup maxWidth={300}><InfoCard d={d} avgSales={avgSales} /></Popup>
            <Tooltip sticky direction="top">
              <div style={{ fontFamily: 'Inter' }}>
                <div style={{ fontWeight: 700, fontSize: 12, color }}>{d.name}</div>
                <div style={{ fontSize: 10, color: '#6B7280', marginTop: 2 }}>{label}</div>
              </div>
            </Tooltip>
          </Marker>
        );
      })}

      {/* ── Franchise Requests (clustered) ────── */}
      {mapLayers.requests && requests.length > 0 && (
        <MarkerClusterGroup chunkedLoading>
          {requests.map((d, i) => (
            <Marker key={`req-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('📩', 22)}>
              <Popup maxWidth={300}><InfoCard d={d} avgSales={avgSales} /></Popup>
              <Tooltip sticky direction="top">
                <span style={{ fontFamily: 'Inter', fontSize: 11, color: '#111827' }}>Request: {d.name}</span>
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {/* ── Predictions (scored circles) ─────── */}
      {mapLayers.predictions && predictions.map((d, i) => {
        const pColor = predictionColor(d.score, maxPredScore);
        const radius = scoreSize(d.score);
        return (
          <React.Fragment key={`pred-${i}`}>
            <CircleMarker center={[d.lat, d.lng]} radius={radius + 7}
              pathOptions={{ color: pColor, fillColor: pColor, fillOpacity: 0.1, weight: 1.5, opacity: 0.35 }}
            />
            <CircleMarker center={[d.lat, d.lng]} radius={radius}
              pathOptions={{ color: pColor, fillColor: pColor, fillOpacity: 0.82, weight: 2 }}
            >
              <Popup maxWidth={300}><InfoCard d={d} avgSales={avgSales} /></Popup>
              <Tooltip sticky direction="top">
                <div style={{ fontFamily: 'Inter', minWidth: 120 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: pColor }}>
                    #{i + 1} {i === 0 ? '🏆' : '⭐'} {d.score?.toFixed(1)}/100
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{d.name}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          </React.Fragment>
        );
      })}

      {/* ── Business Units ────────────────────── */}
      {mapLayers.businessUnits && business_units.length > 0 && business_units.map((d, i) => (
        <Marker key={`bu-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('🏭', 28)}>
          <Popup maxWidth={260}><InfoCard d={d} avgSales={avgSales} /></Popup>
          <Tooltip sticky direction="top">
            <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600, color: '#111827' }}>BU: {d.name}</span>
          </Tooltip>
        </Marker>
      ))}

      {/* ── Real Estate Data ────────────────────── */}
      {mapLayers.realEstate && real_estate.length > 0 && real_estate.map((d, i) => {
        const costIndex = d.property_cost_index || 50;
        const growthScore = d.property_growth_score || 50;
        const radius = 5 + (costIndex / 100) * 15;
        const color = growthScore > 60 ? '#22C55E' : growthScore < 40 ? '#EF4444' : '#F59E0B';

        return (
          <CircleMarker key={`re-${i}`} center={[d.lat, d.lng]} radius={radius}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.5, weight: 1, opacity: 0.8 }}
          >
            <Tooltip sticky direction="top">
              <div style={{ fontFamily: 'Inter', minWidth: 120 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color }}>Real Estate Data</div>
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                  {d.price ? `Price: ${currencySymbol || ''}${Math.round(d.price).toLocaleString()}` : d.rent ? `Rent: ${currencySymbol || ''}${Math.round(d.rent).toLocaleString()}` : 'Price/Rent: N/A'}
                </div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Cost Index: {costIndex.toFixed(1)}</div>
                <div style={{ fontSize: 11, color: '#6B7280' }}>Growth Score: {growthScore.toFixed(1)}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}
