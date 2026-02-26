"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
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

interface TerminalVolumeChartProps {
  data: OfferData[] | null;
}

export function TerminalVolumeChart({ data }: TerminalVolumeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="terminal-panel flex h-full items-center justify-center">
        <span className="text-xs" style={{ color: "var(--term-muted)" }}>
          NO VOLUME DATA
        </span>
      </div>
    );
  }

  const chartData = data.map((d) => ({
    date: new Date(d.publishedAt).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    }),
    count: d._count._all,
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
          OFFER VOLUME
        </span>
      </div>
      <div className="flex-1 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="termVolumeGrad" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={TERM_COLORS.amber}
                  stopOpacity={0.3}
                />
                <stop
                  offset="100%"
                  stopColor={TERM_COLORS.amber}
                  stopOpacity={0.02}
                />
              </linearGradient>
            </defs>
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
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke={TERM_COLORS.amber}
              strokeWidth={1.5}
              fill="url(#termVolumeGrad)"
              name="Offers"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
