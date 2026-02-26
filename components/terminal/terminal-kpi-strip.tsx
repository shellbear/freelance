"use client";

import type { StatsData, TechnologyData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface TerminalKpiStripProps {
  stats: StatsData | null;
  technologies: TechnologyData[] | null;
  totalOfferCount: number;
}

function computeHeatIndex(offersTrend: number, rateTrend: number): number {
  const raw = 50 + offersTrend * 0.3 + rateTrend * 0.7;
  return Math.max(0, Math.min(100, raw));
}

function computeConcentration(
  technologies: TechnologyData[] | null,
  total: number
): number {
  if (!technologies || total === 0) return 0;
  const top5Sum = technologies
    .slice(0, 5)
    .reduce((sum, t) => sum + t.count, 0);
  return (top5Sum / total) * 100;
}

export function TerminalKpiStrip({
  stats,
  technologies,
  totalOfferCount,
}: TerminalKpiStripProps) {
  if (!stats) {
    return (
      <div
        className="flex h-8 items-center px-4"
        style={{
          background: "var(--term-panel)",
          borderBottom: "1px solid var(--term-border)",
        }}
      >
        <span className="terminal-loading h-4 w-full" />
      </div>
    );
  }

  const spread = Math.round(stats.avgMaxRate - stats.avgMinRate);
  const heat = computeHeatIndex(stats.offersTrend, stats.rateTrend);
  const concentration = computeConcentration(technologies, totalOfferCount);

  const kpis = [
    {
      label: "OFFERS",
      value: formatNumber(stats.totalOffers),
      trend: stats.offersTrend,
    },
    {
      label: "TJM",
      value: `${Math.round(stats.avgMinRate)}-${Math.round(stats.avgMaxRate)}`,
      trend: stats.rateTrend,
    },
    {
      label: "MEDIAN",
      value: `${Math.round(stats.medianMinRate)}-${Math.round(stats.medianMaxRate)}`,
      trend: null,
    },
    { label: "SPREAD", value: `${spread}EUR`, trend: null },
    {
      label: "HEAT",
      value: heat.toFixed(0),
      trend: null,
      color:
        heat > 60
          ? "var(--term-green)"
          : heat < 40
            ? "var(--term-red)"
            : "var(--term-amber)",
    },
    {
      label: "TOP5 CONC",
      value: `${concentration.toFixed(1)}%`,
      trend: null,
    },
    { label: "TOP", value: stats.topTechnology?.toUpperCase() || "N/A", trend: null },
  ];

  return (
    <div
      className="flex items-center gap-0 overflow-x-auto"
      style={{
        background: "var(--term-panel)",
        borderBottom: "1px solid var(--term-border)",
      }}
    >
      {kpis.map((kpi, i) => (
        <div
          key={i}
          className="flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5"
          style={{
            borderRight:
              i < kpis.length - 1
                ? "1px solid var(--term-border)"
                : undefined,
          }}
        >
          <span
            className="text-[10px] font-bold tracking-wider"
            style={{ color: "var(--term-muted)" }}
          >
            {kpi.label}
          </span>
          <span
            className="text-xs font-bold"
            style={{ color: kpi.color || "var(--term-white)" }}
          >
            {kpi.value}
          </span>
          {kpi.trend != null && (
            <span
              className="text-[10px] font-bold"
              style={{
                color:
                  kpi.trend >= 0 ? "var(--term-green)" : "var(--term-red)",
              }}
            >
              {kpi.trend >= 0 ? "+" : ""}
              {kpi.trend.toFixed(1)}%
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
