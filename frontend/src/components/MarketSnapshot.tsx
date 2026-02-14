"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import clsx from "clsx";
import type { MarketKPIs, KPIValue } from "@/hooks/useSearch";

const DISPLAY_ORDER: { key: keyof MarketKPIs; fallbackLabel: string }[] = [
  { key: "median_price", fallbackLabel: "Median Price" },
  { key: "yoy_price_change", fallbackLabel: "YoY Price Change" },
  { key: "price_per_sqft", fallbackLabel: "Price / Sqft" },
  { key: "active_listings", fallbackLabel: "Active Listings" },
  { key: "days_on_market", fallbackLabel: "Days on Market" },
  { key: "sale_to_list_ratio", fallbackLabel: "Sale-to-List" },
  { key: "inventory_change", fallbackLabel: "Inventory Change" },
  { key: "median_rent", fallbackLabel: "Median Rent" },
];

function DirectionIcon({ direction }: { direction: KPIValue["direction"] }) {
  if (direction === "up")
    return <TrendingUp className="w-4 h-4 text-green-600 dark:text-green-400" />;
  if (direction === "down")
    return <TrendingDown className="w-4 h-4 text-red-500 dark:text-red-400" />;
  if (direction === "flat")
    return <Minus className="w-4 h-4 text-gray-400" />;
  return null;
}

export default function MarketSnapshot({
  kpis,
  title,
}: {
  kpis: MarketKPIs | null;
  title?: string;
}) {
  if (!kpis) return null;

  // Only show tiles that have a value
  const tiles = DISPLAY_ORDER.map(({ key, fallbackLabel }) => {
    const kpi = kpis[key];
    if (!kpi || !kpi.value) return null;
    return { ...kpi, label: kpi.label || fallbackLabel };
  }).filter(Boolean) as KPIValue[];

  if (tiles.length === 0) return null;

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {title ?? "Market Snapshot"}
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          AI-extracted from sources
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className={clsx(
              "p-4 rounded-lg border",
              tile.direction === "up" && "border-green-200 dark:border-green-900 bg-green-50/50 dark:bg-green-950/30",
              tile.direction === "down" && "border-red-200 dark:border-red-900 bg-red-50/50 dark:bg-red-950/30",
              tile.direction !== "up" && tile.direction !== "down" && "border-gray-200 dark:border-gray-800",
            )}
          >
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
              {tile.label}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-gray-900 dark:text-white">
                {tile.value}
              </span>
              <DirectionIcon direction={tile.direction} />
            </div>
            {tile.detail && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {tile.detail}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
