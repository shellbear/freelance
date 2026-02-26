"use client";

import type { StatsData, TechnologyData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface TerminalTickerProps {
  stats: StatsData | null;
  technologies: TechnologyData[] | null;
}

export function TerminalTicker({ stats, technologies }: TerminalTickerProps) {
  if (!stats) return null;

  const items = [
    {
      label: "OFFERS",
      value: formatNumber(stats.totalOffers),
      trend: stats.offersTrend,
    },
    {
      label: "AVG TJM",
      value: `${Math.round(stats.avgMinRate)}-${Math.round(stats.avgMaxRate)}EUR`,
      trend: stats.rateTrend,
    },
    {
      label: "MEDIAN",
      value: `${Math.round(stats.medianMinRate)}-${Math.round(stats.medianMaxRate)}EUR`,
      trend: null,
    },
    {
      label: "TOP",
      value: stats.topTechnology?.toUpperCase() || "N/A",
      trend: null,
    },
    ...(technologies?.slice(0, 5).map((t) => ({
      label: t.job.toUpperCase(),
      value: formatNumber(t.count),
      trend: null as number | null,
    })) || []),
  ];

  const strip = items.map((item, i) => (
    <span key={i} className="mx-6 inline-flex items-center gap-2 whitespace-nowrap">
      <span style={{ color: "var(--term-amber)" }}>{item.label}:</span>
      <span className="font-bold" style={{ color: "var(--term-white)" }}>
        {item.value}
      </span>
      {item.trend != null && (
        <span
          style={{
            color: item.trend >= 0 ? "var(--term-green)" : "var(--term-red)",
          }}
        >
          {item.trend >= 0 ? "+" : ""}
          {item.trend.toFixed(1)}%
        </span>
      )}
    </span>
  ));

  return (
    <div
      className="overflow-hidden py-1.5"
      style={{
        background: "var(--term-bg)",
        borderBottom: "1px solid var(--term-border)",
      }}
    >
      <div className="terminal-ticker flex text-xs">
        {strip}
        {strip}
      </div>
    </div>
  );
}
