import React, { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, ZoomControl } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import useAppStore from '../store/useAppStore';

// ─── Custom Emoji Icon ──────────────────────────────────────────
const emojiIcon = (emoji, size = 28) => L.divIcon({
  html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">${emoji}</div>`,
  className: '',
  iconSize:  [size, size],
  iconAnchor:[size / 2, size / 2],
});

// ─── Score → colour ────────────────────────────────────────────
const scoreColor = (s) => {
  if (s >= 80) return '#10b981';
  if (s >= 60) return '#f59e0b';
  if (s >= 40) return '#06b6d4';
  return '#94a3b8';
};
const scoreSize = (s) => 8 + (s / 100) * 14;

// ─── Rich Tooltip HTML ────────────────────────────────────────
function InfoCard({ d }) {
  const fmt = (n) => n?.toLocaleString('en-IN', { maximumFractionDigits: 0 }) ?? '—';
  const cur = (n) =>
    n != null ? `₹${fmt(n)}` : '—';

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', width: 280, padding: 0 }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#7c3aed,#06b6d4)', padding: '10px 14px', borderRadius: '10px 10px 0 0' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {d.type === 'prediction' ? '🏆 Top Candidate' : d.type === 'store' ? '🏪 Existing Store' : d.type === 'request' ? '📩 Franchise Request' : '🏭 Business Unit'}
        </div>
        <div style={{ fontSize: 15, color: '#fff', fontWeight: 800, marginTop: 2 }}>{d.name || 'Unknown'}</div>
        {d.score > 0 && (
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>
            {d.score?.toFixed(1)}<span style={{ fontSize: 11 }}>/100</span>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div style={{ padding: '12px 14px', background: '#0f0f1a' }}>
        {[
          [d.type === 'store' ? '💹 Total revenue' : '💹 Est. Revenue',    cur(d.revenue)],
          ['👥 Population',      d.population != null ? fmt(d.population) : null],
          ['💰 Average population income', d.income > 0 ? cur(d.income) : null],
          ['📍 Nearest Store',   d.nearest_store ? `${d.nearest_store} (${d.nearest_store_km?.toFixed(1)} km)` : null],
          ['🏭 Business Unit',   d.bu_name || null],
          ['📏 Nearest BU Dist.', (['store', 'prediction', 'request'].includes(d.type) && d.bu_name) ? `${d.bu_dist_km?.toFixed(1)} km` : null],
        ].filter(([, v]) => v != null).map(([lbl, val]) => (
          <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            padding: '4px 0', borderBottom: '1px solid rgba(255,255,255,0.05)', fontSize: 12 }}>
            <span style={{ color: '#64748b' }}>{lbl}</span>
            <span style={{ fontWeight: 700, color: '#f1f5f9', fontSize: 11, textAlign: 'right', maxWidth: 140 }}>{val}</span>
          </div>
        ))}

        {/* Amenities grid */}
        {d.total_amenities != null && (
          <div style={{ marginTop: 10, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: '#475569', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: 8 }}>KEY AMENITIES (10KM)</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 16px' }}>
              {[
                ['🍽️ Food', d.cnt_food],
                ['🛒 Retail', d.cnt_retail],
                ['🏫 Education', d.cnt_education],
                ['🏥 Health', d.cnt_health],
              ].map(([lbl, cnt]) => (
                <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 10, color: '#64748b', padding: '2px 0' }}>
                  <span>{lbl}</span>
                  <span style={{ fontWeight: 700, color: '#e2e8f0' }}>{cnt ?? 0}</span>
                </div>
              ))}
            </div>
          </div>
        )}
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

// ─── Main Map Component ───────────────────────────────────────
export default function MapContainer_() {
  const { results, stateConfig, mapLayers } = useAppStore();
  const center = stateConfig?.center || [20, 78];
  const zoom   = stateConfig?.zoom   || 6;

  const { stores, requests, predictions, business_units, amenities } = useMemo(() => ({
    stores:         results?.stores          || [],
    requests:       results?.requests        || [],
    predictions:    results?.top_picks       || [],
    business_units: results?.business_units  || [],
    amenities:      results?.amenities       || [],
  }), [results]);

  if (!results) return (
    <div className="w-full h-full flex items-center justify-center text-slate-600">
      Run a prediction to see the map
    </div>
  );

  return (
    <MapContainer
      center={center} zoom={zoom}
      style={{ width: '100%', height: '100%' }}
      zoomControl={false}
      className="rounded-xl"
    >
      <ZoomControl position="bottomright" />
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        maxZoom={19}
      />

      {/* ── Amenities (clustered) ────────────────────────────── */}
      {(mapLayers.amenities ?? true) && amenities.length > 0 && (
        <MarkerClusterGroup chunkedLoading maxClusterRadius={50}>
          {amenities.map((d, i) => {
            const emoji = getAmenityEmoji(d.type);
            return (
              <Marker key={`am-${i}`} position={[d.lat, d.lng]} icon={emojiIcon(emoji, 20)}>
                <Tooltip sticky direction="top">
                  <span style={{ fontFamily: 'Inter', fontSize: 11, fontWeight: 600 }}>
                    {d.name || d.type.replace('_', ' ')}
                  </span>
                </Tooltip>
              </Marker>
            );
          })}
        </MarkerClusterGroup>
      )}

      {/* ── Existing Stores (clustered 🏪) ─────────────────── */}
      {mapLayers.stores && stores.length > 0 && (
        <MarkerClusterGroup chunkedLoading>
          {stores.map((d, i) => (
            <Marker key={`store-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('🏪', 26)}>
              <Popup maxWidth={300}><InfoCard d={d} /></Popup>
              <Tooltip sticky direction="top">
                <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}>
                  {d.name}
                </span>
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {/* ── Franchise Requests (clustered 📩) ──────────────── */}
      {mapLayers.requests && requests.length > 0 && (
        <MarkerClusterGroup chunkedLoading>
          {requests.map((d, i) => (
            <Marker key={`req-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('📩', 24)}>
              <Popup maxWidth={300}><InfoCard d={d} /></Popup>
              <Tooltip sticky direction="top">
                <span style={{ fontFamily: 'Inter', fontSize: 11 }}>Request: {d.name}</span>
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {/* ── Predictions (scored circles + emoji) ───────────── */}
      {mapLayers.predictions && predictions.map((d, i) => (
        <React.Fragment key={`pred-${i}`}>
          {/* Outer glow ring */}
          <CircleMarker
            center={[d.lat, d.lng]}
            radius={scoreSize(d.score) + 6}
            pathOptions={{ color: scoreColor(d.score), fillColor: scoreColor(d.score),
              fillOpacity: 0.12, weight: 1.5, opacity: 0.4 }}
          />
          {/* Main scored circle */}
          <CircleMarker
            center={[d.lat, d.lng]}
            radius={scoreSize(d.score)}
            pathOptions={{ color: scoreColor(d.score), fillColor: scoreColor(d.score),
              fillOpacity: 0.85, weight: 2 }}
          >
            <Popup maxWidth={300}><InfoCard d={d} /></Popup>
            <Tooltip sticky direction="top">
              <div style={{ fontFamily: 'Inter', minWidth: 120 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: scoreColor(d.score) }}>
                  #{i + 1} {i === 0 ? '🏆' : '⭐'} {d.score?.toFixed(1)}/100
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{d.name}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        </React.Fragment>
      ))}

      {/* ── Business Units (🏭) ─────────────────────────────── */}
      {mapLayers.businessUnits && business_units.length > 0 && business_units.map((d, i) => (
        <Marker key={`bu-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('🏭', 30)}>
          <Popup maxWidth={260}><InfoCard d={d} /></Popup>
          <Tooltip sticky direction="top">
            <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}>BU: {d.name}</span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
