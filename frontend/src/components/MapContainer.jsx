import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, ZoomControl, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import useAppStore from '../store/useAppStore';

// ─── FlyTo on store selection ───────────────────────────────────
function FlyToLocation() {
  const map = useMap();
  const flyToCoords = useAppStore(s => s.flyToCoords);
  
  useEffect(() => {
    if (flyToCoords && flyToCoords.lat && flyToCoords.lng) {
      map.flyTo([flyToCoords.lat, flyToCoords.lng], flyToCoords.zoom || 14, {
        duration: 1.5,
      });
    }
  }, [flyToCoords, map]);
  
  return null;
}

// ─── Custom Emoji Icon ──────────────────────────────────────────
const emojiIcon = (emoji, size = 28) => L.divIcon({
  html: `<div style="font-size:${size}px;line-height:1;filter:drop-shadow(0 2px 4px rgba(0,0,0,0.8));">${emoji}</div>`,
  className: '',
  iconSize:  [size, size],
  iconAnchor:[size / 2, size / 2],
});

// ─── Prediction Score → colour (green/amber/red) ───────────────
const predictionColor = (score, maxScore) => {
  if (maxScore <= 0) return '#94a3b8';
  const pct = score / maxScore;
  if (pct >= 0.7) return '#10b981';   // green  – top tier
  if (pct >= 0.4) return '#f59e0b';   // amber  – mid tier
  return '#ef4444';                    // red    – low tier
};
const scoreSize = (s) => 8 + (s / 100) * 14;

// ─── Store Performance → colour ────────────────────────────────
const STORE_GREEN = '#10b981';
const STORE_RED   = '#ef4444';

// ─── Rich Tooltip HTML ────────────────────────────────────────
function InfoCard({ d, avgSales }) {
  const { currencySymbol, country } = useAppStore();
  
  const fmt = (n) => {
    if (n == null) return '—';
    const locale = country === 'India' ? 'en-IN' : 'en-US';
    return n.toLocaleString(locale, { maximumFractionDigits: 0 });
  };

  const cur = (val) => {
    if (val == null) return '—';
    let formatted = '';
    if (country === 'India') {
      if (val >= 10000000) formatted = (val / 10000000).toFixed(2) + ' Cr';
      else if (val >= 100000) formatted = (val / 100000).toFixed(2) + ' L';
      else formatted = fmt(val);
    } else {
      if (val >= 1000000) formatted = (val / 1000000).toFixed(2) + ' M';
      else if (val >= 1000) formatted = (val / 1000).toFixed(1) + ' K';
      else formatted = fmt(val);
    }
    return `${currencySymbol}${formatted}`;
  };

  // Determine header gradient based on store performance
  let headerBg = 'linear-gradient(135deg,#7c3aed,#06b6d4)';
  if (d.type === 'store' && avgSales > 0) {
    headerBg = d.revenue >= avgSales
      ? 'linear-gradient(135deg,#059669,#10b981)'   // green
      : 'linear-gradient(135deg,#dc2626,#ef4444)';  // red
  }

  return (
    <div style={{ fontFamily: 'Inter,sans-serif', width: 280, padding: 0 }}>
      {/* Header */}
      <div style={{ background: headerBg, padding: '10px 14px', borderRadius: '10px 10px 0 0' }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {d.type === 'prediction' ? '🏆 Top Candidate' : d.type === 'store' ? '🏪 Existing Store' : d.type === 'request' ? '📩 Franchise Request' : '🏭 Business Unit'}
          {d.type === 'store' && avgSales > 0 && (
            <span style={{ marginLeft: 8, fontSize: 9, padding: '2px 6px', borderRadius: 4, background: 'rgba(0,0,0,0.25)' }}>
              {d.revenue >= avgSales ? '▲ Above Avg' : '▼ Below Avg'}
            </span>
          )}
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
  const { results, stateConfig, mapLayers, storeFilter } = useAppStore();
  const center = stateConfig?.center || [20, 78];
  const zoom   = stateConfig?.zoom   || 6;

  const { stores, requests, predictions, business_units, amenities, avgSales, maxPredScore } = useMemo(() => {
    const allStores = results?.stores || [];
    const allPreds  = results?.top_picks || [];
    
    // Calculate average sales for store colouring
    const totalSales = allStores.reduce((sum, s) => sum + (s.revenue || 0), 0);
    const avg = allStores.length > 0 ? totalSales / allStores.length : 0;
    
    // Find max prediction score for relative colouring
    const maxS = allPreds.reduce((mx, p) => Math.max(mx, p.score || 0), 0);
    
    // Apply store filter
    let filteredStores = allStores;
    if (storeFilter === 'above') filteredStores = allStores.filter(s => s.revenue >= avg);
    if (storeFilter === 'below') filteredStores = allStores.filter(s => s.revenue < avg);
    
    return {
      stores: filteredStores,
      requests: results?.requests || [],
      predictions: allPreds,
      business_units: results?.business_units || [],
      amenities: results?.amenities || [],
      avgSales: avg,
      maxPredScore: maxS,
    };
  }, [results, storeFilter]);

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
      <FlyToLocation />
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

      {/* ── Existing Stores (green/red performance circles + 🏪 emoji) ── */}
      {mapLayers.stores && stores.length > 0 && stores.map((d, i) => {
        const isAbove = d.revenue >= avgSales;
        const circleColor = isAbove ? STORE_GREEN : STORE_RED;
        return (
          <React.Fragment key={`store-${i}`}>
            {/* Outer glow ring */}
            <CircleMarker
              center={[d.lat, d.lng]}
              radius={16}
              pathOptions={{
                color: circleColor,
                fillColor: circleColor,
                fillOpacity: 0.10,
                weight: 1.5,
                opacity: 0.35,
              }}
            />
            {/* Inner performance circle */}
            <CircleMarker
              center={[d.lat, d.lng]}
              radius={10}
              pathOptions={{
                color: circleColor,
                fillColor: circleColor,
                fillOpacity: 0.25,
                weight: 2,
                opacity: 0.7,
              }}
            />
            {/* Emoji marker */}
            <Marker position={[d.lat, d.lng]} icon={emojiIcon('🏪', 26)}>
              <Popup maxWidth={300}><InfoCard d={d} avgSales={avgSales} /></Popup>
              <Tooltip sticky direction="top">
                <div style={{ fontFamily: 'Inter' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: circleColor }}>
                    {isAbove ? '▲' : '▼'} {d.name}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>
                    {isAbove ? 'Above Average' : 'Below Average'}
                  </div>
                </div>
              </Tooltip>
            </Marker>
          </React.Fragment>
        );
      })}

      {/* ── Franchise Requests (clustered 📩) ──────────────── */}
      {mapLayers.requests && requests.length > 0 && (
        <MarkerClusterGroup chunkedLoading>
          {requests.map((d, i) => (
            <Marker key={`req-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('📩', 24)}>
              <Popup maxWidth={300}><InfoCard d={d} avgSales={avgSales} /></Popup>
              <Tooltip sticky direction="top">
                <span style={{ fontFamily: 'Inter', fontSize: 11 }}>Request: {d.name}</span>
              </Tooltip>
            </Marker>
          ))}
        </MarkerClusterGroup>
      )}

      {/* ── Predictions (green/amber/red scored circles) ───── */}
      {mapLayers.predictions && predictions.map((d, i) => {
        const pColor = predictionColor(d.score, maxPredScore);
        return (
          <React.Fragment key={`pred-${i}`}>
            {/* Outer glow ring */}
            <CircleMarker
              center={[d.lat, d.lng]}
              radius={scoreSize(d.score) + 6}
              pathOptions={{ color: pColor, fillColor: pColor,
                fillOpacity: 0.12, weight: 1.5, opacity: 0.4 }}
            />
            {/* Main scored circle */}
            <CircleMarker
              center={[d.lat, d.lng]}
              radius={scoreSize(d.score)}
              pathOptions={{ color: pColor, fillColor: pColor,
                fillOpacity: 0.85, weight: 2 }}
            >
              <Popup maxWidth={300}><InfoCard d={d} avgSales={avgSales} /></Popup>
              <Tooltip sticky direction="top">
                <div style={{ fontFamily: 'Inter', minWidth: 120 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: pColor }}>
                    #{i + 1} {i === 0 ? '🏆' : '⭐'} {d.score?.toFixed(1)}/100
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{d.name}</div>
                </div>
              </Tooltip>
            </CircleMarker>
          </React.Fragment>
        );
      })}

      {/* ── Business Units (🏭) ─────────────────────────────── */}
      {mapLayers.businessUnits && business_units.length > 0 && business_units.map((d, i) => (
        <Marker key={`bu-${i}`} position={[d.lat, d.lng]} icon={emojiIcon('🏭', 30)}>
          <Popup maxWidth={260}><InfoCard d={d} avgSales={avgSales} /></Popup>
          <Tooltip sticky direction="top">
            <span style={{ fontFamily: 'Inter', fontSize: 12, fontWeight: 600 }}>BU: {d.name}</span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
