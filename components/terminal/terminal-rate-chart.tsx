"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { OfferData } from "@/lib/types";
import {
  TERM_COLORS,
  terminalAxisProps,
  terminalGridProps,
  terminalTooltipStyle,
} from "./terminal-chart-theme";

interface TerminalRateChartProps {
  data: OfferData[] | null;
}

export function TerminalRateChart({ data }: TerminalRateChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="terminal-panel flex h-full items-center justify-center">
        <span className="text-xs" style={{ color: "var(--term-muted)" }}>
          NO RATE DATA
        </span>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.publishedAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    minRate: d._avg.minimumSalary ? Math.round(d._avg.minimumSalary) : null,
    maxRate: d._avg.maximumSalary ? Math.round(d._avg.maximumSalary) : null,
  }));

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
          RATE EVOLUTION (EUR/DAY)
        </span>
      </div>
      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid {...terminalGridProps} />
            <XAxis
              dataKey="date"
              {...terminalAxisProps}
              interval="preserveStartEnd"
            />
            <YAxis {...terminalAxisProps} />
            <Tooltip
              contentStyle={terminalTooltipStyle.contentStyle}
              labelStyle={terminalTooltipStyle.labelStyle}
              itemStyle={terminalTooltipStyle.itemStyle}
              formatter={(value: number) => [`${value}€`, ""]}
            />
            <Line
              type="monotone"
              dataKey="minRate"
              stroke={TERM_COLORS.cyan}
              strokeWidth={1.5}
              dot={false}
              name="Min Rate"
            />
            <Line
              type="monotone"
              dataKey="maxRate"
              stroke={TERM_COLORS.green}
              strokeWidth={1.5}
              dot={false}
              name="Max Rate"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
