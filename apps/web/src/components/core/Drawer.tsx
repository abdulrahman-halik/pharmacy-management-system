import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

export interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  position?: 'right' | 'left';
  width?: 'md' | 'lg' | 'xl';
}

const widthMap = {
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
};

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  position = 'right',
  width = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isRight = position === 'right';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex"
    >
      {/* Solid High-Contrast Overlay - Zero blur */}
      <div
        className="fixed inset-0 bg-[#0F172A] opacity-80 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`fixed inset-y-0 ${isRight ? 'right-0' : 'left-0'} z-10 flex w-full ${widthMap[width]}`}
      >
        <div className="flex flex-col w-full bg-white border-l border-clinical-slate-border shadow-solid-lg overflow-hidden transform transition-transform duration-150 ease-out">
          {/* Header */}
          <div className="px-6 py-4 bg-slate-50 border-b border-clinical-slate-border flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-clinical-slate-heading tracking-tight">
                {title}
              </h3>
              {description && (
                <p className="text-xs text-clinical-slate-muted mt-0.5">{description}</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-clinical-slate-muted hover:text-clinical-slate-heading hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-clinical-emerald transition-colors"
              aria-label="Close drawer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 px-6 py-5 overflow-y-auto">{children}</div>

          {/* Footer */}
          {footer ? (
            <div className="px-6 py-4 bg-slate-50 border-t border-clinical-slate-border flex items-center justify-end gap-3">
              {footer}
            </div>
          ) : (
            <div className="px-6 py-4 bg-slate-50 border-t border-clinical-slate-border flex items-center justify-end">
              <Button variant="solid-neutral" size="sm" onClick={onClose}>
                Close (Esc)
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
