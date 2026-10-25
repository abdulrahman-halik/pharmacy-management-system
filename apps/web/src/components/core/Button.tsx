import React from 'react';

export type ButtonVariant =
  | 'solid-primary'
  | 'solid-accent'
  | 'solid-danger'
  | 'solid-warning'
  | 'solid-neutral';

export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  'solid-primary':
    'bg-clinical-emerald hover:bg-clinical-emerald-hover text-white shadow-solid-sm border border-clinical-emerald-dark',
  'solid-accent':
    'bg-clinical-teal hover:bg-clinical-teal-hover text-white shadow-solid-sm border border-teal-800',
  'solid-danger':
    'bg-clinical-crimson hover:bg-clinical-crimson-hover text-white shadow-solid-sm border border-red-800',
  'solid-warning':
    'bg-clinical-amber hover:bg-clinical-amber-hover text-white shadow-solid-sm border border-amber-800',
  'solid-neutral':
    'bg-white hover:bg-slate-100 text-clinical-slate-heading shadow-solid-sm border border-clinical-slate-border',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-xs font-semibold rounded-md gap-1.5',
  md: 'px-4 py-2 text-sm font-semibold rounded-md gap-2',
  lg: 'px-6 py-2.5 text-base font-bold rounded-lg gap-2.5',
};

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'solid-primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const isDisabled = disabled || isLoading;

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={`inline-flex items-center justify-center font-sans tracking-wide transition-all duration-150 ease-out select-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${
          isDisabled
            ? 'bg-slate-300 text-slate-500 border-slate-300 shadow-none cursor-not-allowed active:translate-y-0 active:scale-100'
            : 'active:translate-y-0.5 active:scale-[0.99] cursor-pointer'
        }
        focus:outline-none focus:ring-2 focus:ring-clinical-emerald focus:ring-offset-2
        ${className}
      `}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}
      {!isLoading && leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
