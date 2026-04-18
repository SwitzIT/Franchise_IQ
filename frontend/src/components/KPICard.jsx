import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const ACCENTS = {
  purple: { border: 'border-purple/30', glow: 'shadow-glow-sm', icon: 'text-purple-light', bar: 'bg-purple' },
  cyan:   { border: 'border-cyan/30',   glow: 'shadow-[0_0_16px_rgba(6,182,212,0.25)]', icon: 'text-cyan',   bar: 'bg-cyan' },
  green:  { border: 'border-green/30',  glow: 'shadow-[0_0_16px_rgba(16,185,129,0.25)]', icon: 'text-green',  bar: 'bg-green' },
  amber:  { border: 'border-amber/30',  glow: 'shadow-[0_0_16px_rgba(245,158,11,0.25)]', icon: 'text-amber',  bar: 'bg-amber' },
};

export default function KPICard({ icon: Icon, label, value, sub, accent = 'purple', delay = 0, progress }) {
  const a = ACCENTS[accent] || ACCENTS.purple;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={clsx('glass-card p-4 flex flex-col gap-2 min-w-[130px]', a.border, a.glow)}
    >
      <div className="flex items-center gap-2">
        {Icon && <Icon size={15} className={a.icon} />}
        <span className="text-xs text-slate-500 font-medium truncate">{label}</span>
      </div>
      <div className="text-xl font-black text-white tabular-nums tracking-tight">{value}</div>
      {sub && <div className="text-xs text-slate-600">{sub}</div>}
      {progress != null && (
        <div className="w-full h-0.5 bg-white/5 rounded-full overflow-hidden mt-1">
          <motion.div
            initial={{ width: 0 }} animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ delay: delay + 0.2, duration: 0.8, ease: 'easeOut' }}
            className={`h-full rounded-full ${a.bar}`}
          />
        </div>
      )}
    </motion.div>
  );
}
