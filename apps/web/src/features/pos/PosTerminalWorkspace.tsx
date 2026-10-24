import React, { useState, useCallback } from 'react';
import {
  Search,
  UserCheck,
  CreditCard,
  PauseCircle,
  Barcode,
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Receipt,
  RotateCcw,
} from 'lucide-react';
import { usePosStore } from './stores/posStore';
import { usePosHotkeys } from './hooks/usePosHotkeys';
import { useBarcodeScanner } from './hooks/useBarcodeScanner';
import { posApi } from './services/posApi';

import { ParkedCartsShelf } from './components/ParkedCartsShelf';
import { PosCartTable } from './components/PosCartTable';
import { PosTotalsSummary } from './components/PosTotalsSummary';
import { MedicineQuickSearchModal } from './components/MedicineQuickSearchModal';
import { CustomerLookupModal } from './components/CustomerLookupModal';
import { SplitPaymentModal } from './components/SplitPaymentModal';
import { ReceiptPreviewModal } from './components/ReceiptPreviewModal';

import type { MedicineSearchItem } from './types';
import type { PackagingLevel, SplitPayment, SaleDto, EscPosReceiptData, CheckoutInput } from '@pharmacy/shared';

export const PosTerminalWorkspace: React.FC = () => {
  // POS Store state
  const {
    baskets,
    activeBasketIndex,
    switchBasket,
    addItem,
    updateItemQuantity,
    updateItemTier,
    removeItem,
    setCustomer,
    setPrescription,
    setDiscount,
    setVatApplicable,
    setSsclApplicable,
    setLoyaltyRedeemed,
    clearActiveBasket,
    parkActiveBasket,
  } = usePosStore();

  const currentBasket = baskets[activeBasketIndex];

  // Modal states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCustomerLookupOpen, setIsCustomerLookupOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);

  // Active completed sale & receipt data for modal preview
  const [completedSale, setCompletedSale] = useState<SaleDto | null>(null);
  const [receiptData, setReceiptData] = useState<EscPosReceiptData | null>(null);

  // Toast / Status notification
  const [scannerNotification, setScannerNotification] = useState<string | null>(null);

  // Calculate totals
  const subtotalLkr = currentBasket.items.reduce((sum, item) => sum + item.totalPriceLkr, 0);
  const discountLkr = currentBasket.discountLkr || 0;
  const taxableAmount = Math.max(0, subtotalLkr - discountLkr);
  const taxVatLkr = currentBasket.isVatApplicable ? Math.round(taxableAmount * 0.18 * 100) / 100 : 0;
  const taxSsclLkr = currentBasket.isSsclApplicable ? Math.round(taxableAmount * 0.025 * 100) / 100 : 0;
  const grandTotalRaw = taxableAmount + taxVatLkr + taxSsclLkr - (currentBasket.loyaltyRedeemedLkr || 0);
  const grandTotalLkr = Math.max(0, Math.round(grandTotalRaw * 100) / 100);

  // Clinical checks
  const requiresPrescription = currentBasket.items.some((i) => i.requiresPrescription);
  const hasControlledDrugs = currentBasket.items.some((i) => i.isControlledSubstance);
  const isPrescriptionMissing = requiresPrescription && !currentBasket.prescription;

  // Add medicine handler
  const handleSelectMedicine = (medicine: MedicineSearchItem, packagingLevel: PackagingLevel, quantity: number) => {
    let unitPrice = medicine.mrp;
    if (packagingLevel === 'PACKET' && medicine.packagingHierarchy?.unitsPerPacket) {
      unitPrice = medicine.mrp * medicine.packagingHierarchy.unitsPerPacket;
    } else if (packagingLevel === 'BOX' && medicine.packagingHierarchy?.unitsPerPacket && medicine.packagingHierarchy?.packetsPerBox) {
      unitPrice = medicine.mrp * medicine.packagingHierarchy.unitsPerPacket * medicine.packagingHierarchy.packetsPerBox;
    }

    addItem({
      medicineId: medicine.id,
      medicineName: medicine.name,
      genericName: medicine.genericName,
      brandManufacturer: medicine.brandManufacturer,
      packagingLevel,
      quantity,
      unitPriceLkr: unitPrice,
      availableStock: medicine.totalStockUnits,
      requiresPrescription: medicine.requiresPrescription,
      isControlledSubstance: medicine.isControlledSubstance,
      fefoBatchNumber: medicine.earliestBatchNumber,
      fefoExpiryDate: medicine.earliestExpiry,
    });
  };

  // Barcode scanned callback
  const handleBarcodeScanned = useCallback(async (barcode: string) => {
    const results = await posApi.searchMedicines(barcode);
    if (results.length > 0) {
      const matched = results[0];
      handleSelectMedicine(matched, 'UNIT', 1);
      setScannerNotification(`Scanned: ${matched.name}`);
      setTimeout(() => setScannerNotification(null), 3000);
    } else {
      setScannerNotification(`Unrecognized barcode: ${barcode}`);
      setTimeout(() => setScannerNotification(null), 3000);
    }
  }, []);

  useBarcodeScanner({ onScan: handleBarcodeScanned });

  // Keyboard hotkeys
  usePosHotkeys({
    onSearchMedicine: () => setIsSearchOpen(true),
    onLookupCustomer: () => setIsCustomerLookupOpen(true),
    onCheckoutPay: () => {
      if (currentBasket.items.length > 0 && !isPrescriptionMissing) {
        setIsPaymentModalOpen(true);
      }
    },
    onParkCart: () => parkActiveBasket(),
    onEscape: () => {
      setIsSearchOpen(false);
      setIsCustomerLookupOpen(false);
      setIsPaymentModalOpen(false);
      setIsReceiptOpen(false);
    },
  });

  // Final checkout settlement execution
  const handleConfirmCheckout = async (splitPayments: SplitPayment[], notes: string) => {
    const checkoutPayload: CheckoutInput = {
      customerId: currentBasket.customer?.id,
      prescriptionId: currentBasket.prescription?.id,
      items: currentBasket.items.map((i) => ({
        medicineId: i.medicineId,
        packagingLevel: i.packagingLevel,
        quantity: i.quantity,
        unitPriceLkr: i.unitPriceLkr,
      })),
      splitPayments,
      discountLkr: currentBasket.discountLkr,
      isVatApplicable: currentBasket.isVatApplicable,
      isSsclApplicable: currentBasket.isSsclApplicable,
      loyaltyRedeemedLkr: currentBasket.loyaltyRedeemedLkr,
      notes,
      idempotencyKey: `pos-sale-${currentBasket.id}-${Date.now()}`,
    };

    const sale = await posApi.checkout(checkoutPayload, checkoutPayload.idempotencyKey || undefined);
    const receipt = await posApi.getReceipt(sale.id);

    setCompletedSale(sale);
    setReceiptData(receipt);
    clearActiveBasket();
    setIsReceiptOpen(true);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] flex-col bg-slate-100 overflow-hidden font-sans">
      {/* 1. Parked Baskets Shelf */}
      <ParkedCartsShelf />

      {/* 2. Operational POS Action Bar */}
      <div className="flex items-center justify-between border-b border-slate-300 bg-white px-6 py-2.5 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800 border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            POS Terminal #01 &bull; Ready
          </div>

          {scannerNotification && (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1 text-xs font-medium text-emerald-400">
              <Barcode className="h-3.5 w-3.5" />
              <span>{scannerNotification}</span>
            </div>
          )}
        </div>

        {/* Hotkey action triggers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 hover:border-slate-400 transition shadow-2xs"
          >
            <Search className="h-3.5 w-3.5 text-emerald-700" />
            <span>Search Medicine (F2)</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCustomerLookupOpen(true)}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition shadow-2xs ${
              currentBasket.customer
                ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                : 'border-slate-300 bg-slate-50 text-slate-800 hover:bg-slate-100'
            }`}
          >
            <UserCheck className="h-3.5 w-3.5 text-emerald-700" />
            <span>
              {currentBasket.customer ? currentBasket.customer.fullName : 'Patient / Rx (F4)'}
            </span>
          </button>

          <button
            type="button"
            onClick={parkActiveBasket}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
          >
            <PauseCircle className="h-3.5 w-3.5 text-slate-600" />
            <span>Park Cart (F9)</span>
          </button>

          <button
            type="button"
            onClick={clearActiveBasket}
            disabled={currentBasket.items.length === 0}
            className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-40 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Clear Cart</span>
          </button>
        </div>
      </div>

      {/* 3. Main Counter Workspace (2-Column Grid) */}
      <div className="flex flex-1 overflow-hidden p-4 gap-4">
        {/* Left Column: Cart Table & Safety Warnings */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          {/* Clinical Prescriptions / Controlled Drugs Gate Banner */}
          {requiresPrescription && (
            <div
              className={`flex items-center justify-between border-b px-4 py-2 text-xs font-medium ${
                currentBasket.prescription
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
                  : 'border-rose-200 bg-rose-50 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {currentBasket.prescription ? (
                  <Sparkles className="h-4 w-4 text-emerald-700 shrink-0" />
                ) : (
                  <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
                )}
                <span>
                  {currentBasket.prescription ? (
                    <>
                      <strong>Clinical Prescription Verified:</strong> Dispensing authorized under Rx #
                      <span className="font-mono">{currentBasket.prescription.rxNumber}</span>
                    </>
                  ) : (
                    <>
                      <strong>Prescription-Only Medicine (POM) Gate:</strong> Sale contains restricted items.
                      A verified prescription is required before settlement.
                    </>
                  )}
                </span>
              </div>

              {!currentBasket.prescription && (
                <button
                  type="button"
                  onClick={() => setIsCustomerLookupOpen(true)}
                  className="rounded bg-rose-700 px-2.5 py-1 text-xs font-bold text-white hover:bg-rose-800 transition"
                >
                  Attach Rx (F4)
                </button>
              )}
            </div>
          )}

          {/* Cart Items Table */}
          <PosCartTable />
        </div>

        {/* Right Column: Calculations & Settlement Panel */}
        <div className="w-[420px] shrink-0">
          <PosTotalsSummary
            onOpenCustomerModal={() => setIsCustomerLookupOpen(true)}
            onOpenPaymentModal={() => setIsPaymentModalOpen(true)}
          />
        </div>
      </div>

      {/* 4. Modals */}
      <MedicineQuickSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />

      <CustomerLookupModal
        isOpen={isCustomerLookupOpen}
        onClose={() => setIsCustomerLookupOpen(false)}
        selectedCustomer={currentBasket.customer}
        selectedPrescription={currentBasket.prescription}
        onSelectCustomer={setCustomer}
        onSelectPrescription={setPrescription}
        requiresPrescription={requiresPrescription}
      />

      <SplitPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        grandTotalLkr={grandTotalLkr}
        customer={currentBasket.customer}
        onConfirmPayment={handleConfirmCheckout}
      />

      <ReceiptPreviewModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        sale={completedSale}
        receiptData={receiptData}
      />
    </div>
  );
};
