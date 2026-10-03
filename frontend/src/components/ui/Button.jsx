import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const Button = React.forwardRef(({
  className,
  variant = "primary",
  size = "default",
  isLoading = false,
  disabled = false,
  children,
  type = "button",
  ...props
}, ref) => {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#714B67] focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 select-none rounded";

  const variants = {
    primary: "bg-[#714B67] text-white hover:bg-[#5d3d54] active:bg-[#4a2e43] border border-transparent shadow-sm",
    secondary: "bg-[#017E84] text-white hover:bg-[#01686d] active:bg-[#01565b] border border-transparent shadow-sm",
    gold: "bg-[#E4A900] text-black font-semibold hover:bg-[#cc9700] active:bg-[#b38400] border border-transparent shadow-sm",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 active:bg-gray-100",
    ghost: "text-gray-700 hover:bg-gray-100",
  };

  const sizes = {
    default: "h-10 px-4 py-2 text-sm",
    sm: "h-8 px-3 text-xs",
    lg: "h-11 px-6 text-base",
  };

  return (
    <button
      type={type}
      ref={ref}
      disabled={disabled || isLoading}
      className={cn(baseStyles, variants[variant], sizes[size], className)}
      {...props}
    >
      {isLoading && (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
});

Button.displayName = "Button";
