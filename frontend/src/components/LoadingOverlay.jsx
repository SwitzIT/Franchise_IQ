import React from 'react';
import { motion } from 'framer-motion';
import useAppStore from '../store/useAppStore';

const STEPS_META = [
  { id: 'country',    label: 'Region',   emoji: '🌍' },
  { id: 'state',      label: 'State',    emoji: '🗺️' },
  { id: 'upload',     label: 'Data',     emoji: '📂' },
  { id: 'bu_question',label: 'Units',    emoji: '🏭' },
  { id: 'predicting', label: 'Analyze',  emoji: '⚙️' },
  { id: 'dashboard',  label: 'Results',  emoji: '✅' },
];

const MESSAGES = {
  country:     'Initializing country data pipeline…',
  state:       'Loading state-level demographics…',
  upload:      'Parsing files and checking amenity cache…',
  amenities:   'Fetching amenities via OSMnx — this may take a few minutes…',
  bu_question: 'Setting up business unit clustering…',
  predicting:  'Running Random Forest pipeline — crunching numbers…',
};

export default function LoadingOverlay() {
  const { loading, loadingMsg, step } = useAppStore();
  if (!loading) return null;

  const idx = STEPS_META.findIndex(s => s.id === step);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{ background: 'rgba(8,8,15,0.9)', backdropFilter: 'blur(12px)' }}
    >
      {/* Animated rings */}
      <div className="relative w-24 h-24 mb-8">
        {[0, 1, 2].map(i => (
          <motion.div key={i}
            animate={{ rotate: 360 }}
            transition={{ duration: 2 + i * 0.5, repeat: Infinity, ease: 'linear', delay: i * 0.2 }}
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: i === 0 ? '#7c3aed' : i === 1 ? '#06b6d4' : '#10b981',
              borderTopColor: 'transparent',
              opacity: 1 - i * 0.2,
              transform: `scale(${1 - i * 0.15})`,
            }}
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center text-3xl">
          {STEPS_META[idx]?.emoji || '⚙️'}
        </div>
      </div>

      {/* Status text */}
      <h3 className="text-xl font-bold text-white mb-2">Processing…</h3>
      <p className="text-slate-400 text-sm max-w-xs text-center">
        {loadingMsg || MESSAGES[step] || 'Working on it…'}
      </p>

      {/* Step indicators */}
      <div className="flex items-center gap-2 mt-8">
        {STEPS_META.slice(0, 5).map((s, i) => (
          <React.Fragment key={s.id}>
            <div className={`w-2 h-2 rounded-full transition-colors duration-300
                            ${i <= idx ? 'bg-purple' : 'bg-white/10'}`} />
            {i < 4 && <div className={`w-6 h-px ${i < idx ? 'bg-purple' : 'bg-white/10'}`} />}
          </React.Fragment>
        ))}
      </div>
    </motion.div>
  );
}
