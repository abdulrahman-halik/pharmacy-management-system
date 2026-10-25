import React from 'react';

export type BadgeVariant =
  | 'otc'
  | 'rx'
  | 'controlled-ii'
  | 'controlled-iii'
  | 'in-stock'
  | 'low-stock'
  | 'near-expiry'
  | 'expired'
  | 'neutral';

export type BadgeSize = 'sm' | 'md' | 'lg';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  icon?: React.ReactNode;
  className?: string;
}

const badgeVariants: Record<BadgeVariant, string> = {
  // Over The Counter - Solid high-contrast emerald
  otc: 'bg-[#D1FAE5] text-[#064E3B] border border-[#047857]',
  // Prescription Only - Solid high-contrast teal
  rx: 'bg-[#CCFBF1] text-[#115E59] border border-[#0D9488]',
  // Controlled Drug Schedule II - Solid crimson lockout
  'controlled-ii': 'bg-[#DC2626] text-white border border-[#7F1D1D] font-extrabold tracking-wider',
  // Controlled Drug Schedule III - Solid amber warning
  'controlled-iii': 'bg-[#D97706] text-white border border-[#78350F] font-bold',
  // Inventory status badges
  'in-stock': 'bg-[#D1FAE5] text-[#064E3B] border border-[#047857]',
  'low-stock': 'bg-[#FEF3C7] text-[#78350F] border border-[#D97706]',
  'near-expiry': 'bg-[#FEF3C7] text-[#78350F] border border-[#D97706] font-semibold',
  expired: 'bg-[#FEE2E2] text-[#7F1D1D] border border-[#DC2626] font-bold',
  neutral: 'bg-white text-[#334155] border border-[#CBD5E1]',
};

const badgeSizes: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px] leading-tight rounded',
  md: 'px-2.5 py-1 text-xs font-semibold rounded-md',
  lg: 'px-3 py-1.5 text-sm font-bold rounded-md',
};

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = '',
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1.5 uppercase font-sans select-none
        ${badgeVariants[variant]}
        ${badgeSizes[size]}
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
