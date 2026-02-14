"use client";

export type WidgetType =
  | "market_snapshot"
  | "trend_chart"
  | "scenario_explorer"
  | "comps_table"
  | "distribution"
  | "map_view";

export default function WidgetPanel({ widget }: { widget: WidgetType }) {
  const titleMap: Record<WidgetType, string> = {
    market_snapshot: "Market Snapshot",
    trend_chart: "Trend Chart",
    scenario_explorer: "Scenario Explorer",
    comps_table: "Comps & Similar Homes",
    distribution: "Price / Rent Distribution",
    map_view: "Map View",
  };

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          {titleMap[widget]}
        </h3>
        <span className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
          Coming soon
        </span>
      </div>

      <p className="text-sm text-gray-700 dark:text-gray-300">
        This panel will render <span className="font-mono">{widget}</span> once
        data is available.
      </p>
    </div>
  );
}