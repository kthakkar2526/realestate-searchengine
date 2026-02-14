"use client";

import type { SourceResult } from "@/hooks/useSearch";

function daysAgo(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

export default function FreshnessMeter({ sources }: { sources: SourceResult[] }) {
  const withDates = sources.filter((s) => s.published_date);
  const unknown = sources.length - withDates.length;

  const buckets = { fresh: 0, medium: 0, stale: 0 };
  let newestDays: number | null = null;

  for (const s of withDates) {
    const d = daysAgo(s.published_date as string);
    if (newestDays === null || d < newestDays) newestDays = d;

    if (d <= 30) buckets.fresh += 1;
    else if (d <= 180) buckets.medium += 1;
    else buckets.stale += 1;
  }

  const totalKnown = withDates.length || 1;
  const freshPct = Math.round((buckets.fresh / totalKnown) * 100);
  const medPct = Math.round((buckets.medium / totalKnown) * 100);
  const stalePct = Math.max(0, 100 - freshPct - medPct);

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Source Freshness
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Newest: {newestDays === null ? "Unknown" : `${newestDays}d ago`}
        </span>
      </div>

      {/* Simple bar */}
      <div className="h-3 w-full rounded-full overflow-hidden border border-gray-200 dark:border-gray-800">
        <div className="h-full flex">
          <div className="h-full bg-green-500" style={{ width: `${freshPct}%` }} />
          <div className="h-full bg-yellow-500" style={{ width: `${medPct}%` }} />
          <div className="h-full bg-red-500" style={{ width: `${stalePct}%` }} />
        </div>
      </div>

      <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
        <div>Fresh (≤30d): {buckets.fresh}</div>
        <div>Recent (31–180d): {buckets.medium}</div>
        <div>Old (&gt;180d): {buckets.stale}</div>
        <div>Unknown date: {unknown}</div>
      </div>
    </div>
  );
}