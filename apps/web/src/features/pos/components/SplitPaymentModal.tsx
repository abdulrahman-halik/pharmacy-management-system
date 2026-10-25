import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  Coins,
  ShieldCheck,
  AlertCircle,
  Plus,
  Trash2,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import type { PaymentMethodType, SplitPayment, Customer } from '@pharmacy/shared';
import { QUICK_CASH_DENOMINATIONS } from '@pharmacy/shared';

interface SplitPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  grandTotalLkr: number;
  customer: Customer | null;
  onConfirmPayment: (payments: SplitPayment[], notes: string) => Promise<void>;
}

export const SplitPaymentModal: React.FC<SplitPaymentModalProps> = ({
  isOpen,
  onClose,
  grandTotalLkr,
  customer,
  onConfirmPayment,
}) => {
  const [payments, setPayments] = useState<SplitPayment[]>([
    { method: 'CASH', amount: grandTotalLkr },
  ]);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync default tender when modal opens
  useEffect(() => {
    if (isOpen) {
      setPayments([{ method: 'CASH', amount: grandTotalLkr }]);
      setNotes('');
      setErrorMessage(null);
      setIsSubmitting(false);
    }
  }, [isOpen, grandTotalLkr]);

  if (!isOpen) return null;

  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingDue = Math.max(0, Math.round((grandTotalLkr - totalPaid) * 100) / 100);
  const changeGiven = Math.max(0, Math.round((totalPaid - grandTotalLkr) * 100) / 100);

  // Quick cash additions to the first cash payment entry
  const handleAddCashPreset = (amount: number) => {
    const cashIdx = payments.findIndex((p) => p.method === 'CASH');
    if (cashIdx >= 0) {
      const updated = [...payments];
      updated[cashIdx] = {
        ...updated[cashIdx],
        amount: Math.round((updated[cashIdx].amount + amount) * 100) / 100,
      };
      setPayments(updated);
    } else {
      setPayments([...payments, { method: 'CASH', amount }]);
    }
  };

  const handleSetExactCash = () => {
    const nonCashTotal = payments
      .filter((p) => p.method !== 'CASH')
      .reduce((s, p) => s + p.amount, 0);
    const needed = Math.max(0, grandTotalLkr - nonCashTotal);
    const cashIdx = payments.findIndex((p) => p.method === 'CASH');
    if (cashIdx >= 0) {
      const updated = [...payments];
      updated[cashIdx] = { ...updated[cashIdx], amount: needed };
      setPayments(updated);
    } else {
      setPayments([...payments, { method: 'CASH', amount: needed }]);
    }
  };

  const handleUpdatePayment = (index: number, field: keyof SplitPayment, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleAddTender = (method: PaymentMethodType) => {
    const remaining = remainingDue > 0 ? remainingDue : 0;
    setPayments([...payments, { method, amount: remaining }]);
  };

  const handleRemoveTender = (index: number) => {
    if (payments.length <= 1) return;
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleValidateAndSubmit = async () => {
    setErrorMessage(null);

    // Filter out zero amount tenders if multiple
    const validPayments = payments.filter((p) => p.amount > 0);
    if (validPayments.length === 0) {
      setErrorMessage('Please enter at least one tender amount.');
      return;
    }

    // Check if total paid covers grand total
    if (totalPaid < grandTotalLkr) {
      setErrorMessage(`Insufficient payment. Remaining due: Rs. ${remainingDue.toFixed(2)}`);
      return;
    }

    // Check credit limits if CREDIT tender is used
    const creditPayment = validPayments.find((p) => p.method === 'CREDIT');
    if (creditPayment) {
      if (!customer) {
        setErrorMessage('Credit payment requires an attached registered customer profile.');
        return;
      }
      const availableCredit = customer.creditLimit - customer.creditBalance;
      if (creditPayment.amount > availableCredit) {
        setErrorMessage(
          `Customer credit limit exceeded. Max available credit: Rs. ${availableCredit.toLocaleString('en-LK')}`,
        );
        return;
      }
    }

    setIsSubmitting(true);
    try {
      await onConfirmPayment(validPayments, notes);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment processing failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[660px] w-full max-w-2xl flex-col rounded-xl border border-slate-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 font-display">
                Multi-Tender Payment & Settlement (F8)
              </h2>
              <p className="text-xs text-slate-500">
                Split checkout across Cash, Card, Customer Credit, Loyalty & Insurance
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Grand Total Display Banner */}
        <div className="bg-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Grand Total Due</span>
            <div className="text-3xl font-black font-display text-emerald-400">
              Rs. {grandTotalLkr.toLocaleString('en-LK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>

          <div className="text-right">
            {remainingDue > 0 ? (
              <div>
                <span className="text-xs uppercase tracking-wider text-rose-400 font-semibold">Remaining Due</span>
                <div className="text-2xl font-bold font-mono text-rose-400">
                  Rs. {remainingDue.toFixed(2)}
                </div>
              </div>
            ) : (
              <div>
                <span className="text-xs uppercase tracking-wider text-emerald-300 font-semibold">Change to Return</span>
                <div className="text-2xl font-bold font-mono text-emerald-300">
                  Rs. {changeGiven.toFixed(2)}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Cash Presets */}
        <div className="border-b border-slate-200 bg-slate-100/70 px-6 py-2.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1">
              <Banknote className="h-3.5 w-3.5 text-slate-500" /> Quick Cash:
            </span>
            {QUICK_CASH_DENOMINATIONS.map((denom: number) => (
              <button
                key={denom}
                type="button"
                onClick={() => handleAddCashPreset(denom)}
                className="rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-800 hover:bg-emerald-50 hover:border-emerald-500 hover:text-emerald-800 transition shadow-2xs"
              >
                +Rs. {denom.toLocaleString('en-LK')}
              </button>
            ))}
            <button
              type="button"
              onClick={handleSetExactCash}
              className="rounded-md border border-emerald-600 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition shadow-2xs"
            >
              Exact Cash
            </button>
          </div>
        </div>

        {/* Payment Methods Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMessage && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 p-3 text-xs font-medium text-rose-800">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Tenders Allocated</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleAddTender('CARD')}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Plus className="h-3 w-3" /> Add Card
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTender('CREDIT')}
                  disabled={!customer}
                  title={!customer ? 'Attach a customer to use store credit' : ''}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  <Plus className="h-3 w-3" /> Add Credit
                </button>
                <button
                  type="button"
                  onClick={() => handleAddTender('BANK_TRANSFER')}
                  className="inline-flex items-center gap-1 rounded border border-slate-300 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  <Plus className="h-3 w-3" /> Add Bank Transfer
                </button>
              </div>
            </div>

            {payments.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3"
              >
                {/* Method selector */}
                <select
                  value={p.method}
                  onChange={(e) => handleUpdatePayment(idx, 'method', e.target.value as PaymentMethodType)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-emerald-700 focus:outline-none"
                >
                  <option value="CASH">CASH (LKR)</option>
                  <option value="CARD">CREDIT/DEBIT CARD</option>
                  <option value="CREDIT">CUSTOMER CREDIT</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                  <option value="LOYALTY_POINTS">LOYALTY REDEMPTION</option>
                </select>

                {/* Amount input */}
                <div className="relative flex-1">
                  <span className="absolute left-3 top-2 text-xs text-slate-500 font-bold">Rs.</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={p.amount}
                    onChange={(e) => handleUpdatePayment(idx, 'amount', parseFloat(e.target.value) || 0)}
                    className="w-full rounded-lg border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm font-mono font-bold text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                </div>

                {/* Reference input for card/cheque/insurance */}
                {p.method !== 'CASH' && (
                  <input
                    type="text"
                    value={p.reference || ''}
                    onChange={(e) => handleUpdatePayment(idx, 'reference', e.target.value)}
                    placeholder={
                      p.method === 'CARD'
                        ? 'Approval Code / Auth No'
                        : p.method === 'CREDIT'
                        ? 'Authorized Ledger Note'
                        : 'Reference / Policy #'
                    }
                    className="w-44 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
                  />
                )}

                {/* Remove tender */}
                {payments.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTender(idx)}
                    className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Customer Credit notice if selected */}
          {customer && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-center justify-between">
              <div>
                <span>Attached Patient: <strong className="text-slate-800">{customer.fullName}</strong></span>
                <div className="text-slate-500">
                  Credit Limit: Rs. {customer.creditLimit.toLocaleString('en-LK')} | Available Credit:{' '}
                  <strong className="text-emerald-700">
                    Rs. {Math.max(0, customer.creditLimit - customer.creditBalance).toLocaleString('en-LK')}
                  </strong>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-emerald-800 font-semibold bg-emerald-100 px-2 py-0.5 rounded">
                  <ShieldCheck className="h-3.5 w-3.5" /> Credit Approved
                </span>
              </div>
            </div>
          )}

          {/* Sale Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Checkout / Dispensing Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Patient requested counseling on taking with meals..."
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-800 focus:border-emerald-700 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Cancel (Esc)
          </button>

          <button
            type="button"
            onClick={handleValidateAndSubmit}
            disabled={isSubmitting || totalPaid < grandTotalLkr}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-6 py-2.5 text-sm font-bold text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50 transition"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processing Checkout & FEFO...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>Complete Checkout & Print (F8)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
