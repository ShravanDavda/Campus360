import React from 'react';
import { cn } from '../../lib/utils';

export const Input = React.forwardRef(({ className, type = "text", error, ...props }, ref) => {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-10 w-full rounded border bg-white px-3 py-2 text-sm text-gray-900 transition-colors",
        "placeholder:text-gray-400",
        "focus:outline-none focus:ring-1 focus:ring-[#714B67] focus:border-[#714B67]",
        "disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-500",
        error
          ? "border-red-500 focus:ring-red-500 focus:border-red-500"
          : "border-gray-300 hover:border-gray-400",
        className
      )}
      {...props}
    />
  );
});

Input.displayName = "Input";
