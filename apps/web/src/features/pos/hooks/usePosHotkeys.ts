import { useEffect } from 'react';

export interface PosHotkeysHandlers {
  onSearchMedicine?: () => void;
  onLookupCustomer?: () => void;
  onCheckoutPay?: () => void;
  onParkCart?: () => void;
  onEscape?: () => void;
}

export function usePosHotkeys(handlers: PosHotkeysHandlers) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default actions for terminal hotkeys
      if (e.key === 'F2') {
        e.preventDefault();
        handlers.onSearchMedicine?.();
      } else if (e.key === 'F4') {
        e.preventDefault();
        handlers.onLookupCustomer?.();
      } else if (e.key === 'F8') {
        e.preventDefault();
        handlers.onCheckoutPay?.();
      } else if (e.key === 'F9') {
        e.preventDefault();
        handlers.onParkCart?.();
      } else if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlers]);
}
