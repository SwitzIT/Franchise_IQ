import React, { Suspense, useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Store, FileText, Star, Building2, Activity, Maximize2, Minimize2,
         ChevronDown, ChevronUp, MapPin, Trophy } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import Sidebar from '../components/Sidebar';

// Lazy-load map to avoid SSR issues with Leaflet
const LazyMap = React.lazy(() => import('../components/MapContainer'));

// ─── Reusable Dropdown Component ──────────────────────────────
function NavDropdown({ icon: Icon, label, items, selectedName, onSelect, iconColor }) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef(null);
  const panelRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Close on outside click
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

  // Recalculate position when opening
  const handleToggle = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(!open);
  };

  return (
    <>
      <motion.div ref={btnRef} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="glass-card p-3 flex flex-col gap-1 min-w-[180px] border-white/10">
        <div className="flex items-center gap-2">
          <Icon size={13} className={iconColor || 'text-slate-400'} />
          <span className="text-[10px] text-slate-500 font-medium">{label}</span>
        </div>
        <button
          onClick={handleToggle}
          className="flex items-center justify-between text-xs font-semibold text-white 
                     bg-white/[0.04] hover:bg-white/[0.08] rounded-lg px-2.5 py-1.5 mt-0.5
                     transition-all border border-white/8"
        >
          <span className="truncate max-w-[140px]">{selectedName || 'All'}</span>
          <ChevronDown size={12} className={`text-slate-500 transition-transform ml-2 shrink-0 ${open ? 'rotate-180' : ''}`} />
        </button>
      </motion.div>

      {/* Portal-style dropdown rendered at document level */}
      {open && ReactDOM.createPortal(
        <div ref={panelRef}
          className="rounded-lg max-h-60 overflow-y-auto shadow-2xl min-w-[200px] border border-white/15"
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 99999,
            background: 'rgba(10, 10, 20, 0.97)',
            backdropFilter: 'blur(16px)',
          }}>
          <button
            onClick={() => { onSelect(null); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-white/[0.08]
                       transition-colors border-b border-white/10 font-semibold"
          >
            All
          </button>
          {items.length === 0 && (
            <div className="px-3 py-2 text-[10px] text-slate-600">No data available</div>
          )}
          {items.map((item, i) => (
            <button key={i}
              onClick={() => { onSelect(item.name); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-white/[0.08]
                          transition-colors truncate flex items-center gap-2
                          ${selectedName === item.name ? 'text-purple-light bg-purple/10' : 'text-slate-400'}`}
            >
              {item.rank != null && (
                <span className="text-[9px] font-black text-slate-600 w-4 shrink-0">#{item.rank}</span>
              )}
              <span className="truncate">{item.name}</span>
              {item.score != null && (
                <span className="ml-auto text-[9px] font-mono text-slate-600 shrink-0">{item.score.toFixed(1)}</span>
              )}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

export default function DashboardPage() {
  const { results, country, state, currencySymbol, selectedStoreName, flyToStore } = useAppStore();
  const kpis = results?.kpis || {};
  const stores = results?.stores || [];
  const predictions = results?.top_picks || [];
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(true);

  // Prediction fly-to
  const [selectedPrediction, setSelectedPrediction] = useState(null);
  const flyToPrediction = (name) => {
    if (!name) { setSelectedPrediction(null); return; }
    const pred = predictions.find(p => p.name === name);
    if (pred) {
      setSelectedPrediction(name);
      // Use the same flyToCoords mechanism
      useAppStore.setState({ flyToCoords: { lat: pred.lat, lng: pred.lng, zoom: 18 } });
    }
  };

  // Currency formatter
  const cur = (val) => {
    if (val == null) return '—';
    let formatted = '';
    if (country === 'India') {
      if (val >= 10000000) formatted = (val / 10000000).toFixed(2) + ' Cr';
      else if (val >= 100000) formatted = (val / 100000).toFixed(2) + ' L';
      else formatted = val.toLocaleString('en-IN', { maximumFractionDigits: 0 });
    } else {
      if (val >= 1000000) formatted = (val / 1000000).toFixed(2) + ' M';
      else if (val >= 1000) formatted = (val / 1000).toFixed(1) + ' K';
      else formatted = val.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }
    return `${currencySymbol}${formatted}`;
  };

  const toggleFullscreen = () => setIsFullscreen(prev => !prev);

  // Prepare dropdown items
  const storeItems = stores.map(s => ({ name: s.name }));
  const predItems = predictions.map((p, i) => ({ name: p.name, score: p.score, rank: i + 1 }));

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* ── Top Nav ─────────────────────────────────────────── */}
      <nav className="flex items-center gap-4 px-6 py-3 border-b border-white/8 bg-void/90 backdrop-blur-sm shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple to-cyan
                          flex items-center justify-center shadow-glow-sm">
            <Sparkles size={14} className="text-white" />
          </div>
          <span className="font-black text-base neon-text">FranchiseIQ</span>
        </div>

        <div className="flex items-center gap-1.5 ml-2">
          <span className="text-slate-600 text-xs">/</span>
          <span className="text-xs font-medium text-slate-300">{country}</span>
          <span className="text-slate-600 text-xs">/</span>
          <span className="text-xs font-medium text-slate-400">{state}</span>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs text-green">
            <Activity size={11} />
            <span className="font-medium">Analysis Complete</span>
          </span>
        </div>
      </nav>

      {/* ── KPI Row + Dropdowns ───────────────────────────────── */}
      <div className="flex items-stretch gap-3 px-5 py-3 overflow-x-auto border-b border-white/5 shrink-0">
        {/* Total Franchise Stores */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0, duration: 0.4 }}
          className="glass-card p-3 flex flex-col gap-1 min-w-[120px] border-purple/30 shadow-glow-sm">
          <div className="flex items-center gap-2">
            <Store size={13} className="text-purple-light" />
            <span className="text-[10px] text-slate-500 font-medium">Total Stores</span>
          </div>
          <div className="text-xl font-black text-white tabular-nums">{kpis.total_stores ?? 0}</div>
        </motion.div>

        {/* Avg Store Sales */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05, duration: 0.4 }}
          className="glass-card p-3 flex flex-col gap-1 min-w-[140px] border-green/30 shadow-[0_0_16px_rgba(16,185,129,0.25)]">
          <div className="flex items-center gap-2">
            <Activity size={13} className="text-green" />
            <span className="text-[10px] text-slate-500 font-medium">Avg Store Sales</span>
          </div>
          <div className="text-xl font-black text-white tabular-nums">{cur(kpis.avg_sales)}</div>
          <div className="text-[9px] text-slate-600">per store</div>
        </motion.div>

        {/* Avg Pred. Sales */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="glass-card p-3 flex flex-col gap-1 min-w-[140px] border-cyan/30 shadow-[0_0_16px_rgba(6,182,212,0.25)]">
          <div className="flex items-center gap-2">
            <FileText size={13} className="text-cyan" />
            <span className="text-[10px] text-slate-500 font-medium">Avg Pred. Sales</span>
          </div>
          <div className="text-xl font-black text-white tabular-nums">{cur(kpis.avg_predicted_revenue)}</div>
        </motion.div>

        {/* Best Score */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="glass-card p-3 flex flex-col gap-1 min-w-[120px] border-amber/30 shadow-[0_0_16px_rgba(245,158,11,0.25)]">
          <div className="flex items-center gap-2">
            <Star size={13} className="text-amber" />
            <span className="text-[10px] text-slate-500 font-medium">Best Score</span>
          </div>
          <div className="text-xl font-black text-white tabular-nums">{(kpis.max_score || 0).toFixed(1)}</div>
          <div className="text-[9px] text-slate-600">out of 100</div>
          <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden mt-1">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${Math.min(kpis.max_score || 0, 100)}%` }}
              transition={{ delay: 0.35, duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-amber"
            />
          </div>
        </motion.div>

        {/* Avg Score */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
          className="glass-card p-3 flex flex-col gap-1 min-w-[120px] border-purple/30 shadow-glow-sm">
          <div className="flex items-center gap-2">
            <Star size={13} className="text-purple-light" />
            <span className="text-[10px] text-slate-500 font-medium">Avg Score</span>
          </div>
          <div className="text-xl font-black text-white tabular-nums">{(kpis.avg_score || 0).toFixed(1)}</div>
          <div className="text-[9px] text-slate-600">out of 100</div>
        </motion.div>

        {/* Franchise Store Dropdown */}
        <NavDropdown
          icon={Building2} label="Franchise Store" iconColor="text-slate-400"
          items={storeItems} selectedName={selectedStoreName}
          onSelect={(name) => flyToStore(name)}
        />

        {/* Top Predictions Dropdown */}
        <NavDropdown
          icon={Trophy} label="Top Predictions" iconColor="text-amber"
          items={predItems} selectedName={selectedPrediction}
          onSelect={(name) => flyToPrediction(name)}
        />
      </div>

      {/* ── Main Layout ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — hidden when fullscreen */}
        {!isFullscreen && (
          <aside className="w-72 shrink-0 border-r border-white/8 overflow-y-auto p-4 bg-void/60">
            <Sidebar />
          </aside>
        )}

        {/* Map */}
        <main className="flex-1 relative overflow-hidden bg-surface">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
              Loading map…
            </div>
          }>
            <LazyMap />
          </Suspense>

          {/* Full Screen Toggle Button */}
          <motion.button
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 z-[1000] glass-card p-2.5 rounded-lg
                       border border-white/10 hover:border-purple/40 hover:bg-white/[0.08]
                       transition-all duration-200 group"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Map'}
          >
            {isFullscreen
              ? <Minimize2 size={16} className="text-slate-400 group-hover:text-purple-light transition-colors" />
              : <Maximize2 size={16} className="text-slate-400 group-hover:text-purple-light transition-colors" />
            }
          </motion.button>

          {/* Map Legend — collapsible */}
          <div className="absolute bottom-5 left-5 z-[1000]">
            <AnimatePresence>
              {legendOpen ? (
                <motion.div
                  key="legend-open"
                  initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                  className="glass-card p-3.5 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-slate-500 font-black uppercase tracking-wider text-[9px]">Legend</p>
                    <button onClick={() => setLegendOpen(false)}
                      className="p-0.5 rounded hover:bg-white/10 transition-colors pointer-events-auto">
                      <ChevronDown size={12} className="text-slate-500" />
                    </button>
                  </div>
                  <div className="pointer-events-none">
                    {[
                      ['🏪', 'Existing Stores'],
                      ['📩', 'Franchise Requests'],
                      ['⭐', 'Prediction (score-sized)'],
                      ['🏭', 'Business Units'],
                    ].map(([icon, lbl]) => (
                      <div key={lbl} className="flex items-center gap-2 text-slate-400">
                        <span>{icon}</span><span>{lbl}</span>
                      </div>
                    ))}
                    {/* Store Performance Legend */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/8">
                      <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block border border-emerald-400/30" />
                      <span className="text-slate-500">Above Avg Sales</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full bg-rose-500 inline-block border border-rose-400/30" />
                      <span className="text-slate-500">Below Avg Sales</span>
                    </div>
                    {/* Prediction Score Legend */}
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/8">
                      <div className="flex gap-1">
                        <span className="w-3 h-3 rounded-full bg-green inline-block" />
                        <span className="w-3 h-3 rounded-full bg-amber inline-block" />
                        <span className="w-3 h-3 rounded-full bg-rose-500 inline-block" />
                      </div>
                      <span className="text-slate-500">Top / Mid / Low Score</span>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.button
                  key="legend-closed"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  onClick={() => setLegendOpen(true)}
                  className="glass-card px-3 py-2 flex items-center gap-2 text-xs text-slate-400
                             hover:bg-white/[0.08] transition-all border border-white/10 pointer-events-auto"
                >
                  <MapPin size={12} />
                  <span className="font-bold text-[10px]">Legend</span>
                  <ChevronUp size={12} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
