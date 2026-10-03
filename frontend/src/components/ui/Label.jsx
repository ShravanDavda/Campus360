import React from 'react';
import { cn } from '../../lib/utils';

export const Label = React.forwardRef(({ className, children, required, ...props }, ref) => {
  return (
    <label
      ref={ref}
      className={cn(
        "block text-sm font-medium text-gray-800 mb-1.5",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-[#c0392b] ml-1" aria-hidden="true">*</span>}
    </label>
  );
});

Label.displayName = "Label";
