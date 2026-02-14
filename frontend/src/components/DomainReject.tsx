"use client";

import { ShieldX } from "lucide-react";

interface DomainRejectProps {
  reason: string;
}

export default function DomainReject({ reason }: DomainRejectProps) {
  return (
    <div className="mt-6 p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <ShieldX className="w-6 h-6 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <div>
          <h3 className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
            Outside Our Scope
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            {reason}
          </p>
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Try asking about property values, mortgages, buying or selling homes,
            real estate markets, home inspections, or housing regulations.
          </p>
        </div>
      </div>
    </div>
  );
}
