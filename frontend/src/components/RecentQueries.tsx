"use client";

import { useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface RecentQueriesProps {
  onSelect: (query: string) => void;
}

export default function RecentQueries({ onSelect }: RecentQueriesProps) {
  const [queries, setQueries] = useState<string[]>([]);

  useEffect(() => {
    async function fetchPopular() {
      try {
        const res = await fetch(`${API_URL}/api/popular`);
        if (res.ok) {
          const data = await res.json();
          setQueries(data.queries || []);
        }
      } catch {
        // Redis may not be configured – silently ignore
      }
    }
    fetchPopular();
  }, []);

  if (queries.length === 0) return null;

  return (
    <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Popular
        </h3>
      </div>
      <ul className="space-y-2">
        {queries.map((q) => (
          <li key={q}>
            <button
              onClick={() => onSelect(q)}
              className="text-left text-sm text-blue-600 dark:text-blue-400 hover:underline line-clamp-2 w-full"
            >
              {q}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
