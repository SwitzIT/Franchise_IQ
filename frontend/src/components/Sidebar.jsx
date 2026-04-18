import React from 'react';
import { Layers, Eye, EyeOff, RefreshCw, Download } from 'lucide-react';
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

export default function Sidebar() {
  const { mapLayers, toggleLayer, results, sessionId, reset, hasBU } = useAppStore();
  const kpis = results?.kpis || {};

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

      {/* KPI Summary */}
      {results && (
        <div className="glass-card p-4">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">KPI Summary</h3>
          <div className="space-y-2.5">
            {[
              ['Total Stores',    kpis.total_stores,  'text-white'],
              ['Avg Sales',       `₹${(kpis.avg_sales || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}`, 'text-green'],
              ['Top Candidates',  kpis.top_candidates, 'text-amber'],
              ['Best Score',      `${(kpis.max_score || 0).toFixed(1)}/100`, 'text-purple-light'],
              ['Avg Pred. Rev',   `₹${(kpis.avg_predicted_revenue || 0).toLocaleString('en-IN', {maximumFractionDigits:0})}`, 'text-cyan'],
            ].map(([label, val, cls]) => (
              <div key={label} className="flex justify-between items-baseline">
                <span className="text-xs text-slate-500">{label}</span>
                <span className={`text-xs font-bold tabular-nums ${cls}`}>{val}</span>
              </div>
            ))}
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
