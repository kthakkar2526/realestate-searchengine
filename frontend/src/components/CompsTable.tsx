"use client";

import { ExternalLink } from "lucide-react";
import type { CompListing } from "@/hooks/useSearch";

export default function CompsTable({ comps }: { comps: CompListing[] }) {
  if (!comps || comps.length === 0) return null;

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Comparable Listings
        </h3>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {comps.length} found
        </span>
      </div>

      {/* Desktop: table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 text-left text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              <th className="pb-2 pr-4 font-medium">Address</th>
              <th className="pb-2 pr-4 font-medium">Price</th>
              <th className="pb-2 pr-4 font-medium">Sqft</th>
              <th className="pb-2 pr-4 font-medium">Beds</th>
              <th className="pb-2 pr-4 font-medium">Baths</th>
              <th className="pb-2 pr-4 font-medium">Status</th>
              <th className="pb-2 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {comps.map((comp, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <td className="py-3 pr-4 text-gray-800 dark:text-gray-200 font-medium max-w-[240px] truncate">
                  {comp.address ?? "—"}
                </td>
                <td className="py-3 pr-4 text-gray-900 dark:text-white font-semibold whitespace-nowrap">
                  {comp.price ?? "—"}
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {comp.sqft ?? "—"}
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  {comp.beds ?? "—"}
                </td>
                <td className="py-3 pr-4 text-gray-600 dark:text-gray-400">
                  {comp.baths ?? "—"}
                </td>
                <td className="py-3 pr-4">
                  {comp.status ? (
                    <StatusBadge status={comp.status} />
                  ) : (
                    "—"
                  )}
                </td>
                <td className="py-3">
                  {comp.source_url && (
                    <a
                      href={comp.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 dark:text-blue-400"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: card stack */}
      <div className="md:hidden space-y-3">
        {comps.map((comp, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2"
          >
            <div className="flex items-start justify-between gap-2">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                {comp.address ?? "Unknown address"}
              </span>
              {comp.source_url && (
                <a
                  href={comp.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 shrink-0"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-sm">
              {comp.price && (
                <span className="font-semibold text-gray-900 dark:text-white">{comp.price}</span>
              )}
              {comp.sqft && (
                <span className="text-gray-500 dark:text-gray-400">{comp.sqft} sqft</span>
              )}
              {comp.beds && (
                <span className="text-gray-500 dark:text-gray-400">{comp.beds} bed</span>
              )}
              {comp.baths && (
                <span className="text-gray-500 dark:text-gray-400">{comp.baths} bath</span>
              )}
            </div>
            {comp.status && <StatusBadge status={comp.status} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const lower = status.toLowerCase();
  const isActive = lower.includes("active") || lower.includes("for sale");
  const isSold = lower.includes("sold") || lower.includes("closed");
  const isPending = lower.includes("pending") || lower.includes("contract");

  const colors = isActive
    ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
    : isSold
      ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
      : isPending
        ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
        : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400";

  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${colors}`}>
      {status}
    </span>
  );
}
