import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        clinical: {
          emerald: {
            DEFAULT: '#047857', // Primary brand action
            hover: '#059669',
            dark: '#065F46',
            light: '#D1FAE5',
            text: '#064E3B',
          },
          teal: {
            DEFAULT: '#0D9488', // Clinical Rx / Doctor actions
            hover: '#0F766E',
            light: '#CCFBF1',
            text: '#115E59',
          },
          amber: {
            DEFAULT: '#D97706', // Low stock / Near expiry alerts
            hover: '#B45309',
            light: '#FEF3C7',
            text: '#78350F',
          },
          crimson: {
            DEFAULT: '#DC2626', // Out of stock / Controlled drug locks
            hover: '#B91C1C',
            light: '#FEE2E2',
            text: '#7F1D1D',
          },
          slate: {
            canvas: '#F1F5F9', // Page background
            surface: '#FFFFFF', // Card/Modal surface
            border: '#CBD5E1', // Solid input/card borders
            text: '#334155', // Body text
            heading: '#0F172A', // Primary headers
            muted: '#64748B', // Subtext & captions
          },
        },
      },
      boxShadow: {
        solid: '0 2px 0 0 #0F172A',
        'solid-sm': '0 1px 0 0 #CBD5E1',
        'solid-lg': '0 4px 0 0 #0F172A',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
