"use client";

import ConfidenceBadge from "./ConfidenceBadge";

interface AnswerCardProps {
  answer: string;
  confidenceScore: number | null;
  isLoading: boolean;
}

export default function AnswerCard({
  answer,
  confidenceScore,
  isLoading,
}: AnswerCardProps) {
  if (!answer && !isLoading) return null;

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      {/* Header row: title + confidence badge */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Answer
        </h2>
        {confidenceScore !== null && (
          <ConfidenceBadge score={confidenceScore} />
        )}
      </div>

      {/* Answer text */}
      <div className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
        {answer}
        {/* Blinking cursor while still streaming */}
        {isLoading && (
          <span className="inline-block w-2 h-5 ml-0.5 bg-blue-500 animate-pulse rounded-sm align-text-bottom" />
        )}
      </div>
    </div>
  );
}
