// Share of on-site and fully remote offers per month, drawn as a self-contained SVG
// so the page and the exported image use the same drawing.
import type { buildStats } from "../pipeline/stats";

type RemoteMonth = ReturnType<typeof buildStats>["remoteByMonth"][number];

export type RemotePoint = {
  month: string;
  n: number;
  onsite: number;
  hybrid: number;
  full: number;
};

export function remoteSeries(
  months: string[],
  byMonth: RemoteMonth[] | undefined,
): RemotePoint[] {
  return months.flatMap((month, index) => {
    const split = byMonth?.[index];
    if (!split) return [];
    const share = (count: number) => (100 * count) / split.n;
    return [
      {
        month,
        n: split.n,
        onsite: share(split.none),
        hybrid: share(split.partial),
        full: share(split.full),
      },
    ];
  });
}

export const REMOTE_SERIES = [
  { key: "onsite", label: "100 % sur site", color: "#3987e5" },
  { key: "full", label: "100 % télétravail", color: "#199e70" },
] as const;

const SANS =
  "-apple-system, &quot;SF Pro Display&quot;, &quot;Segoe UI&quot;, Inter, Arial, sans-serif";
const MONO = "ui-monospace, Menlo, Consolas, monospace";
const percent = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const monthShort = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  timeZone: "UTC",
});

/** Lines for on-site and fully remote shares, with the latest values labeled at the end. */
export function remoteSvg(
  points: RemotePoint[],
  {
    width,
    height,
    scale = 1,
    labels,
  }: {
    width: number;
    height: number;
    scale?: number;
    /** "full" names each line at its end; "values" leaves that to a legend. */
    labels: "full" | "values";
  },
) {
  const pad = {
    top: 16 * scale,
    right: (labels === "full" ? 200 : 84) * scale,
    bottom: 34 * scale,
    left: 52 * scale,
  };
  const top = Math.max(
    20,
    Math.ceil(Math.max(...points.map((p) => p.onsite)) / 5) * 5 + 5,
  );
  const x = (index: number) =>
    pad.left +
    (points.length > 1 ? index / (points.length - 1) : 0.5) *
      (width - pad.left - pad.right);
  const y = (value: number) =>
    pad.top + (1 - value / top) * (height - pad.top - pad.bottom);
  const font = (size: number, family = MONO) =>
    `font-family="${family}" font-size="${size * scale}"`;

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" role="img">`;
  for (let tick = 0; tick <= top; tick += 5) {
    svg += `<line x1="${pad.left}" x2="${width - pad.right}" y1="${y(tick)}" y2="${y(tick)}" stroke="#2a2b2d" stroke-width="${scale}"/>`;
    svg += `<text x="${pad.left - 10 * scale}" y="${y(tick) + 4 * scale}" text-anchor="end" fill="#6f6e69" ${font(12)}>${tick}%</text>`;
  }
  points.forEach((point, index) => {
    const date = new Date(`${point.month}-01T00:00:00Z`);
    const label =
      date.getUTCMonth() === 0
        ? String(date.getUTCFullYear())
        : monthShort.format(date).replace(".", "");
    svg += `<text x="${x(index)}" y="${height - 10 * scale}" text-anchor="middle" fill="#6f6e69" ${font(12)}>${label}</text>`;
  });
  for (const series of REMOTE_SERIES) {
    const values = points.map((p) => p[series.key]);
    const path = values
      .map((value, index) => `${index ? "L" : "M"}${x(index)},${y(value)}`)
      .join("");
    svg += `<path d="${path}" fill="none" stroke="${series.color}" stroke-width="${2 * scale}" stroke-linejoin="round"/>`;
    values.forEach((value, index) => {
      svg += `<circle cx="${x(index)}" cy="${y(value)}" r="${4 * scale}" fill="${series.color}" stroke="#141517" stroke-width="${2 * scale}"><title>${series.label}, ${monthShort.format(new Date(`${points[index]?.month}-01T00:00:00Z`))} : ${percent.format(value)} % des offres</title></circle>`;
    });
    const last = values.at(-1) ?? 0;
    const lx = x(values.length - 1) + 14 * scale;
    svg += `<text x="${lx}" y="${y(last) + 5 * scale}" fill="#f0efec" ${font(15)} font-weight="700">${percent.format(last)} %<tspan fill="#a3a29b" font-weight="400" font-family="${SANS}" font-size="${13 * scale}" dx="${8 * scale}">${labels === "full" ? series.label : ""}</tspan></text>`;
  }
  return `${svg}</svg>`;
}
