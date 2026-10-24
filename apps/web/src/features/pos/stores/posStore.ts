import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { PosBasket, PosLineItem, MedicineSearchItem } from '../types';
import type { Customer, Prescription, PackagingLevel } from '@pharmacy/shared';
import { MAX_PARKED_CARTS } from '@pharmacy/shared';

const createEmptyBasket = (index: number): PosBasket => ({
  id: `basket-${index + 1}`,
  name: `Basket #${index + 1}`,
  items: [],
  customer: null,
  prescription: null,
  discountLkr: 0,
  isVatApplicable: false,
  isSsclApplicable: false,
  loyaltyRedeemedLkr: 0,
  notes: '',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

interface PosState {
  baskets: PosBasket[];
  activeBasketIndex: number;

  // Actions
  switchBasket: (index: number) => void;
  addItem: (item: Omit<PosLineItem, 'id' | 'totalPriceLkr'>) => void;
  updateItemQuantity: (medicineId: string, quantity: number) => void;
  updateItemTier: (medicineId: string, tier: PackagingLevel, unitPriceLkr: number) => void;
  removeItem: (medicineId: string) => void;
  setCustomer: (customer: Customer | null) => void;
  setPrescription: (prescription: Prescription | null) => void;
  setDiscount: (amountLkr: number) => void;
  setVatApplicable: (applicable: boolean) => void;
  setSsclApplicable: (applicable: boolean) => void;
  setLoyaltyRedeemed: (amountLkr: number) => void;
  setNotes: (notes: string) => void;
  clearActiveBasket: () => void;
  parkActiveBasket: () => void;
  resetAllBaskets: () => void;
}

export const usePosStore = create<PosState>()(
  persist(
    (set, get) => ({
      baskets: Array.from({ length: MAX_PARKED_CARTS }, (_, i) => createEmptyBasket(i)),
      activeBasketIndex: 0,

      switchBasket: (index: number) => {
        if (index >= 0 && index < MAX_PARKED_CARTS) {
          set({ activeBasketIndex: index });
        }
      },

      addItem: (itemInput) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const existingIdx = currentBasket.items.findIndex(
          (i) => i.medicineId === itemInput.medicineId && i.packagingLevel === itemInput.packagingLevel,
        );

        let updatedItems: PosLineItem[];
        if (existingIdx >= 0) {
          const existing = currentBasket.items[existingIdx];
          const newQty = existing.quantity + itemInput.quantity;
          const updated: PosLineItem = {
            ...existing,
            quantity: newQty,
            totalPriceLkr: Math.round(newQty * existing.unitPriceLkr * 100) / 100,
          };
          updatedItems = [...currentBasket.items];
          updatedItems[existingIdx] = updated;
        } else {
          const newLineItem: PosLineItem = {
            ...itemInput,
            id: `${itemInput.medicineId}-${itemInput.packagingLevel}-${Date.now()}`,
            totalPriceLkr: Math.round(itemInput.quantity * itemInput.unitPriceLkr * 100) / 100,
          };
          updatedItems = [newLineItem, ...currentBasket.items];
        }

        const updatedBasket: PosBasket = {
          ...currentBasket,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };

        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = updatedBasket;
        set({ baskets: newBaskets });
      },

      updateItemQuantity: (medicineId: string, quantity: number) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];

        if (quantity <= 0) {
          get().removeItem(medicineId);
          return;
        }

        const updatedItems = currentBasket.items.map((item) => {
          if (item.medicineId === medicineId) {
            return {
              ...item,
              quantity,
              totalPriceLkr: Math.round(quantity * item.unitPriceLkr * 100) / 100,
            };
          }
          return item;
        });

        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      updateItemTier: (medicineId: string, tier: PackagingLevel, unitPriceLkr: number) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];

        const updatedItems = currentBasket.items.map((item) => {
          if (item.medicineId === medicineId) {
            return {
              ...item,
              packagingLevel: tier,
              unitPriceLkr,
              totalPriceLkr: Math.round(item.quantity * unitPriceLkr * 100) / 100,
            };
          }
          return item;
        });

        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      removeItem: (medicineId: string) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const updatedItems = currentBasket.items.filter((item) => item.medicineId !== medicineId);

        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setCustomer: (customer) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          customer,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setPrescription: (prescription) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          prescription,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setDiscount: (amountLkr: number) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          discountLkr: Math.max(0, amountLkr),
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setVatApplicable: (applicable: boolean) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          isVatApplicable: applicable,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setSsclApplicable: (applicable: boolean) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          isSsclApplicable: applicable,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setLoyaltyRedeemed: (amountLkr: number) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          loyaltyRedeemedLkr: Math.max(0, amountLkr),
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      setNotes: (notes: string) => {
        const { baskets, activeBasketIndex } = get();
        const currentBasket = baskets[activeBasketIndex];
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = {
          ...currentBasket,
          notes,
          updatedAt: new Date().toISOString(),
        };
        set({ baskets: newBaskets });
      },

      clearActiveBasket: () => {
        const { baskets, activeBasketIndex } = get();
        const newBaskets = [...baskets];
        newBaskets[activeBasketIndex] = createEmptyBasket(activeBasketIndex);
        set({ baskets: newBaskets });
      },

      parkActiveBasket: () => {
        const { baskets, activeBasketIndex } = get();
        // Find next empty or non-active basket to switch to
        const nextIndex = (activeBasketIndex + 1) % MAX_PARKED_CARTS;
        set({ activeBasketIndex: nextIndex });
      },

      resetAllBaskets: () => {
        set({
          baskets: Array.from({ length: MAX_PARKED_CARTS }, (_, i) => createEmptyBasket(i)),
          activeBasketIndex: 0,
        });
      },
    }),
    {
      name: 'pharmacy-pos-terminal-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
