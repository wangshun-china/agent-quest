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
  const base =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5E6AD2]/35 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 active:scale-[0.98]'
  const variants = {
    primary:
      'btn-primary-glow text-white hover:-translate-y-0.5',
    secondary:
      'bg-white/90 text-[#1A1A1A] border border-[#E4E6F0] shadow-sm hover:bg-white hover:border-[#C8CDE8] hover:shadow-md hover:-translate-y-0.5',
    ghost:
      'text-[#6B6B6B] hover:text-[#1A1A1A] hover:bg-white/70 rounded-xl',
  }
  const sizes = {
    sm: 'text-xs px-3.5 py-1.5 gap-1.5',
    md: 'text-sm px-4 py-2.5 gap-2',
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
