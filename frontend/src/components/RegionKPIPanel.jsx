import React from 'react';
import { motion } from 'framer-motion';
import { Map, TrendingUp, Star, Award, Target, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import useAppStore from '../store/useAppStore';

export default function RegionKPIPanel() {
  const { regionKpis, selectedRegion, setSelectedRegion, currencySymbol, country } = useAppStore();

  if (!regionKpis || !regionKpis.regions || regionKpis.regions.length === 0) {
    return null;
  }

  const { regions, best_region } = regionKpis;

  const fmtCurrency = (val) => {
    if (val == null) return '—';
    const num = Number(val);
    if (country === 'India') {
      if (num >= 10000000) return `${currencySymbol}${(num / 10000000).toFixed(2)}Cr`;
      if (num >= 100000) return `${currencySymbol}${(num / 100000).toFixed(2)}L`;
    } else {
      if (num >= 1000000) return `${currencySymbol}${(num / 1000000).toFixed(2)}M`;
      if (num >= 1000) return `${currencySymbol}${(num / 1000).toFixed(1)}K`;
    }
    return `${currencySymbol}${num.toLocaleString()}`;
  };

  const getPerfColor = (label) => {
    if (label === 'top') return '#34d399'; // emerald-400
    if (label === 'low') return '#fb7185'; // rose-400
    return '#60a5fa'; // blue-400
  };

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass-card p-3 border-emerald-500/20 bg-emerald-500/5">
          <div className="flex items-center gap-2 mb-1 text-emerald-400">
            <Award size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Top Region</span>
          </div>
          <div className="text-lg font-black text-white truncate" title={best_region}>{best_region}</div>
        </div>
        <div className="glass-card p-3 border-blue-500/20 bg-blue-500/5">
          <div className="flex items-center gap-2 mb-1 text-blue-400">
            <Map size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Regions</span>
          </div>
          <div className="text-lg font-black text-white">{regions.length} Active</div>
        </div>
        <div className="glass-card p-3 border-purple/20 bg-purple/5">
          <div className="flex items-center gap-2 mb-1 text-purple-light">
            <Target size={14} />
            <span className="text-[10px] font-bold uppercase tracking-wider">Avg Score</span>
          </div>
          <div className="text-lg font-black text-white">
            {regions.length > 0 ? (regions.reduce((acc, r) => acc + r.avg_final_score, 0) / regions.length).toFixed(1) : 0}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="glass-card p-4">
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-purple-light" />
          Revenue by Region
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={regions} layout="vertical" margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} width={90} />
              <Tooltip 
                cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="glass-card p-3 shadow-lg border-purple/30 text-xs">
                        <div className="font-bold text-white mb-1">{data.name}</div>
                        <div className="text-slate-400">Stores: <span className="text-white font-medium">{data.store_count}</span></div>
                        <div className="text-slate-400">Avg Rev: <span className="text-green font-medium">{fmtCurrency(data.avg_revenue)}</span></div>
                        <div className="text-slate-400">Avg Score: <span className="text-purple-light font-medium">{data.avg_final_score.toFixed(1)}</span></div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey="avg_revenue" radius={[0, 4, 4, 0]} barSize={16}>
                {regions.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={getPerfColor(entry.performance_label)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detail Table */}
      <div className="glass-card overflow-hidden">
        <div className="p-3 border-b border-white/10 bg-white/5">
          <h3 className="text-xs font-bold text-slate-300 uppercase tracking-widest">Regional Leaderboard</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/5 text-slate-400">
              <tr>
                <th className="px-3 py-2 font-medium">Region</th>
                <th className="px-3 py-2 font-medium text-right">Stores</th>
                <th className="px-3 py-2 font-medium text-right">Avg Rev</th>
                <th className="px-3 py-2 font-medium text-right">Score</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {regions.map((r, i) => (
                <tr 
                  key={i}
                  onClick={() => setSelectedRegion(selectedRegion === r.name ? null : r.name)}
                  className={`cursor-pointer transition-colors hover:bg-white/10 ${selectedRegion === r.name ? 'bg-purple/10 border-l-2 border-purple-light' : 'border-l-2 border-transparent'}`}
                >
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: getPerfColor(r.performance_label) }} />
                      <span className={`font-medium ${selectedRegion === r.name ? 'text-white' : 'text-slate-300'}`}>{r.name}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right text-slate-400 tabular-nums">{r.store_count}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right font-medium text-emerald-400 tabular-nums">{fmtCurrency(r.avg_revenue)}</td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right text-purple-light tabular-nums font-bold">
                    {r.avg_final_score > 0 ? r.avg_final_score.toFixed(1) : '-'}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap text-right text-slate-500">
                    <ChevronRight size={14} className={selectedRegion === r.name ? 'text-purple-light rotate-90 transition-transform' : 'transition-transform'} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
