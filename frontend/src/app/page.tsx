"use client";

import { useSearch } from "@/hooks/useSearch";
import { useTheme } from "@/hooks/useTheme";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import LoadingState from "@/components/LoadingState";
import DomainReject from "@/components/DomainReject";
import AnswerCard from "@/components/AnswerCard";
import SourceList from "@/components/SourceList";
import RecentQueries from "@/components/RecentQueries";
import WidgetPanel, { type WidgetType } from "@/components/WidgetPanel";
import ScenarioExplorer from "@/components/ScenarioExplorer";
import MarketSnapshot from "@/components/MarketSnapshot";
import TrendChart from "@/components/TrendChart";
import CompsTable from "@/components/CompsTable";

export default function Home() {
  const {
    isLoading,
    answer,
    sources,
    confidenceScore,
    error,
    isDomainReject,
    rejectReason,
    status,
    plan,
    kpis,
    trends,
    comps,
    search,
  } = useSearch();

  const { isDark, toggle } = useTheme();

  const handleSearch = (query: string) => {
    search(query);
  };

  const allowedWidgets: WidgetType[] = [
    "market_snapshot",
    "trend_chart",
    "scenario_explorer",
    "comps_table",
    "distribution",
    "map_view",
  ];

  const widgetsToRender: WidgetType[] = (plan?.widgets ?? []).filter(
    (w: any): w is WidgetType => allowedWidgets.includes(w)
  );

  return (
    <div className="min-h-screen">
      <Header isDark={isDark} onToggleTheme={toggle} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex gap-8">
          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {/* Hero text */}
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Your Real Estate Questions, Answered
              </h2>
              <p className="text-gray-500 dark:text-gray-400">
                Powered by AI with trusted source validation and confidence scoring
              </p>
            </div>

            <SearchBar onSearch={handleSearch} isLoading={isLoading} />

            {/* Loading status */}
            <LoadingState status={status} isLoading={isLoading} />

            {process.env.NODE_ENV === "development" && plan && (
              <pre className="mt-4 text-xs opacity-80 whitespace-pre-wrap">
                {JSON.stringify(plan, null, 2)}
              </pre>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-6 p-4 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300 text-sm">
                {error}
              </div>
            )}

            {/* Domain rejection */}
            {isDomainReject && <DomainReject reason={rejectReason} />}

            {/* Streamed answer */}
            <AnswerCard
              answer={answer}
              confidenceScore={confidenceScore}
              isLoading={isLoading}
            />

            {/* Intent-based widgets */}
            {widgetsToRender.map((w) => {
              if (w === "scenario_explorer") {
                return (
                  <ScenarioExplorer
                    key={w}
                    city={plan?.location?.city}
                    state={plan?.location?.state}
                    year={plan?.timeframe?.year}
                  />
                );
              }

              if (w === "market_snapshot") {
                return (
                  <MarketSnapshot
                    key={w}
                    kpis={kpis}
                    title={
                      plan?.location?.city
                        ? `Market Snapshot \u2022 ${plan.location.city}${
                            plan.location.state ? `, ${plan.location.state}` : ""
                          }`
                        : undefined
                    }
                  />
                );
              }

              if (w === "trend_chart") {
                return <TrendChart key={w} trends={trends} />;
              }

              if (w === "comps_table") {
                return <CompsTable key={w} comps={comps} />;
              }

              return <WidgetPanel key={w} widget={w} />;
            })}

            {/* Source cards */}
            <SourceList sources={sources} />
          </div>

          {/* Sidebar – hidden on small screens */}
          <aside className="w-64 shrink-0 hidden lg:block">
            <RecentQueries onSelect={handleSearch} />
          </aside>
        </div>
      </main>
    </div>
  );
}
