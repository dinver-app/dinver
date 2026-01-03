'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    const variants = {
      primary: 'bg-dinver-green text-white hover:bg-dinver-green-dark focus:ring-dinver-green shadow-lg hover:shadow-xl hover:-translate-y-0.5',
      secondary: 'bg-dinver-dark text-white hover:bg-dinver-dark-light focus:ring-dinver-dark shadow-lg hover:shadow-xl hover:-translate-y-0.5',
      outline: 'border-2 border-dinver-green text-dinver-green hover:bg-dinver-green hover:text-white focus:ring-dinver-green',
      ghost: 'text-gray-700 hover:bg-gray-100 focus:ring-gray-300',
    };

    const sizes = {
      sm: 'px-4 py-2 text-sm',
      md: 'px-6 py-3 text-base',
      lg: 'px-8 py-4 text-lg',
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
