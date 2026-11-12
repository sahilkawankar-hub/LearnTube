import React from 'react';

interface PillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'olive' | 'outline' | 'sage' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const PillButton: React.FC<PillButtonProps> = ({
  variant = 'olive',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 rounded-full font-medium transition-all duration-150 ease-out cursor-pointer select-none whitespace-nowrap shrink-0 hover:-translate-y-[1.5px] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#435624] disabled:opacity-50 disabled:pointer-events-none';

  const variantStyles = {
    olive:
      'bg-[#435624] text-white hover:bg-[#36461C] hover:shadow-[0_6px_16px_rgba(67,86,36,0.22)]',
    outline:
      'bg-white text-[#181A16] border border-[#EAE8DF] hover:bg-[#F6F5EE] hover:border-[#C8D1B1] hover:shadow-[0_4px_12px_rgba(24,26,22,0.06)]',
    sage:
      'bg-[#E2E8CE] text-[#435624] hover:bg-[#d5dec0] hover:shadow-[0_4px_12px_rgba(67,86,36,0.12)]',
    ghost:
      'bg-transparent text-[#6B6E65] hover:bg-[#EAE8DF]/60 hover:text-[#181A16]',
  };

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-xs',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-6 py-3 text-sm',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${
        fullWidth ? 'w-full' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
