import React from 'react';
import {
  LayoutDashboard, Map, Sparkles, Store, FileText,
  Building2, Coffee, ChevronRight, RefreshCw, Download, Eye, EyeOff
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getDownloadUrl } from '../services/api';

const LAYERS = [
  { key: 'stores',        label: 'Existing Stores',    color: '#3B82F6' },
  { key: 'requests',      label: 'Franchise Requests', color: '#8B5CF6' },
  { key: 'predictions',   label: 'Predictions',        color: '#22C55E' },
  { key: 'businessUnits', label: 'Business Units',     color: '#F59E0B' },
  { key: 'amenities',     label: 'Amenities',          color: '#06B6D4' },
];

export default function AppSidebar({ activeNav, setActiveNav }) {
  const { results, sessionId, reset, country, state, mapLayers, toggleLayer, hasBU } = useAppStore();

  return (
    <aside
      className="flex flex-col h-full bg-surface border-r border-border"
      style={{ width: 240, minWidth: 240 }}
    >
      {/* ── Logo ─────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-border shrink-0">
        <div
          className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #6C4CF1, #8B5CF6)' }}
        >
          <Sparkles size={15} className="text-white" />
        </div>
        <div>
          <p className="font-bold text-sm text-ink tracking-tight leading-none">FranchiseIQ</p>
          <p className="text-[10px] text-ink-muted mt-0.5">Location Intelligence</p>
        </div>
      </div>

      {/* ── Navigation (Layers) ──────────────────── */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="text-[10px] font-semibold text-ink-subtle uppercase tracking-widest px-3 mb-3">
          Navigation
        </p>
        {LAYERS.map(({ key, label, color }) => {
          if (key === 'businessUnits' && !hasBU) return null;
          const on = mapLayers[key];
          return (
            <button
              key={key}
              onClick={() => toggleLayer(key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all
                ${on ? 'text-ink bg-bg' : 'text-ink-muted hover:bg-bg hover:text-ink'}`}
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: on ? color : '#D1D5DB' }} />
              <span className="flex-1 text-left font-medium">{label}</span>
              {on
                ? <Eye size={14} className="text-primary opacity-80" />
                : <EyeOff size={14} className="text-ink-faint" />
              }
            </button>
          );
        })}
      </nav>

      {/* ── Location context ─────────────────────── */}
      {(country || state) && (
        <div className="mx-3 mb-3 p-3 rounded-xl bg-primary/5 border border-primary/15">
          <p className="text-[10px] text-primary font-semibold uppercase tracking-wider mb-1">
            Active Region
          </p>
          <p className="text-xs font-semibold text-ink truncate">
            {[country, state].filter(Boolean).join(' / ')}
          </p>
        </div>
      )}

      {/* ── Footer actions ───────────────────────── */}
      <div className="px-3 pb-4 space-y-2 border-t border-border pt-3 shrink-0">
        {results && sessionId && (
          <a
            href={getDownloadUrl(sessionId)}
            download
            className="btn-secondary w-full text-xs py-2"
          >
            <Download size={13} />
            Download Results
          </a>
        )}
        <button
          onClick={reset}
          className="btn-ghost w-full text-xs text-ink-subtle"
        >
          <RefreshCw size={12} />
          Start New Analysis
        </button>
      </div>
    </aside>
  );
}
