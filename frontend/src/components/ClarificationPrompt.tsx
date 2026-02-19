"use client";

import { useState } from "react";

interface ClarificationPromptProps {
  question: string;
  onSubmit: (answer: string) => void;
}

export default function ClarificationPrompt({ question, onSubmit }: ClarificationPromptProps) {
  const [answer, setAnswer] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim()) {
      onSubmit(answer.trim());
    }
  };

  return (
    <div className="mt-6 p-5 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950">
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-1">
        Need a bit more info
      </p>
      <p className="text-sm text-amber-700 dark:text-amber-400 mb-4">{question}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="Type your answer..."
          autoFocus
          className="flex-1 px-3 py-2 text-sm rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          type="submit"
          disabled={!answer.trim()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors"
        >
          Search
        </button>
      </form>
    </div>
  );
}
