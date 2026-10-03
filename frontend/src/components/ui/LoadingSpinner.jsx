import React from 'react';
import { Loader2 } from 'lucide-react';

export function LoadingSpinner({ message = 'Loading details...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Loader2 className="h-8 w-8 text-[#714B67] animate-spin mb-3" aria-hidden="true" />
      <p className="text-sm font-medium text-[#666666]">{message}</p>
    </div>
  );
}
