import React from 'react';
import { AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '../../lib/utils';

export function Alert({ variant = "error", title, children, className }) {
  const configs = {
    error: {
      container: "bg-[#fdf3f2] border-[#f5c6cb] text-[#721c24]",
      icon: <AlertCircle className="h-5 w-5 text-[#dc3545] shrink-0 mt-0.5" aria-hidden="true" />,
    },
    success: {
      container: "bg-[#f0f9f8] border-[#c3e6e3] text-[#0f5132]",
      icon: <CheckCircle2 className="h-5 w-5 text-[#017E84] shrink-0 mt-0.5" aria-hidden="true" />,
    },
    info: {
      container: "bg-[#f8f9fa] border-[#d1d5db] text-[#383d41]",
      icon: <Info className="h-5 w-5 text-[#714B67] shrink-0 mt-0.5" aria-hidden="true" />,
    }
  };

  const current = configs[variant] || configs.info;

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live="polite"
      className={cn(
        "flex items-start gap-3 p-3.5 rounded border text-sm",
        current.container,
        className
      )}
    >
      {current.icon}
      <div className="flex-1">
        {title && <h5 className="font-semibold text-sm mb-0.5">{title}</h5>}
        <div className="text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
