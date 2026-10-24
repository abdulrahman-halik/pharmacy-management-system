import React from 'react';
import { usePosStore } from '../stores/posStore';
import { formatLKR } from '@pharmacy/shared';
import { ShoppingBag, PlusCircle, Trash2, PauseCircle } from 'lucide-react';

export function ParkedCartsShelf() {
  const {
    baskets,
    activeBasketIndex,
    switchBasket,
    parkActiveBasket,
    clearActiveBasket,
  } = usePosStore();

  const activeBasket = baskets[activeBasketIndex];
  const activeCount = activeBasket.items.reduce((s, i) => s + i.quantity, 0);

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 select-none">
      <div className="flex items-center justify-between gap-3 overflow-x-auto scrollbar-thin">
        {/* Basket Tabs (1 to 10) */}
        <div className="flex items-center gap-1.5 min-w-max">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-2 flex items-center gap-1">
            <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
            Carts:
          </span>

          {baskets.map((basket, idx) => {
            const isActive = idx === activeBasketIndex;
            const itemCount = basket.items.reduce((sum, item) => sum + item.quantity, 0);
            const totalLkr = basket.items.reduce((sum, item) => sum + item.totalPriceLkr, 0);
            const hasItems = itemCount > 0;

            return (
              <button
                key={basket.id}
                type="button"
                onClick={() => switchBasket(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded text-xs font-semibold transition-all border ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm font-bold'
                    : hasItems
                      ? 'bg-slate-800 text-amber-300 border-slate-700 hover:bg-slate-700'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:bg-slate-800/80 hover:text-slate-200'
                }`}
              >
                <span>#{idx + 1}</span>
                {hasItems && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                      isActive ? 'bg-emerald-800 text-emerald-100' : 'bg-slate-900 text-amber-400'
                    }`}
                  >
                    {itemCount} | {formatLKR(totalLkr)}
                  </span>
                )}
                {!hasItems && <span className="text-slate-500 text-[10px]">Empty</span>}
              </button>
            );
          })}
        </div>

        {/* Counter Ergonomics Actions */}
        <div className="flex items-center gap-2 min-w-max">
          <button
            type="button"
            onClick={parkActiveBasket}
            title="Park active cart and switch to next shelf (F9)"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-3 py-1.5 rounded text-xs font-semibold transition"
          >
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>Hold Cart</span>
            <kbd className="hidden md:inline-block bg-slate-900 px-1.5 py-0.5 rounded text-[10px] text-slate-400 font-mono">
              F9
            </kbd>
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Clear all items from this customer basket?')) {
                  clearActiveBasket();
                }
              }}
              title="Clear active basket items"
              className="flex items-center gap-1 bg-red-950/60 hover:bg-red-900/80 text-red-200 border border-red-800/60 px-2.5 py-1.5 rounded text-xs font-semibold transition"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
