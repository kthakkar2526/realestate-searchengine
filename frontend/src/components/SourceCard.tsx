"use client";

import { ExternalLink, ShieldCheck, ShieldQuestion } from "lucide-react";
import clsx from "clsx";
import type { SourceResult } from "@/hooks/useSearch";

interface SourceCardProps {
  source: SourceResult;
  index: number;
}

export default function SourceCard({ source, index }: SourceCardProps) {
  const relevancePercent = Math.round(source.composite_score * 100);

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm transition-all"
    >
      <div className="flex items-start gap-3">
        {/* Favicon */}
        <img
          src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=32`}
          alt=""
          className="w-6 h-6 rounded mt-0.5 shrink-0"
          width={24}
          height={24}
        />

        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
              [{index}] {source.title}
            </h3>
            <ExternalLink className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          </div>

          {/* Domain + trust badge */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {source.domain}
            </span>
            <span
              className={clsx(
                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium",
                source.is_trusted
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
              )}
            >
              {source.is_trusted ? (
                <ShieldCheck className="w-3 h-3" />
              ) : (
                <ShieldQuestion className="w-3 h-3" />
              )}
              {source.trust_level === "verified" ? "Verified" : "Unverified"}
            </span>
          </div>

          {/* Content snippet */}
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 line-clamp-2">
            {source.content}
          </p>

          {/* Relevance bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${relevancePercent}%` }}
              />
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
              {relevancePercent}%
            </span>
          </div>
        </div>
      </div>
    </a>
  );
}
