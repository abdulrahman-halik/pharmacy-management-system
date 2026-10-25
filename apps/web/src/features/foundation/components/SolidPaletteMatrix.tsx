import React from 'react';

interface PaletteColor {
  name: string;
  desc: string;
  hex: string;
  bgClass: string;
  hover: string;
  light: string;
}

const PALETTE: PaletteColor[] = [
  {
    name: 'Clinical Emerald',
    desc: 'Primary Brand & POS Action',
    hex: '#047857',
    bgClass: 'bg-clinical-emerald',
    hover: '#059669',
    light: '#D1FAE5',
  },
  {
    name: 'Clinical Teal',
    desc: 'Prescriptions & SLMC Doctors',
    hex: '#0D9488',
    bgClass: 'bg-clinical-teal',
    hover: '#0F766E',
    light: '#CCFBF1',
  },
  {
    name: 'Clinical Amber',
    desc: 'Near Expiry & Low Stock',
    hex: '#D97706',
    bgClass: 'bg-clinical-amber',
    hover: '#B45309',
    light: '#FEF3C7',
  },
  {
    name: 'Clinical Crimson',
    desc: 'Schedule II Lock & Stockout',
    hex: '#DC2626',
    bgClass: 'bg-clinical-crimson',
    hover: '#B91C1C',
    light: '#FEE2E2',
  },
  {
    name: 'Slate Deep',
    desc: 'Header Typography & Borders',
    hex: '#0F172A',
    bgClass: 'bg-clinical-slate-heading',
    hover: 'canvas: #F1F5F9',
    light: 'border: #CBD5E1',
  },
];

export const SolidPaletteMatrix: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-clinical-slate-heading flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-clinical-emerald rounded-full" />
          Clinical Pharmacy Solid Palette (100% Opaque)
        </h2>
        <span className="text-xs text-clinical-slate-muted font-medium">
          Zero backdrop-blur • High contrast
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {PALETTE.map((color) => (
          <div
            key={color.name}
            className="bg-white rounded-lg border border-clinical-slate-border p-4 shadow-solid space-y-3"
          >
            <div
              className={`h-12 ${color.bgClass} rounded-md flex items-center justify-center text-white font-bold text-sm shadow-solid-sm`}
            >
              {color.hex}
            </div>
            <div>
              <p className="text-sm font-bold text-clinical-slate-heading">{color.name}</p>
              <p className="text-xs text-clinical-slate-muted">{color.desc}</p>
            </div>
            <div className="text-[11px] font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-200">
              hover: {color.hover}<br />
              light: {color.light}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
