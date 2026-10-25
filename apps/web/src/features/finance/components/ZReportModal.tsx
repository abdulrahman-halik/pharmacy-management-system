import React from 'react';
import { Modal, Button } from '../../../components/core';
import { Printer } from 'lucide-react';
import { formatLKR, DayClosePreviewDto } from '@pharmacy/shared';

interface ZReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  dayClosePreview: DayClosePreviewDto;
  countedCash: number;
  variance: number;
  denominations: Record<string, number>;
  coinInput: number;
}

export const ZReportModal: React.FC<ZReportModalProps> = ({
  isOpen,
  onClose,
  dayClosePreview,
  countedCash,
  variance,
  denominations,
  coinInput,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="End-of-Day Z-Report (80mm Thermal Receipt Preview)"
    >
      <div className="space-y-4">
        <div className="bg-white p-6 border border-slate-300 rounded shadow font-mono text-xs text-slate-800 max-w-sm mx-auto leading-relaxed">
          <div className="text-center border-b border-dashed border-slate-400 pb-3">
            <h4 className="font-bold text-sm tracking-wider">UNIVERSAL PHARMACY</h4>
            <p className="text-[10px]">No. 120, Galle Road, Colombo 03</p>
            <p className="text-[10px]">Tel: +94 11 234 5678</p>
            <p className="text-[10px]">Tax Reg: 100984920-7000</p>
            <div className="mt-2 font-bold text-xs bg-slate-100 py-1">
              *** END OF DAY Z-REPORT ***
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Closing Date:</span>
              <span className="font-bold">{dayClosePreview.closingDate}</span>
            </div>
            <div className="flex justify-between">
              <span>Closing Time:</span>
              <span>{new Date().toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Register Store ID:</span>
              <span>Store #01 (Main Counter)</span>
            </div>
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-bold text-clinical-crimson">LOCKED (FINAL)</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span>Opening Cash:</span>
              <span>{formatLKR(dayClosePreview.openingCashLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Counter Sales:</span>
              <span>+{formatLKR(dayClosePreview.cashSalesLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span>Customer Collections:</span>
              <span>+{formatLKR(dayClosePreview.cashCollectionsLkr)}</span>
            </div>
            <div className="flex justify-between">
              <span>Cash Expenses:</span>
              <span>-{formatLKR(dayClosePreview.cashExpensesLkr)}</span>
            </div>
            <div className="flex justify-between font-bold pt-1 border-t border-dotted border-slate-300">
              <span>Expected Total Cash:</span>
              <span>{formatLKR(dayClosePreview.expectedCashLkr)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Counted Physical Cash:</span>
              <span>{formatLKR(countedCash)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>Variance:</span>
              <span>{formatLKR(variance)}</span>
            </div>
          </div>

          <div className="py-2 border-b border-dashed border-slate-400 space-y-1 text-[10px]">
            <div className="font-bold mb-1">Denomination Breakdown:</div>
            <div className="grid grid-cols-2 gap-x-2">
              <span>Rs. 5000 x {denominations['5000'] || 0}</span>
              <span className="text-right">{formatLKR(5000 * (denominations['5000'] || 0))}</span>
              <span>Rs. 1000 x {denominations['1000'] || 0}</span>
              <span className="text-right">{formatLKR(1000 * (denominations['1000'] || 0))}</span>
              <span>Rs. 500 x {denominations['500'] || 0}</span>
              <span className="text-right">{formatLKR(500 * (denominations['500'] || 0))}</span>
              <span>Rs. 100 x {denominations['100'] || 0}</span>
              <span className="text-right">{formatLKR(100 * (denominations['100'] || 0))}</span>
              <span>Coins Subtotal:</span>
              <span className="text-right">{formatLKR(coinInput || 0)}</span>
            </div>
          </div>

          <div className="pt-4 text-center text-[10px] space-y-4">
            <div className="pt-6 border-b border-slate-400">Cashier Signature</div>
            <div className="pt-6 border-b border-slate-400">Manager Authorization Signature</div>
            <p className="text-[9px] text-slate-400 pt-2">System Generated via Pharmacy Management Core</p>
          </div>
        </div>

        <div className="flex justify-center gap-2 pt-2">
          <Button
            variant="solid-primary"
            onClick={() => window.print()}
            className="flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> Print 80mm Z-Report
          </Button>
          <Button variant="solid-neutral" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  );
};
