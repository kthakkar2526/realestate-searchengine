"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";

// ---------------------------------------------------------------------------
// State-level property tax rates (% of home value per year)
// Source: Tax Foundation averages — only the most-queried states included.
// Falls back to 1.1% (US median) for unlisted states.
// ---------------------------------------------------------------------------
const STATE_TAX_RATES: Record<string, number> = {
  AL: 0.41, AK: 1.19, AZ: 0.62, AR: 0.62, CA: 0.74,
  CO: 0.51, CT: 2.14, DE: 0.57, FL: 0.89, GA: 0.92,
  HI: 0.28, ID: 0.69, IL: 2.27, IN: 0.85, IA: 1.57,
  KS: 1.41, KY: 0.86, LA: 0.55, ME: 1.36, MD: 1.09,
  MA: 1.23, MI: 1.54, MN: 1.12, MS: 0.81, MO: 0.97,
  MT: 0.84, NE: 1.73, NV: 0.60, NH: 2.18, NJ: 2.49,
  NM: 0.80, NY: 1.72, NC: 0.84, ND: 0.98, OH: 1.56,
  OK: 0.90, OR: 0.97, PA: 1.36, RI: 1.63, SC: 0.57,
  SD: 1.31, TN: 0.71, TX: 1.80, UT: 0.63, VT: 1.90,
  VA: 0.82, WA: 0.98, WV: 0.58, WI: 1.85, WY: 0.61,
  DC: 0.56,
};

const US_MEDIAN_TAX_RATE = 1.1;
const DEFAULT_INSURANCE_YEARLY = 1200;
const PMI_RATE = 0.007; // 0.7% of loan per year (mid-range)

function monthlyPayment(principal: number, annualRatePct: number, termYears: number) {
  const r = annualRatePct / 100 / 12;
  const n = termYears * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

function fmt(val: number): string {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `$${(val / 1_000).toFixed(0)}K`;
  return `$${val.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function ScenarioExplorer({
  city,
  state,
  year,
}: {
  city: string | null;
  state: string | null;
  year: number | null;
}) {
  // Inputs
  const [homePrice, setHomePrice] = useState(260000);
  const [rent, setRent] = useState(1800);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(6.5);
  const [termYears, setTermYears] = useState(30);
  const [insuranceYearly, setInsuranceYearly] = useState(DEFAULT_INSURANCE_YEARLY);
  const [compareYears, setCompareYears] = useState(10);

  // Derived property tax rate from state prop
  const taxRate = useMemo(() => {
    if (!state) return US_MEDIAN_TAX_RATE;
    const key = state.trim().toUpperCase().slice(0, 2);
    return STATE_TAX_RATES[key] ?? US_MEDIAN_TAX_RATE;
  }, [state]);

  // Core calculations
  const calc = useMemo(() => {
    const downPayment = (homePrice * downPct) / 100;
    const loanAmount = Math.max(homePrice - downPayment, 0);
    const mortgagePnI = monthlyPayment(loanAmount, rate, termYears);

    const monthlyTax = (homePrice * (taxRate / 100)) / 12;
    const monthlyInsurance = insuranceYearly / 12;
    const needsPMI = downPct < 20;
    const monthlyPMI = needsPMI ? (loanAmount * PMI_RATE) / 12 : 0;

    const totalMonthly = mortgagePnI + monthlyTax + monthlyInsurance + monthlyPMI;

    // Rent vs Buy cumulative over N years
    // Renting: rent * 12 * years (simplified — no rent increases)
    // Buying: down payment + (total monthly * 12 * years)
    const rentTotal = rent * 12 * compareYears;
    const buyTotal = downPayment + totalMonthly * 12 * compareYears;

    const breakevenMonths = (() => {
      const monthlyDiff = rent - totalMonthly;
      if (monthlyDiff <= 0) return null;
      return Math.ceil(downPayment / monthlyDiff);
    })();

    return {
      downPayment,
      loanAmount,
      mortgagePnI,
      monthlyTax,
      monthlyInsurance,
      needsPMI,
      monthlyPMI,
      totalMonthly,
      rentTotal,
      buyTotal,
      breakevenMonths,
    };
  }, [homePrice, downPct, rate, termYears, taxRate, insuranceYearly, rent, compareYears]);

  const inputClass =
    "mt-1 w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="mt-6 p-6 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
          Scenario Explorer {city ? `\u2022 ${city}` : ""}{state ? `, ${state}` : ""}{year ? ` \u2022 ${year}` : ""}
        </h3>
        <span className="text-xs px-2 py-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">
          Interactive
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ---- LEFT: Inputs ---- */}
        <div className="space-y-3">
          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Home price ($)
            <input type="number" value={homePrice} onChange={(e) => setHomePrice(Number(e.target.value))} className={inputClass} />
          </label>

          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Monthly rent ($)
            <input type="number" value={rent} onChange={(e) => setRent(Number(e.target.value))} className={inputClass} />
          </label>

          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Down payment (%)
            <input type="number" value={downPct} min={0} max={100} step={1} onChange={(e) => setDownPct(Number(e.target.value))} className={inputClass} />
          </label>

          <label className="block text-sm text-gray-700 dark:text-gray-300">
            Interest rate (%)
            <input type="number" value={rate} step={0.05} onChange={(e) => setRate(Number(e.target.value))} className={inputClass} />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm text-gray-700 dark:text-gray-300">
              Term (years)
              <select value={termYears} onChange={(e) => setTermYears(Number(e.target.value))} className={inputClass}>
                <option value={15}>15</option>
                <option value={20}>20</option>
                <option value={30}>30</option>
              </select>
            </label>

            <label className="block text-sm text-gray-700 dark:text-gray-300">
              Insurance ($/yr)
              <input type="number" value={insuranceYearly} step={100} onChange={(e) => setInsuranceYearly(Number(e.target.value))} className={inputClass} />
            </label>
          </div>
        </div>

        {/* ---- RIGHT: Outputs ---- */}
        <div className="space-y-3">
          {/* Monthly breakdown */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 space-y-2">
            <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              Monthly Breakdown
            </div>
            <Row label="Principal & Interest" value={`$${calc.mortgagePnI.toFixed(0)}`} />
            <Row label={`Property Tax (${taxRate}%)`} value={`$${calc.monthlyTax.toFixed(0)}`} />
            <Row label="Homeowners Insurance" value={`$${calc.monthlyInsurance.toFixed(0)}`} />
            {calc.needsPMI && (
              <Row label="PMI (down < 20%)" value={`$${calc.monthlyPMI.toFixed(0)}`} accent />
            )}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-2 mt-2 flex justify-between text-sm font-semibold text-gray-900 dark:text-white">
              <span>Total Monthly</span>
              <span>${calc.totalMonthly.toFixed(0)}/mo</span>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3">
            <Tile label="Down Payment" value={fmt(calc.downPayment)} />
            <Tile label="Loan Amount" value={fmt(calc.loanAmount)} />
          </div>

          {/* Breakeven */}
          <div className="p-4 rounded-lg border border-gray-200 dark:border-gray-800">
            <div className="text-xs text-gray-500 dark:text-gray-400">Buy vs Rent Breakeven</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {calc.breakevenMonths
                ? calc.breakevenMonths >= 12
                  ? `${(calc.breakevenMonths / 12).toFixed(1)} years`
                  : `${calc.breakevenMonths} months`
                : "Renting is cheaper"}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Months until down-payment cost is recovered by saving vs renting
            </div>
          </div>
        </div>
      </div>

      {/* ---- BOTTOM: Rent vs Buy Comparison ---- */}
      <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Cumulative Cost Comparison
          </div>
          <label className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
            Over
            <select
              value={compareYears}
              onChange={(e) => setCompareYears(Number(e.target.value))}
              className="rounded border border-gray-200 dark:border-gray-700 bg-transparent px-2 py-1 text-xs"
            >
              {[3, 5, 7, 10, 15, 20, 30].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            years
          </label>
        </div>

        <ComparisonBar label="Renting" value={calc.rentTotal} max={Math.max(calc.rentTotal, calc.buyTotal)} color="bg-orange-400" />
        <ComparisonBar label="Buying" value={calc.buyTotal} max={Math.max(calc.rentTotal, calc.buyTotal)} color="bg-blue-500" />

        <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          {calc.buyTotal < calc.rentTotal ? (
            <span className="text-green-600 dark:text-green-400 font-medium">
              Buying saves {fmt(calc.rentTotal - calc.buyTotal)} over {compareYears} years
            </span>
          ) : calc.buyTotal > calc.rentTotal ? (
            <span className="text-orange-600 dark:text-orange-400 font-medium">
              Renting saves {fmt(calc.buyTotal - calc.rentTotal)} over {compareYears} years
            </span>
          ) : (
            <span>Roughly equal over {compareYears} years</span>
          )}
          {" "}&bull; Simplified: no rent increases, appreciation, or tax deductions
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex justify-between text-sm">
      <span className={clsx("text-gray-600 dark:text-gray-400", accent && "text-amber-600 dark:text-amber-400")}>
        {label}
      </span>
      <span className={clsx("font-medium text-gray-800 dark:text-gray-200", accent && "text-amber-600 dark:text-amber-400")}>
        {value}
      </span>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-800">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-base font-semibold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

function ComparisonBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.max((value / max) * 100, 4) : 4;
  return (
    <div className="flex items-center gap-3 mb-2">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right shrink-0">{label}</span>
      <div className="flex-1 h-7 bg-gray-100 dark:bg-gray-800 rounded overflow-hidden relative">
        <div className={clsx("h-full rounded transition-all duration-500", color)} style={{ width: `${pct}%` }} />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-700 dark:text-gray-300">
          {fmt(value)}
        </span>
      </div>
    </div>
  );
}
