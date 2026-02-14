"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import clsx from "clsx";
import type { TrendMetric } from "@/hooks/useSearch";

function formatValue(value: number, unit: string): string {
  if (unit === "$") {
    if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
    if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (unit === "%") return `${value.toFixed(1)}%`;
  return `${value.toFixed(0)}${unit}`;
}

function Bar({
  label,
  value,
  maxValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  color: string;
}) {
  const pct = maxValue > 0 ? Math.max((value / maxValue) * 100, 2) : 2;

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right shrink-0">
        {label}
      </span>
      <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
        <div
          className={clsx("h-full rounded transition-all duration-500", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function TrendChart({ trends }: { trends: TrendMetric[] }) {
  if (!trends || trends.length === 0) return null;

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Current vs Last Year
        </h3>
        <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-blue-500" /> Current
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-gray-300 dark:bg-gray-600" /> Previous
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {trends.map((metric) => {
          const current = metric.current ?? 0;
          const previous = metric.previous ?? 0;
          const maxValue = Math.max(current, previous, 1);
          const isUp = current > previous;

          return (
            <div key={metric.label}>
              {/* Metric label + change badge */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {metric.label}
                </span>
                {metric.change_pct !== null && (
                  <span
                    className={clsx(
                      "flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
                      isUp
                        ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                        : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                    )}
                  >
                    {isUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {isUp ? "+" : ""}
                    {metric.change_pct.toFixed(1)}%
                  </span>
                )}
              </div>

              {/* Bar pair */}
              <div className="space-y-1">
                <Bar
                  label={formatValue(current, metric.unit)}
                  value={current}
                  maxValue={maxValue}
                  color="bg-blue-500"
                />
                <Bar
                  label={formatValue(previous, metric.unit)}
                  value={previous}
                  maxValue={maxValue}
                  color="bg-gray-300 dark:bg-gray-600"
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
