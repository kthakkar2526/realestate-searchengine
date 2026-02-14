"use client";

import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  status: string;
  isLoading: boolean;
}

export default function LoadingState({ status, isLoading }: LoadingStateProps) {
  if (!isLoading || !status) return null;

  return (
    <div className="flex items-center gap-3 mt-6 px-4 py-3 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
      <Loader2 className="w-5 h-5 text-blue-600 dark:text-blue-400 animate-spin" />
      <span className="text-sm text-blue-700 dark:text-blue-300">{status}</span>
    </div>
  );
}
