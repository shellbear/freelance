"use client";

import type { Period } from "@/lib/utils";

const periods: { value: Period; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "1y", label: "1Y" },
  { value: "all", label: "ALL" },
];

interface TerminalPeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
}

export function TerminalPeriodSelector({
  value,
  onChange,
}: TerminalPeriodSelectorProps) {
  return (
    <div className="flex items-center gap-1">
      {periods.map((p) => (
        <button
          key={p.value}
          onClick={() => onChange(p.value)}
          className="px-2 py-1 text-xs font-bold tracking-wider transition-colors"
          style={{
            background:
              value === p.value ? "var(--term-amber)" : "transparent",
            color:
              value === p.value ? "var(--term-bg)" : "var(--term-muted)",
            border: `1px solid ${value === p.value ? "var(--term-amber)" : "var(--term-border)"}`,
          }}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}
