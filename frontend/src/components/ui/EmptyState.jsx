import React from 'react';
import { Inbox } from 'lucide-react';

export function EmptyState({ icon: Icon = Inbox, title = 'No records found', description, action }) {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white border border-[#e2e5e9] rounded-lg">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#714B67]/10 text-[#714B67] mb-3">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-[#000000] mb-1">{title}</h3>
      {description && <p className="text-sm text-[#666666] max-w-sm mb-4">{description}</p>}
      {action && <div>{action}</div>}
    </div>
  );
}
