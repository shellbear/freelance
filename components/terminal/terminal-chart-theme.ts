export const TERM_COLORS = {
  bg: "#0a0a0a",
  panel: "#111111",
  border: "#2a2a2a",
  amber: "#ff9500",
  green: "#00d26a",
  red: "#ff3b3b",
  cyan: "#00bcd4",
  white: "#ffffff",
  muted: "#666666",
} as const;

export const terminalAxisProps = {
  stroke: TERM_COLORS.border,
  tick: { fill: TERM_COLORS.muted, fontSize: 11, fontFamily: "JetBrains Mono" },
  tickLine: { stroke: TERM_COLORS.border },
  axisLine: { stroke: TERM_COLORS.border },
} as const;

export const terminalGridProps = {
  strokeDasharray: "2 4",
  stroke: TERM_COLORS.border,
  vertical: false,
} as const;

export const terminalTooltipStyle = {
  contentStyle: {
    background: TERM_COLORS.panel,
    border: `1px solid ${TERM_COLORS.border}`,
    borderRadius: 0,
    fontFamily: "JetBrains Mono",
    fontSize: 11,
    color: TERM_COLORS.white,
  },
  labelStyle: {
    color: TERM_COLORS.amber,
    fontWeight: 700,
  },
  itemStyle: {
    color: TERM_COLORS.white,
  },
  cursor: { stroke: TERM_COLORS.muted, strokeDasharray: "4 4" },
} as const;
