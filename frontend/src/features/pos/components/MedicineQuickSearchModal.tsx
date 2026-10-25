import React, { useState, useEffect, useRef } from 'react';
import { usePosStore } from '../stores/posStore';
import { posApi } from '../services/posApi';
import type { MedicineSearchItem } from '../types';
import { formatLKR } from '@pharmacy/shared';
import { Search, Plus, Sparkles, AlertTriangle, ShieldAlert, X } from 'lucide-react';

interface MedicineQuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MedicineQuickSearchModal({ isOpen, onClose }: MedicineQuickSearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<MedicineSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addItem } = usePosStore();

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setSelectedIndex(0);
      loadMedicines('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const loadMedicines = async (term: string) => {
    setLoading(true);
    try {
      const items = await posApi.searchMedicines(term);
      setResults(items);
      setSelectedIndex(0);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    loadMedicines(val);
  };

  const handleSelectMedicine = (med: MedicineSearchItem) => {
    addItem({
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.genericName,
      brandManufacturer: med.brandManufacturer,
      packagingLevel: 'UNIT',
      quantity: 1,
      unitPriceLkr: med.mrp,
      availableStock: med.totalStockUnits,
      requiresPrescription: med.requiresPrescription,
      isControlledSubstance: med.isControlledSubstance,
      fefoBatchNumber: med.earliestBatchNumber || 'AUTO-FEFO',
      fefoExpiryDate: med.earliestExpiry || '2028-12-31',
    });
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault();
      handleSelectMedicine(results[selectedIndex]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-none">
      <div className="w-full max-w-2xl bg-white border border-slate-300 rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100">
        {/* Header with Search Input */}
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={handleKeyDown}
            placeholder="Search medicine by Name, Generic, Brand or Barcode... (F2)"
            className="flex-1 bg-transparent border-none text-base font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {loading ? (
            <div className="p-8 text-center text-sm text-slate-500">Searching catalogue...</div>
          ) : results.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              No matching medicines found for "{searchTerm}".
            </div>
          ) : (
            results.map((med, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={med.id}
                  onClick={() => handleSelectMedicine(med)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`p-3 rounded-md cursor-pointer transition-colors flex items-center justify-between ${
                    isSelected ? 'bg-emerald-50 border border-emerald-300' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                      {med.strength && (
                        <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                          {med.strength}
                        </span>
                      )}
                      {med.requiresPrescription && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          POM
                        </span>
                      )}
                      {med.isControlledSubstance && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Sch II
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 mt-0.5">
                      {med.genericName && <span>{med.genericName} • </span>}
                      <span>Brand: {med.brandManufacturer || 'Universal'}</span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                      <span>Stock: <b>{med.totalStockUnits} Units</b></span>
                      {med.earliestBatchNumber && (
                        <span className="flex items-center gap-1 text-emerald-700 font-semibold">
                          <Sparkles className="w-3 h-3" />
                          Batch: {med.earliestBatchNumber} (Exp: {med.earliestExpiry})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right ml-4">
                    <div className="text-base font-bold text-slate-900 font-display">
                      {formatLKR(med.mrp)}
                    </div>
                    <div className="text-[10px] text-slate-400">MRP per Unit</div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts hint */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">↑</kbd> <kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">↓</kbd> Navigate</span>
            <span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Enter</kbd> Add to Cart</span>
            <span><kbd className="bg-slate-200 px-1.5 py-0.5 rounded font-mono">Esc</kbd> Close</span>
          </div>
          <span className="font-semibold text-emerald-700">FEFO Auto-Allocation Active</span>
        </div>
      </div>
    </div>
  );
}
