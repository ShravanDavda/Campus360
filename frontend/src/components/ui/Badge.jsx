import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, variant, className }) {
  const normalized = String(children || '').toUpperCase();

  let styles = "bg-gray-100 text-gray-700 border-gray-200";

  if (variant === 'purple' || normalized === 'PLACED' || normalized === 'MEMBERSHIP_DUES') {
    styles = "bg-[#714B67]/10 text-[#714B67] border-[#714B67]/25";
  } else if (variant === 'teal' || normalized === 'ACTIVE' || normalized === 'PAID' || normalized === 'PUBLISHED' || normalized === 'CHECKED_IN' || normalized === 'EVENT_TICKET' || normalized === 'AVAILABLE') {
    styles = "bg-[#017E84]/10 text-[#017E84] border-[#017E84]/25";
  } else if (variant === 'gold' || normalized === 'PENDING' || normalized === 'MERCHANDISE_ORDER' || normalized === 'LOW_STOCK') {
    styles = "bg-[#E4A900]/15 text-[#8a6500] border-[#E4A900]/30";
  } else if (variant === 'danger' || normalized === 'CANCELLED' || normalized === 'FAILED' || normalized === 'OUT_OF_STOCK') {
    styles = "bg-red-50 text-red-700 border-red-200";
  } else if (variant === 'gray' || normalized === 'EXPIRED' || normalized === 'NOT_CHECKED_IN') {
    styles = "bg-gray-100 text-gray-600 border-gray-200";
  }

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded text-xs font-semibold border tracking-wide uppercase",
        styles,
        className
      )}
    >
      {children}
    </span>
  );
}
