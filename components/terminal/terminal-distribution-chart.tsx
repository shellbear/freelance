"use client";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { RateDistributionData } from "@/lib/types";
import {
  TERM_COLORS,
  terminalAxisProps,
  terminalGridProps,
  terminalTooltipStyle,
} from "./terminal-chart-theme";

interface TerminalDistributionChartProps {
  data: RateDistributionData[] | null;
}

export function TerminalDistributionChart({
  data,
}: TerminalDistributionChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="terminal-panel flex h-full items-center justify-center">
        <span className="text-xs" style={{ color: "var(--term-muted)" }}>
          NO DISTRIBUTION DATA
        </span>
      </div>
    );
  }

  return (
    <div className="terminal-panel flex h-full flex-col">
      <div
        className="px-3 py-1.5"
        style={{ borderBottom: "1px solid var(--term-border)" }}
      >
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color: "var(--term-amber)" }}
        >
          RATE DISTRIBUTION (EUR/DAY)
        </span>
      </div>
      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid {...terminalGridProps} />
            <XAxis
              dataKey="bucket"
              {...terminalAxisProps}
              angle={-45}
              textAnchor="end"
              height={50}
              interval={0}
            />
            <YAxis {...terminalAxisProps} />
            <Tooltip
              contentStyle={terminalTooltipStyle.contentStyle}
              labelStyle={terminalTooltipStyle.labelStyle}
              itemStyle={terminalTooltipStyle.itemStyle}
            />
            <Bar
              dataKey="count"
              fill={TERM_COLORS.cyan}
              name="Offers"
              radius={0}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
