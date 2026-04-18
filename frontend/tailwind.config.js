/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        void:    '#08080f',
        surface: '#0f0f1a',
        card:    '#13131f',
        border:  'rgba(255,255,255,0.08)',
        purple:  { DEFAULT: '#7c3aed', light: '#a855f7', glow: '#7c3aed40' },
        cyan:    { DEFAULT: '#06b6d4', light: '#22d3ee', glow: '#06b6d440' },
        green:   { DEFAULT: '#10b981', light: '#34d399', glow: '#10b98140' },
        amber:   { DEFAULT: '#f59e0b', light: '#fbbf24', glow: '#f59e0b40' },
        rose:    { DEFAULT: '#f43f5e', light: '#fb7185' },
      },
      fontFamily: {
        sans:  ['Inter', 'system-ui', 'sans-serif'],
        mono:  ['JetBrains Mono', 'monospace'],
      },
      backgroundImage: {
        'grid-pattern': `linear-gradient(rgba(124,58,237,0.04) 1px, transparent 1px),
                         linear-gradient(90deg, rgba(124,58,237,0.04) 1px, transparent 1px)`,
        'glow-purple': 'radial-gradient(ellipse at center, rgba(124,58,237,0.2) 0%, transparent 70%)',
        'glow-cyan':   'radial-gradient(ellipse at center, rgba(6,182,212,0.2)  0%, transparent 70%)',
      },
      backgroundSize: { 'grid': '32px 32px' },
      boxShadow: {
        'glow-sm':  '0 0 12px rgba(124,58,237,0.4)',
        'glow-md':  '0 0 24px rgba(124,58,237,0.5)',
        'glow-lg':  '0 0 48px rgba(124,58,237,0.4)',
        'cyan-glow':'0 0 24px rgba(6,182,212,0.5)',
        'card':     '0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':      'float 6s ease-in-out infinite',
        'scan':       'scan 2s linear infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
      },
      keyframes: {
        float:     { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        scan:      { '0%': { top: '0%' }, '100%': { top: '100%' } },
        glowPulse: { '0%,100%': { boxShadow: '0 0 12px rgba(124,58,237,0.4)' },
                     '50%':     { boxShadow: '0 0 32px rgba(124,58,237,0.8)' } },
      },
    },
  },
  plugins: [],
};
