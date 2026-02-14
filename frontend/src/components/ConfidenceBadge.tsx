"use client";

import clsx from "clsx";

interface ConfidenceBadgeProps {
  score: number;
}

export default function ConfidenceBadge({ score }: ConfidenceBadgeProps) {
  const rounded = Math.round(score);

  const colorClass = clsx({
    "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200": rounded >= 70,
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200":
      rounded >= 40 && rounded < 70,
    "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200": rounded < 40,
  });

  const label = rounded >= 70 ? "High" : rounded >= 40 ? "Medium" : "Low";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold",
        colorClass
      )}
      title={`Confidence score: ${rounded}/100 based on source trustworthiness, relevance, and recency`}
    >
      <span className="tabular-nums">{rounded}/100</span>
      <span className="opacity-75">{label}</span>
    </span>
  );
}
