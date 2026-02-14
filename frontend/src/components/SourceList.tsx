"use client";

import type { SourceResult } from "@/hooks/useSearch";
import SourceCard from "./SourceCard";

interface SourceListProps {
  sources: SourceResult[];
}

export default function SourceList({ sources }: SourceListProps) {
  if (sources.length === 0) return null;

  return (
    <div className="mt-6">
      <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
        Sources ({sources.length})
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {sources.map((source, i) => (
          <SourceCard key={source.url} source={source} index={i + 1} />
        ))}
      </div>
    </div>
  );
}
