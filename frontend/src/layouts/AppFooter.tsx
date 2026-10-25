import React from 'react';

export const AppFooter: React.FC = () => {
  return (
    <footer className="bg-white border-t border-clinical-slate-border py-4 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-clinical-slate-muted gap-2">
        <span>Enterprise Pharmacy Management & POS System • Phase 1 Standard</span>
        <span className="font-mono">Collation: utf8mb4_unicode_ci • Monorepo Architecture</span>
      </div>
    </footer>
  );
};
