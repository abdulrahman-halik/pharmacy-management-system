import React from 'react';
import { usePosStore } from '../stores/posStore';
import { formatLKR, PACKAGING_LEVELS, PackagingLevel } from '@pharmacy/shared';
import { Trash2, Plus, Minus, AlertTriangle, ShieldAlert, Sparkles, Package } from 'lucide-react';

export function PosCartTable() {
  const { baskets, activeBasketIndex, updateItemQuantity, updateItemTier, removeItem } =
    usePosStore();
  const currentBasket = baskets[activeBasketIndex];
  const items = currentBasket.items;

  if (items.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-white border border-slate-300 rounded-lg shadow-sm">
        <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-300 flex items-center justify-center mb-4 text-slate-400">
          <Package className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-800 mb-1">POS Counter Basket is Empty</h3>
        <p className="text-sm text-slate-500 max-w-md mb-6">
          Scan a medicine barcode with the USB scanner or press <kbd className="bg-slate-100 border border-slate-300 px-2 py-0.5 rounded text-xs font-mono font-bold text-slate-700">F2</kbd> to search the master catalogue.
        </p>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> FEFO Auto-Allocation
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span> Multi-Tier Packaging
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span> Real-Time Stock Lock
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white border border-slate-300 rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-300 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">Medicine / Clinical Spec</th>
              <th className="py-3 px-3">Packaging Tier</th>
              <th className="py-3 px-3 text-center">Quantity</th>
              <th className="py-3 px-3">FEFO Batch & Expiry</th>
              <th className="py-3 px-4 text-right">Unit Price</th>
              <th className="py-3 px-4 text-right">Total (LKR)</th>
              <th className="py-3 px-2 text-center w-12">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {items.map((item) => {
              const isLowStock = item.availableStock < 20;

              return (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  {/* Medicine Details & Regulatory Badges */}
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 flex items-center gap-2">
                      <span>{item.medicineName}</span>
                      {item.requiresPrescription && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          POM
                        </span>
                      )}
                      {item.isControlledSubstance && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
                          <ShieldAlert className="w-3 h-3 text-red-600" />
                          Sch II
                        </span>
                      )}
                    </div>
                    {item.genericName && (
                      <div className="text-xs text-slate-500">{item.genericName}</div>
                    )}
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Brand: {item.brandManufacturer || 'Universal'} | Available: {item.availableStock} Units
                    </div>
                  </td>

                  {/* Packaging Tier Selector */}
                  <td className="py-3 px-3">
                    <select
                      value={item.packagingLevel}
                      onChange={(e) =>
                        updateItemTier(
                          item.medicineId,
                          e.target.value as PackagingLevel,
                          item.unitPriceLkr,
                        )
                      }
                      className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    >
                      {PACKAGING_LEVELS.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Quantity Stepper */}
                  <td className="py-3 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.medicineId, item.quantity - 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold transition"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="5000"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItemQuantity(
                            item.medicineId,
                            parseInt(e.target.value, 10) || 1,
                          )
                        }
                        className="w-14 text-center font-bold text-sm bg-white border border-slate-300 rounded py-1 px-1 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => updateItemQuantity(item.medicineId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center rounded bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 font-bold transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>

                  {/* FEFO Batch & Expiry Allocation Badge */}
                  <td className="py-3 px-3">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{item.fefoBatchNumber || 'AUTO-FEFO'}</span>
                      {item.fefoExpiryDate && (
                        <span className="text-emerald-700 text-[11px]">
                          ({item.fefoExpiryDate})
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Unit Price */}
                  <td className="py-3 px-4 text-right font-medium text-slate-700">
                    {formatLKR(item.unitPriceLkr)}
                  </td>

                  {/* Total Line Price */}
                  <td className="py-3 px-4 text-right font-bold text-slate-900">
                    {formatLKR(item.totalPriceLkr)}
                  </td>

                  {/* Action / Remove */}
                  <td className="py-3 px-2 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(item.medicineId)}
                      title="Remove line item"
                      className="p-1.5 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
