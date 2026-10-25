import React from 'react';
import { usePosStore } from '../stores/posStore';
import {
  formatLKR,
  DEFAULT_VAT_RATE,
  DEFAULT_SSCL_RATE,
} from '@pharmacy/shared';
import {
  User,
  FileCheck,
  CreditCard,
  Percent,
  Coins,
  ShieldAlert,
  ChevronRight,
  UserPlus,
} from 'lucide-react';

interface PosTotalsSummaryProps {
  onOpenCustomerModal: () => void;
  onOpenPaymentModal: () => void;
}

export function PosTotalsSummary({
  onOpenCustomerModal,
  onOpenPaymentModal,
}: PosTotalsSummaryProps) {
  const {
    baskets,
    activeBasketIndex,
    setDiscount,
    setVatApplicable,
    setSsclApplicable,
    setLoyaltyRedeemed,
  } = usePosStore();

  const currentBasket = baskets[activeBasketIndex];
  const items = currentBasket.items;
  const customer = currentBasket.customer;
  const prescription = currentBasket.prescription;

  // Financial Pipeline
  const subtotal = items.reduce((sum, item) => sum + item.totalPriceLkr, 0);
  const discount = currentBasket.discountLkr || 0;
  const taxable = Math.max(0, subtotal - discount);

  const vatAmount = currentBasket.isVatApplicable
    ? Math.round(taxable * DEFAULT_VAT_RATE * 100) / 100
    : 0;

  const ssclAmount = currentBasket.isSsclApplicable
    ? Math.round(taxable * DEFAULT_SSCL_RATE * 100) / 100
    : 0;

  const loyaltyRedeemed = currentBasket.loyaltyRedeemedLkr || 0;
  const rawTotal = taxable + vatAmount + ssclAmount - loyaltyRedeemed;
  const grandTotal = Math.round(rawTotal);
  const roundOff = Math.round((grandTotal - rawTotal) * 100) / 100;

  const hasItems = items.length > 0;
  const hasControlled = items.some((i) => i.isControlledSubstance);
  const hasPom = items.some((i) => i.requiresPrescription);

  return (
    <div className="w-80 lg:w-96 flex flex-col gap-3 bg-white border border-slate-300 rounded-lg p-4 shadow-sm select-none">
      {/* Patient / Customer Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-md p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
            <User className="w-3.5 h-3.5 text-slate-600" />
            Customer / Patient
          </span>
          <button
            type="button"
            onClick={onOpenCustomerModal}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-0.5"
          >
            <span>{customer ? 'Change (F4)' : 'Select (F4)'}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {customer ? (
          <div>
            <div className="text-sm font-bold text-slate-900">{customer.fullName}</div>
            <div className="text-xs text-slate-500">{customer.phone}</div>
            <div className="flex items-center justify-between text-[11px] mt-2 pt-2 border-t border-slate-200">
              <span className="text-slate-600">
                Credit Limit: <b>{formatLKR(customer.creditLimit)}</b>
              </span>
              <span className="text-emerald-700 font-bold">
                {customer.loyaltyPoints} Pts
              </span>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Walk-in Patient</span>
            <span className="text-[11px] bg-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
              Standard
            </span>
          </div>
        )}
      </div>

      {/* Clinical Prescription Warning */}
      {(hasPom || hasControlled) && (
        <div className="bg-amber-50 border border-amber-200 rounded-md p-2.5 text-xs text-amber-900 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">Prescription Gate Enforced</div>
            <div className="text-[11px] text-amber-800 mt-0.5">
              {prescription
                ? `Attached: ${prescription.rxNumber} (Verified)`
                : 'Cart contains POM / Controlled drugs. Attach verified prescription before checkout.'}
            </div>
          </div>
        </div>
      )}

      {/* Financial Calculations Breakdown */}
      <div className="flex-1 flex flex-col gap-2 pt-1 border-t border-slate-200">
        {/* Subtotal */}
        <div className="flex items-center justify-between text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="font-semibold text-slate-800">{formatLKR(subtotal)}</span>
        </div>

        {/* Bill Discount Input */}
        <div className="flex items-center justify-between gap-2 text-sm">
          <span className="text-slate-600 flex items-center gap-1">
            <Percent className="w-3.5 h-3.5 text-slate-400" />
            Discount (LKR)
          </span>
          <input
            type="number"
            min="0"
            max={subtotal}
            value={discount || ''}
            placeholder="0.00"
            onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
            className="w-24 text-right text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Tax Checkboxes */}
        <div className="flex items-center justify-between py-1 border-y border-slate-100 text-xs">
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={currentBasket.isVatApplicable}
              onChange={(e) => setVatApplicable(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>VAT (18%)</span>
          </label>
          <span className="font-medium text-slate-700">
            {currentBasket.isVatApplicable ? formatLKR(vatAmount) : 'Exempt'}
          </span>
        </div>

        <div className="flex items-center justify-between text-xs pb-1 border-b border-slate-100">
          <label className="flex items-center gap-1.5 text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={currentBasket.isSsclApplicable}
              onChange={(e) => setSsclApplicable(e.target.checked)}
              className="rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span>SSCL (2.5%)</span>
          </label>
          <span className="font-medium text-slate-700">
            {currentBasket.isSsclApplicable ? formatLKR(ssclAmount) : 'Exempt'}
          </span>
        </div>

        {/* Customer Loyalty Redemption */}
        {customer && customer.loyaltyPoints > 0 && (
          <div className="flex items-center justify-between gap-2 text-xs py-1">
            <span className="text-slate-600 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-amber-500" />
              Redeem Points
            </span>
            <input
              type="number"
              min="0"
              max={Math.min(customer.loyaltyPoints, rawTotal)}
              value={loyaltyRedeemed || ''}
              placeholder="0"
              onChange={(e) => setLoyaltyRedeemed(parseFloat(e.target.value) || 0)}
              className="w-20 text-right text-xs font-semibold bg-slate-50 border border-slate-300 rounded px-2 py-1 text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        )}

        {/* Cash Rounding */}
        {roundOff !== 0 && (
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cash Round Off</span>
            <span>{roundOff > 0 ? `+${roundOff.toFixed(2)}` : roundOff.toFixed(2)}</span>
          </div>
        )}

        {/* Grand Total Highlight Box */}
        <div className="mt-3 bg-emerald-950 text-white rounded-md p-3.5 border border-emerald-900 shadow-sm">
          <div className="flex items-baseline justify-between">
            <span className="text-xs uppercase tracking-wider font-bold text-emerald-300">
              Grand Total
            </span>
            <span className="text-2xl font-black font-display text-white">
              {formatLKR(grandTotal)}
            </span>
          </div>
          <div className="text-[11px] text-emerald-400 mt-0.5 text-right font-medium">
            Sri Lankan Rupee (LKR)
          </div>
        </div>

        {/* Big Action Pay Button */}
        <button
          type="button"
          disabled={!hasItems}
          onClick={onOpenPaymentModal}
          className={`w-full mt-3 py-3 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-md ${
            hasItems
              ? 'bg-emerald-600 hover:bg-emerald-500 text-white active:translate-y-0.5'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          <CreditCard className="w-4 h-4" />
          <span>Pay & Checkout</span>
          <kbd className="bg-emerald-800/80 text-emerald-200 px-1.5 py-0.5 rounded text-[11px] font-mono">
            F8
          </kbd>
        </button>
      </div>
    </div>
  );
}
