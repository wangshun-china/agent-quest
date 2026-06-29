import { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-medium rounded-lg transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#5E6AD2]/30 disabled:opacity-40 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-[#5E6AD2] text-white hover:bg-[#4F5ABF]',
    secondary: 'bg-white text-[#1A1A1A] border border-[#E5E5E5] hover:bg-[#F5F5F5]',
    ghost: 'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-[#F5F5F5]',
  }
  const sizes = {
    sm: 'text-xs px-3 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2 gap-2',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}