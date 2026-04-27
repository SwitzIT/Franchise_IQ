import React from 'react';
import { Layers, Eye, EyeOff, RefreshCw, Download, TrendingUp, TrendingDown, Filter } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import ResultsTable from './ResultsTable';
import { getDownloadUrl } from '../services/api';

const LAYERS = [
  { key: 'stores',        label: '🏪 Existing Stores',     color: 'bg-blue-500' },
  { key: 'requests',      label: '📩 Franchise Requests',  color: 'bg-cyan-500' },
  { key: 'predictions',   label: '⭐ Predictions',          color: 'bg-amber-400' },
  { key: 'businessUnits', label: '🏭 Business Units',       color: 'bg-purple-400' },
  { key: 'amenities',     label: '📍 Amenities',            color: 'bg-emerald-400' },
];

const STORE_FILTERS = [
  { key: 'all',   label: 'All Stores',     icon: null },
  { key: 'above', label: 'Above Avg',      icon: TrendingUp,   color: 'text-emerald-400' },
  { key: 'below', label: 'Below Avg',      icon: TrendingDown, color: 'text-rose-400' },
];

export default function Sidebar() {
  const { mapLayers, toggleLayer, results, sessionId, reset, hasBU, currencySymbol, country,
          storeFilter, setStoreFilter } = useAppStore();
  const kpis = results?.kpis || {};

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

  return (
    <aside className="flex flex-col h-full overflow-y-auto gap-4 pr-1">

      {/* Layer Controls */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers size={14} className="text-purple-light" />
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Map Layers</h3>
        </div>
        <div className="space-y-2">
          {LAYERS.map(({ key, label, color }) => {
            if (key === 'businessUnits' && !hasBU) return null;
            const on = mapLayers[key];
            return (
              <button key={key} onClick={() => toggleLayer(key)}
                className={`w-full flex items-center gap-2.5 py-2 px-3 rounded-lg text-left
                            text-xs font-medium transition-all duration-150
                            ${on ? 'bg-white/[0.06] text-white' : 'text-slate-500 hover:bg-white/[0.04]'}`}>
                <span className={`w-2 h-2 rounded-full ${on ? color : 'bg-slate-700'}`} />
                <span className="flex-1">{label}</span>
                {on ? <Eye size={12} className="text-slate-400" /> : <EyeOff size={12} className="text-slate-700" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Store Performance Filter */}
      {results && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-purple-light" />
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Store Performance</h3>
          </div>
          <div className="flex gap-1.5">
            {STORE_FILTERS.map(({ key, label, icon: Icon, color }) => (
              <button key={key} onClick={() => setStoreFilter(key)}
                className={`flex-1 text-center py-1.5 px-2 rounded-lg text-[10px] font-bold
                            transition-all duration-150 border
                            ${storeFilter === key
                              ? 'bg-purple/15 border-purple/40 text-white shadow-glow-sm'
                              : 'bg-white/[0.02] border-white/5 text-slate-500 hover:bg-white/[0.05]'
                            }`}>
                <div className="flex items-center justify-center gap-1">
                  {Icon && <Icon size={10} className={storeFilter === key ? color : 'text-slate-600'} />}
                  {label}
                </div>
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-3 text-[9px] text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" /> Above Avg
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" /> Below Avg
            </span>
          </div>
        </div>
      )}

      {/* KPI Summary */}
      {results && (
        <div className="glass-card p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Intelligence</h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple/10 text-purple-light border border-purple/20">
              Top {kpis.top_candidates} Matches
            </span>
          </div>
          
          {/* Top Sales Producing Amenity — Hero KPI */}
          {kpis.top_amenity_label && (
            <div className="mb-4 p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10
                            border border-amber-500/20">
              <p className="text-[8px] text-amber-400/70 uppercase font-black tracking-widest mb-1">
                🏆 Top Sales-Driving Amenity
              </p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-black text-amber-300">{kpis.top_amenity_label}</span>
                <span className="text-[10px] text-amber-400/60 font-mono">
                  r={((kpis.top_amenity_corr || 0)).toFixed(2)}
                </span>
              </div>
              <p className="text-[8px] text-slate-500 mt-1">
                Stores near more <span className="text-amber-300 font-bold">{kpis.top_amenity_label?.split(' ')[1]}</span> amenities tend to earn higher revenue.
              </p>
            </div>
          )}

          <div className="space-y-4">
            {/* Strategic Metrics */}
            <div className="space-y-2">
              {[
                { label: 'Avg Customer Base', val: fmt(kpis.avg_population), sub: 'per site' },
                { label: 'Regional Income',   val: cur(kpis.avg_income), sub: 'avg' },
                { label: 'Logistics Coverage', val: `${(kpis.logistics_coverage || 0).toFixed(0)}%`, sub: '< 20km from BU', color: 'text-cyan' },
                { label: 'Cannibalization Risk', val: `${(kpis.cannibalization_risk || 0).toFixed(0)}%`, sub: '< 3km from store', color: 'text-rose-400' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between items-center group">
                  <div>
                    <p className="text-[10px] font-medium text-slate-400 group-hover:text-slate-300 transition-colors">{item.label}</p>
                    <p className="text-[8px] text-slate-600 uppercase font-bold tracking-tighter">{item.sub}</p>
                  </div>
                  <span className={`text-xs font-black tabular-nums ${item.color || 'text-slate-200'}`}>{item.val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Top Picks list */}
      {results && (
        <div className="glass-card p-4 flex-1 overflow-y-auto">
          <ResultsTable />
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {results && sessionId && (
          <a href={getDownloadUrl(sessionId)} download
            className="btn-secondary w-full flex items-center justify-center gap-2 text-sm py-2.5">
            <Download size={15} /> Download Results
          </a>
        )}
        <button onClick={reset}
          className="w-full flex items-center justify-center gap-2 py-2 rounded-lg
                     text-xs text-slate-600 hover:text-slate-400 transition-colors">
          <RefreshCw size={12} /> Start Over
        </button>
      </div>
    </aside>
  );
}
