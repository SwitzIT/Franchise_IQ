import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, MapPin, ChevronDown, ChevronUp,
  TrendingUp, TrendingDown, Minus, Store, Loader2,
} from 'lucide-react';
import useAppStore from '../store/useAppStore';
import { getDistrictPerformance } from '../services/api';

/**
 * DistrictPerformancePanel
 * ────────────────────────
 * Executive-friendly view: stores grouped by admin district with
 * per-district performance vs network average. Click any district
 * to expand its store list.
 *
 * Drop-in usage:
 *     import DistrictPerformancePanel from './DistrictPerformancePanel';
 *     // anywhere in your dashboard root:
 *     <DistrictPerformancePanel />
 *
 * Visibility is controlled by `store.viewMode === 'district'`.
 * Toggle via the sidebar control (see snippet in CHANGES_v3.4.md).
 */

function formatCurrency(n, sym = '₹') {
  if (!Number.isFinite(n)) return `${sym}0`;
  if (Math.abs(n) >= 1e7) return `${sym}${(n / 1e7).toFixed(2)} Cr`;
  if (Math.abs(n) >= 1e5) return `${sym}${(n / 1e5).toFixed(2)} L`;
  return `${sym}${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function classificationStyles(c) {
  if (c === 'above') return {
    bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700',
    accent: '#22C55E', icon: TrendingUp, label: 'Above',
  };
  if (c === 'below') return {
    bg: 'bg-red-50', border: 'border-red-300', text: 'text-red-700',
    accent: '#EF4444', icon: TrendingDown, label: 'Below',
  };
  return {
    bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700',
    accent: '#F59E0B', icon: Minus, label: 'On target',
  };
}


export default function DistrictPerformancePanel() {
  const {
    sessionId, results, viewMode, setViewMode,
    currencySymbol,
  } = useAppStore();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expandedDistricts, setExpandedDistricts] = useState(new Set());
  const [error, setError] = useState(null);

  // Fetch whenever the panel opens (or results change)
  useEffect(() => {
    if (viewMode !== 'district' || !sessionId || !results) return;
    let cancelled = false;
    setLoading(true);
    setError(null);

    getDistrictPerformance(sessionId)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((e) => { if (!cancelled) setError(e.message || 'Failed to load districts'); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [viewMode, sessionId, results]);

  if (viewMode !== 'district') return null;

  const toggleExpand = (key) => {
    const next = new Set(expandedDistricts);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setExpandedDistricts(next);
  };

  const currency = currencySymbol || '₹';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: 360, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 360, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 220 }}
        className="fixed top-20 right-5 z-[2000] w-[26rem] max-w-[95vw] max-h-[82vh]
                   bg-white rounded-2xl shadow-card-lg border border-border
                   flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-4 border-b border-border shrink-0
                        bg-gradient-to-br from-primary/5 to-transparent">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <MapPin size={18} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-ink-subtle uppercase tracking-wider">
              District View
            </div>
            <div className="text-base font-bold text-ink truncate">
              {data
                ? `${data.total_districts} districts · ${data.total_stores} stores`
                : 'Performance by district'}
            </div>
          </div>
          <button
            onClick={() => setViewMode('hex')}
            className="p-1 rounded hover:bg-app-bg transition-colors"
            aria-label="Close"
          >
            <X size={16} className="text-ink-subtle" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3">
          {loading && (
            <div className="flex items-center justify-center gap-2 py-8 text-ink-muted text-sm">
              <Loader2 size={14} className="animate-spin" />
              Aggregating districts…
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
              {error}
            </div>
          )}

          {data && !loading && (
            <>
              {/* Network avg banner */}
              <div className="rounded-lg border border-border bg-app-bg/40 p-3 mb-3 text-center">
                <div className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider">
                  Network average
                </div>
                <div className="text-lg font-bold text-ink tabular-nums">
                  {formatCurrency(data.network_avg, currency)}
                </div>
                <div className="text-[10px] text-ink-muted">
                  across {data.total_stores} stores
                </div>
              </div>

              {/* District cards */}
              <div className="space-y-1.5">
                {data.districts.map((d, i) => {
                  const styles = classificationStyles(d.classification);
                  const ClsIcon = styles.icon;
                  const isExpanded = expandedDistricts.has(d.district);
                  const rank = i + 1;
                  const deltaPct = d.pct_of_network_avg - 100;
                  const deltaSign = deltaPct >= 0 ? '+' : '−';

                  return (
                    <div
                      key={d.district}
                      className={`rounded-lg border ${styles.border} overflow-hidden`}
                    >
                      <button
                        onClick={() => toggleExpand(d.district)}
                        className={`w-full ${styles.bg} px-3 py-2.5 flex items-center gap-3
                                    hover:brightness-95 transition-all text-left`}
                      >
                        {/* Rank */}
                        <div className="text-[10px] font-mono text-ink-subtle w-6 shrink-0">
                          #{rank}
                        </div>

                        {/* Classification dot */}
                        <div
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: styles.accent }}
                        />

                        {/* District info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-ink text-sm truncate">
                            {d.district}
                          </div>
                          <div className="text-[11px] text-ink-muted flex items-center gap-1.5">
                            <span>{d.store_count} stores</span>
                            <span className="text-ink-subtle/50">·</span>
                            <span className="font-mono tabular-nums">
                              {formatCurrency(d.avg_revenue, currency)} avg
                            </span>
                          </div>
                        </div>

                        {/* Delta + chevron */}
                        <div className="text-right shrink-0 flex items-center gap-2">
                          <div
                            className="text-xs font-bold font-mono tabular-nums px-2 py-0.5 rounded"
                            style={{
                              color: styles.accent,
                              backgroundColor: styles.accent + '15',
                            }}
                          >
                            {deltaSign}{Math.abs(deltaPct).toFixed(1)}%
                          </div>
                          {isExpanded
                            ? <ChevronUp size={14} className="text-ink-subtle" />
                            : <ChevronDown size={14} className="text-ink-subtle" />}
                        </div>
                      </button>

                      {/* Expanded store list */}
                      {isExpanded && (
                        <div className="border-t border-border bg-white p-2 space-y-1">
                          <div className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider px-1 py-1">
                            Stores in {d.district} (sorted by revenue)
                          </div>
                          {d.stores.slice(0, 30).map((s, idx) => (
                            <div
                              key={`${d.district}-${idx}`}
                              className="flex items-center gap-2 px-2 py-1.5 rounded text-xs hover:bg-app-bg/50"
                            >
                              <Store size={11} className="text-ink-subtle shrink-0" />
                              <div className="flex-1 min-w-0 truncate text-ink-muted">
                                {s.name || '(unnamed)'}
                              </div>
                              <div className="font-mono tabular-nums text-ink-subtle">
                                {formatCurrency(s.revenue, currency)}
                              </div>
                              <div
                                className="font-mono text-[10px] tabular-nums w-12 text-right"
                                style={{
                                  color:
                                    s.pct_of_network_avg >= data.thresholds.above_pct
                                      ? '#22C55E'
                                      : s.pct_of_network_avg <= data.thresholds.below_pct
                                      ? '#EF4444'
                                      : '#F59E0B',
                                }}
                              >
                                {s.pct_of_network_avg.toFixed(0)}%
                              </div>
                            </div>
                          ))}
                          {d.stores.length > 30 && (
                            <div className="text-[10px] text-ink-subtle italic text-center py-1">
                              …and {d.stores.length - 30} more stores
                            </div>
                          )}
                          {/* District stats footer */}
                          <div className="border-t border-border mt-1 pt-2 px-1 grid grid-cols-3 gap-2 text-[10px]">
                            <div>
                              <div className="text-ink-subtle">Min</div>
                              <div className="font-mono font-semibold text-ink">
                                {formatCurrency(d.min_revenue, currency)}
                              </div>
                            </div>
                            <div>
                              <div className="text-ink-subtle">Avg</div>
                              <div className="font-mono font-semibold text-ink">
                                {formatCurrency(d.avg_revenue, currency)}
                              </div>
                            </div>
                            <div>
                              <div className="text-ink-subtle">Max</div>
                              <div className="font-mono font-semibold text-ink">
                                {formatCurrency(d.max_revenue, currency)}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 rounded-lg border border-border bg-app-bg/30 p-2.5">
                <div className="text-[10px] font-bold text-ink-subtle uppercase tracking-wider mb-1.5">
                  Color legend
                </div>
                <div className="flex flex-wrap gap-3 text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    ≥ {data.thresholds.above_pct}% of net avg
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    {data.thresholds.below_pct}–{data.thresholds.above_pct}%
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    ≤ {data.thresholds.below_pct}%
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
