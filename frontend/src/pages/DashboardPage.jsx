import React, { Suspense, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Store, Activity, FileText, Star, Building2, Sparkles,
  MapPin, Bell, ChevronDown, ChevronUp, Search, Trophy,
  Layers, Eye, EyeOff, TrendingUp, TrendingDown, Filter,
  Maximize2, Minimize2, X
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import AppSidebar from '../components/Sidebar';
import KPICard from '../components/KPICard';
import OpportunityPanel from '../components/OpportunityPanel';

import ChatPanel from '../components/ChatPanel';

const LazyMap = React.lazy(() => import('../components/MapContainer'));

// ─── Dropdown filter pill ──────────────────────────────────────
function FilterDropdown({ icon: Icon, label, items, selectedName, onSelect, placeholder = 'All' }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  useEffect(() => {
    const handler = (e) => {
      if (btnRef.current && !btnRef.current.contains(e.target) &&
          panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 6, left: rect.left });
    }
    setOpen(!open);
  };

  const isActive = selectedName != null;

  return (
    <>
      <button
        ref={btnRef}
        onClick={handleToggle}
        className={`filter-pill ${isActive ? 'active' : ''}`}
      >
        <Icon size={13} />
        <span className="max-w-[120px] truncate">{selectedName || label}</span>
        <ChevronDown size={11} className={`transition-transform ml-0.5 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && ReactDOM.createPortal(
        <div
          ref={panelRef}
          className="rounded-xl shadow-card-lg border border-border overflow-hidden"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            background: '#FFFFFF',
            minWidth: 200,
            maxHeight: 280,
            overflowY: 'auto',
          }}
        >
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className="w-full text-left px-4 py-2.5 text-xs text-ink-muted hover:bg-app-bg transition-colors border-b border-border font-semibold"
          >
            All {label}
          </button>
          {items.length === 0 && (
            <div className="px-4 py-3 text-xs text-ink-subtle">No data available</div>
          )}
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { onSelect(item.name); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-xs transition-colors flex items-center gap-2
                ${selectedName === item.name ? 'bg-primary/10 text-primary font-semibold' : 'text-ink hover:bg-app-bg'}`}
            >
              {item.rank != null && (
                <span className="text-[10px] font-bold text-ink-subtle w-5 shrink-0">#{item.rank}</span>
              )}
              <span className="truncate flex-1">{item.name}</span>
              {item.score != null && (
                <span className="text-[10px] font-mono text-ink-subtle shrink-0 tabular-nums">
                  {item.score.toFixed(1)}
                </span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

// ─── Map Legend ────────────────────────────────────────────────
function MapLegend() {
  const [open, setOpen] = useState(true);
  return (
    <div className="absolute bottom-5 left-5 z-[1000]">
      <AnimatePresence>
        {open ? (
          <motion.div
            key="legend-open"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="bg-white/95 backdrop-blur-sm border border-border rounded-xl shadow-card-md p-3.5 text-xs"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider">Legend</span>
              <button onClick={() => setOpen(false)} className="p-0.5 rounded hover:bg-app-bg transition-colors">
                <X size={11} className="text-ink-subtle" />
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { color: '#3B82F6', label: 'Existing Stores' },
                { color: '#8B5CF6', label: 'Franchise Requests' },
                { color: '#22C55E', label: 'High Opportunity' },
                { color: '#F59E0B', label: 'Med. Opportunity' },
                { color: '#EF4444', label: 'Low Opportunity' },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2 text-ink-muted">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="legend-closed"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setOpen(true)}
            className="bg-white/95 border border-border rounded-xl shadow-card px-3 py-2 flex items-center gap-1.5 text-xs text-ink-muted hover:text-ink transition-all"
          >
            <MapPin size={12} className="text-primary" />
            <span className="font-medium">Legend</span>
            <ChevronUp size={11} />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Store Performance Filter Bar ─────────────────────────────
const STORE_FILTERS = [
  { key: 'all',   label: 'All Stores',  icon: null },
  { key: 'above', label: 'Above Avg',   icon: TrendingUp },
  { key: 'below', label: 'Below Avg',   icon: TrendingDown },
];

// ─── Main Dashboard ────────────────────────────────────────────
export default function DashboardPage() {
  const {
    results, regionKpis, selectedRegion, setSelectedRegion,
    country, state, currencySymbol, selectedStoreName, flyToStore,
    hasBU, storeFilter, setStoreFilter,
  } = useAppStore();

  const kpis = results?.kpis || {};
  const stores = results?.stores || [];
  const predictions = results?.top_picks || [];

  const [activeNav, setActiveNav] = useState('overview');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedPrediction, setSelectedPrediction] = useState(null);

  const storeItems  = stores.map(s => ({ name: s.name }));
  const predItems   = predictions.map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }));
  const regionItems = regionKpis?.regions?.map(r => ({ name: r.name, score: r.avg_final_score })) || [];

  const flyToPrediction = (name) => {
    if (!name) { setSelectedPrediction(null); return; }
    const pred = predictions.find(p => p.name === name);
    if (pred) {
      setSelectedPrediction(name);
      useAppStore.setState({ flyToCoords: { lat: pred.lat, lng: pred.lng, zoom: 15 } });
    }
  };

  const cur = (val) => {
    if (val == null) return '—';
    if (country === 'India') {
      if (val >= 10000000) return `${currencySymbol}${(val / 10000000).toFixed(2)} Cr`;
      if (val >= 100000)   return `${currencySymbol}${(val / 100000).toFixed(1)} L`;
      return `${currencySymbol}${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
    }
    if (val >= 1000000) return `${currencySymbol}${(val / 1000000).toFixed(2)} M`;
    if (val >= 1000)    return `${currencySymbol}${(val / 1000).toFixed(1)} K`;
    return `${currencySymbol}${val.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  };

  return (
    <div className="flex h-screen overflow-hidden bg-app-bg">
      {/* ── Left Sidebar ──────────────────────────── */}
      {!isFullscreen && (
        <AppSidebar activeNav={activeNav} setActiveNav={setActiveNav} />
      )}

      {/* ── Right Main Area ───────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* ── Top Header Bar ──────────────────────── */}
        {!isFullscreen && (
          <header className="flex items-center gap-4 px-6 py-3.5 bg-surface border-b border-border shrink-0">
            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-sm">
              <span className="text-ink-muted font-medium">
                {country || 'Global'}
              </span>
              {state && (
                <>
                  <span className="text-ink-faint">/</span>
                  <span className="text-ink font-semibold">{state}</span>
                </>
              )}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* Status pill */}
            {results && (
              <span className="badge-success flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                Analysis Complete
              </span>
            )}

            {/* Notification icon */}
            <button className="btn-ghost p-2 rounded-xl relative">
              <Bell size={17} className="text-ink-subtle" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            </button>

            {/* User avatar */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-border cursor-pointer group">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-white text-sm font-bold shrink-0">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-semibold text-ink leading-none">Admin</p>
                <p className="text-[10px] text-ink-muted mt-0.5">Analyst</p>
              </div>
              <ChevronDown size={13} className="text-ink-subtle group-hover:text-ink transition-colors" />
            </div>
          </header>
        )}

        {/* ── Scrollable Content ───────────────────── */}
        <div className="flex-1 overflow-hidden flex flex-col min-h-0">

          {/* ── KPI Cards Row ────────────────────── */}
          {!isFullscreen && (
            <div className="flex items-stretch gap-4 px-6 py-4 border-b border-border shrink-0 overflow-x-auto">
              <KPICard
                icon={Store}
                label="Total Stores"
                value={kpis.total_stores ?? 0}
                sub={`${country || 'Global'} network`}
                color="#6C4CF1"
                delay={0}
              />
              <KPICard
                icon={Activity}
                label="Avg Store Sales"
                value={cur(kpis.avg_sales)}
                sub="per store"
                color="#22C55E"
                delay={0.06}
              />
              <KPICard
                icon={FileText}
                label="Avg Predicted Sales"
                value={cur(kpis.avg_predicted_revenue)}
                sub="AI estimate"
                color="#06B6D4"
                delay={0.12}
              />
              <KPICard
                icon={Star}
                label="Best Score"
                value={`${(kpis.max_score || 0).toFixed(1)}`}
                sub="out of 100"
                color="#F59E0B"
                delay={0.18}
              />
              <KPICard
                icon={Sparkles}
                label="Avg Score"
                value={`${(kpis.avg_score || 0).toFixed(1)}`}
                sub="all candidates"
                color="#8B5CF6"
                delay={0.24}
              />
            </div>
          )}

          {/* ── Filter Bar ───────────────────────── */}
          {!isFullscreen && (
            <div className="flex items-center gap-3 px-6 py-3 border-b border-border bg-surface shrink-0 overflow-x-auto">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-muted shrink-0">
                <Filter size={13} />
                Filters:
              </div>

              {/* Franchise Store */}
              <FilterDropdown
                icon={Building2}
                label="Franchise Store"
                items={storeItems}
                selectedName={selectedStoreName}
                onSelect={(name) => flyToStore(name)}
              />

              {/* Top Predictions */}
              <FilterDropdown
                icon={Trophy}
                label="Top Predictions"
                items={predItems}
                selectedName={selectedPrediction}
                onSelect={(name) => flyToPrediction(name)}
              />

              {/* Region */}
              {regionItems.length > 0 && (
                <FilterDropdown
                  icon={MapPin}
                  label="Region"
                  items={regionItems}
                  selectedName={selectedRegion}
                  onSelect={(name) => setSelectedRegion(name)}
                />
              )}

              {/* Store Performance */}
              <div className="flex items-center gap-1.5 ml-1">
                {STORE_FILTERS.map(({ key, label, icon: Ico }) => (
                  <button
                    key={key}
                    onClick={() => setStoreFilter(key)}
                    className={`filter-pill ${storeFilter === key ? 'active' : ''}`}
                  >
                    {Ico && <Ico size={11} />}
                    {label}
                  </button>
                ))}
              </div>

              {/* Reset */}
              {(selectedStoreName || selectedPrediction || selectedRegion || storeFilter !== 'all') && (
                <button
                  onClick={() => {
                    flyToStore(null);
                    flyToPrediction(null);
                    setSelectedRegion(null);
                    setStoreFilter('all');
                  }}
                  className="btn-ghost text-xs text-danger ml-auto shrink-0"
                >
                  <X size={12} />
                  Reset Filters
                </button>
              )}


            </div>
          )}

          {/* ── Main 2-col content ───────────────── */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Map column (70%) */}
            <div className="flex-1 relative overflow-hidden min-h-0 p-4 pr-2">
              <div className="relative h-full rounded-2xl overflow-hidden border border-border shadow-card">
                <Suspense fallback={
                  <div className="w-full h-full flex items-center justify-center bg-surface-2">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                      <p className="text-sm text-ink-muted font-medium">Loading map…</p>
                    </div>
                  </div>
                }>
                  <LazyMap />
                </Suspense>

                {/* Map legend overlay */}
                <MapLegend />

                {/* Fullscreen toggle */}
                <button
                  onClick={() => setIsFullscreen(v => !v)}
                  className="absolute top-3 right-3 z-[1000] bg-white border border-border rounded-xl p-2 shadow-card hover:border-primary/30 hover:bg-primary/5 transition-all"
                  title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
                >
                  {isFullscreen
                    ? <Minimize2 size={15} className="text-ink-subtle" />
                    : <Maximize2 size={15} className="text-ink-subtle" />
                  }
                </button>
              </div>
            </div>

            {/* Opportunity panel (30%) */}
            {!isFullscreen && (
              <div className="w-80 shrink-0 p-4 pl-2 overflow-hidden min-h-0">
                <OpportunityPanel
                  onSelectPrediction={(name) => flyToPrediction(name)}
                  selectedPrediction={selectedPrediction}
                />
              </div>
            )}
          </div>


        </div>
      </div>

      {/* ── Chat Assistant overlay ─────────────── */}
      {results && <ChatPanel />}
    </div>
  );
}
