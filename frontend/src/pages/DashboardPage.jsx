import React, { Suspense } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Store, FileText, Star, Building2, Activity } from 'lucide-react';
import useAppStore from '../store/useAppStore';
import KPICard from '../components/KPICard';
import Sidebar from '../components/Sidebar';
import MapContainer from '../components/MapContainer';

// Lazy-load map to avoid SSR issues with Leaflet
const LazyMap = React.lazy(() => import('../components/MapContainer'));

export default function DashboardPage() {
  const { results, country, state } = useAppStore();
  const kpis = results?.kpis || {};

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

      {/* ── KPI Row ──────────────────────────────────────────── */}
      <div className="flex gap-3 px-5 py-3 overflow-x-auto border-b border-white/5 shrink-0">
        <KPICard icon={Store}    label="Total Stores"   accent="purple" delay={0}
          value={kpis.total_stores ?? 0} />
        <KPICard icon={Activity} label="Avg Sales"      accent="green"  delay={0.05}
          value={`₹${((kpis.avg_sales || 0) / 1000).toFixed(0)}K`}
          sub="per store" />
        <KPICard icon={Star}     label="Best Score"     accent="amber"  delay={0.1}
          value={`${(kpis.max_score || 0).toFixed(1)}`}
          sub="out of 100"
          progress={kpis.max_score} />
        <KPICard icon={FileText} label="Candidates"     accent="cyan"   delay={0.15}
          value={kpis.top_candidates ?? 0} />
        <KPICard icon={Building2} label="Avg Pred Rev"  accent="purple" delay={0.2}
          value={`₹${((kpis.avg_predicted_revenue || 0) / 1000).toFixed(0)}K`} />
      </div>

      {/* ── Main Layout ──────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 shrink-0 border-r border-white/8 overflow-y-auto p-4 bg-void/60">
          <Sidebar />
        </aside>

        {/* Map */}
        <main className="flex-1 relative overflow-hidden bg-surface">
          <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-slate-600 text-sm">
              Loading map…
            </div>
          }>
            <LazyMap />
          </Suspense>

          {/* Map legend floating overlay */}
          <motion.div
            initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="absolute bottom-5 left-5 glass-card p-3 text-xs space-y-1.5 z-[1000] pointer-events-none"
          >
            <p className="text-slate-500 font-bold uppercase tracking-wider text-[9px] mb-2">Legend</p>
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
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/8">
              <div className="flex gap-1">
                <span className="w-3 h-3 rounded-full bg-green inline-block" />
                <span className="w-3 h-3 rounded-full bg-amber inline-block" />
                <span className="w-3 h-3 rounded-full bg-cyan inline-block" />
              </div>
              <span className="text-slate-500">Score ≥80 / ≥60 / &lt;60</span>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
