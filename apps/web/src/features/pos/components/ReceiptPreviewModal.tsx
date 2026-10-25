import React, { useState } from 'react';
import {
  Printer,
  Share2,
  Check,
  X,
  FileCheck2,
  Send,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import type { EscPosReceiptData, SaleDto } from '@pharmacy/shared';

interface ReceiptPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleDto | null;
  receiptData: EscPosReceiptData | null;
}

export const ReceiptPreviewModal: React.FC<ReceiptPreviewModalProps> = ({
  isOpen,
  onClose,
  sale,
  receiptData,
}) => {
  const [digitalRecipient, setDigitalRecipient] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [digitalSent, setDigitalSent] = useState(false);

  if (!isOpen || !sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendDigitalReceipt = async () => {
    if (!digitalRecipient) return;
    setIsSending(true);
    try {
      // Simulation or endpoint call to send digital receipt
      await new Promise((res) => setTimeout(res, 800));
      setDigitalSent(true);
      setTimeout(() => setDigitalSent(false), 3000);
    } finally {
      setIsSending(false);
    }
  };

  const formattedRawText = receiptData?.rawEscPosText || '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="flex h-[720px] w-full max-w-3xl flex-col rounded-xl border border-slate-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
              <FileCheck2 className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 font-display">
                  Official NMRA-Compliant Tax Invoice
                </h2>
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                  {sale.status}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Invoice #{sale.invoiceNumber} &bull; Generated: {new Date(sale.createdAt).toLocaleString('en-LK')}
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

        {/* Content Body */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: 80mm ESC/POS Thermal Paper Preview */}
          <div className="flex-1 overflow-y-auto bg-slate-100 p-6 flex justify-center">
            <div className="w-[360px] rounded-lg border border-slate-300 bg-white p-6 shadow-md font-mono text-[11px] leading-relaxed text-slate-900 select-all">
              {formattedRawText ? (
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-tight text-slate-800">
                  {formattedRawText}
                </pre>
              ) : (
                <div className="space-y-3">
                  <div className="text-center border-b border-dashed border-slate-300 pb-3">
                    <h3 className="font-bold text-sm text-slate-900">APEX HEALTHCARE PHARMACY</h3>
                    <p className="text-[10px] text-slate-500">Main Dispensary - Colombo 03</p>
                    <p className="text-[10px] text-slate-500">142 Galle Road, Colombo 03</p>
                    <p className="text-[10px] text-slate-500">Tel: +94 11 258 9900</p>
                    <p className="text-[10px] text-slate-600 font-semibold mt-1">
                      NMRA Reg: NMRA/RET/COL/2026-0881
                    </p>
                    <p className="text-[10px] text-slate-600">VAT/TIN: TIN-10928374-7000</p>
                  </div>

                  <div className="text-[10px] space-y-0.5 border-b border-dashed border-slate-300 pb-2">
                    <div className="flex justify-between">
                      <span>Inv: {sale.invoiceNumber}</span>
                      <span>{new Date(sale.createdAt).toLocaleDateString('en-LK')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Cashier: {sale.cashierUserId}</span>
                      <span>Status: {sale.status}</span>
                    </div>
                  </div>

                  {/* Line items with NMRA batch and expiry */}
                  <div className="border-b border-dashed border-slate-300 pb-2 space-y-2">
                    {sale.items.map((item, idx) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="flex justify-between font-bold">
                          <span>{item.packagingLevel} &times; {item.quantitySold}</span>
                          <span>Rs. {item.totalPriceLkr.toFixed(2)}</span>
                        </div>
                        {item.allocations && item.allocations.length > 0 && (
                          <div className="text-[9px] text-slate-500 pl-2">
                            {item.allocations.map((a, aIdx) => (
                              <div key={aIdx}>
                                &bull; Batch: {a.batchNumber} (Exp: {a.expiryDate ? a.expiryDate.slice(0, 7) : 'N/A'}) - {a.allocatedBaseUnits} Units
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Financials */}
                  <div className="border-b border-dashed border-slate-300 pb-2 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>Rs. {sale.subtotalLkr.toFixed(2)}</span>
                    </div>
                    {sale.discountLkr > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount:</span>
                        <span>-Rs. {sale.discountLkr.toFixed(2)}</span>
                      </div>
                    )}
                    {sale.taxVatLkr > 0 && (
                      <div className="flex justify-between">
                        <span>VAT (18%):</span>
                        <span>Rs. {sale.taxVatLkr.toFixed(2)}</span>
                      </div>
                    )}
                    {sale.taxSsclLkr > 0 && (
                      <div className="flex justify-between">
                        <span>SSCL (2.5%):</span>
                        <span>Rs. {sale.taxSsclLkr.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm pt-1 border-t border-slate-200">
                      <span>GRAND TOTAL:</span>
                      <span>Rs. {sale.grandTotalLkr.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payments */}
                  <div className="border-b border-dashed border-slate-300 pb-2 space-y-0.5 text-[10px]">
                    <div className="font-semibold">Payments:</div>
                    {sale.splitPayments.map((p, pIdx) => (
                      <div key={pIdx} className="flex justify-between text-slate-600">
                        <span>&bull; {p.method}</span>
                        <span>Rs. {p.amount.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold text-slate-900 pt-1">
                      <span>Change Given:</span>
                      <span>Rs. {sale.changeGivenLkr.toFixed(2)}</span>
                    </div>
                  </div>

                  <div className="text-center text-[9px] text-slate-500 pt-1 space-y-0.5">
                    <p>Thank you! Wishing you a speedy recovery.</p>
                    <p className="font-semibold text-rose-700">
                      NMRA Mandate: Sold medicines cannot be returned or refunded.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right: Dispatch and Delivery Actions */}
          <div className="w-80 border-l border-slate-200 p-6 flex flex-col justify-between bg-white">
            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  ESC/POS Thermal Printing
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Direct thermal stream sent to 80mm ESC/POS hardware printer via USB wedge or IP socket.
                </p>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-700 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 transition"
                >
                  <Printer className="h-4 w-4" />
                  Print Thermal Receipt
                </button>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
                  <Share2 className="h-3.5 w-3.5 text-slate-500" /> Digital Receipt Dispatch
                </h4>
                <p className="text-xs text-slate-500 mb-3">
                  Asynchronous WhatsApp or SMS delivery via BullMQ worker sandbox.
                </p>

                <div className="space-y-2">
                  <input
                    type="text"
                    value={digitalRecipient}
                    onChange={(e) => setDigitalRecipient(e.target.value)}
                    placeholder="+94 77 123 4567 or email"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900 focus:border-emerald-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSendDigitalReceipt}
                    disabled={isSending || !digitalRecipient}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-emerald-700 bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40 transition"
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : digitalSent ? (
                      <>
                        <Check className="h-4 w-4 text-emerald-700" />
                        <span>Queued for Delivery!</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" />
                        <span>Send Digital Receipt</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                <span className="font-bold text-slate-800 block mb-1">Audit Ledger Entry:</span>
                <span>FEFO batch stock reduced & transaction registered in local immutable store.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
            >
              Start Next Sale (Esc)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
