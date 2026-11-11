// Year-over-year demand per profile, sorted into growing, stable and shrinking.

/** Profiles with fewer offers than this in either year are too noisy to rank. */
export const MIN_OFFERS = 100;
/** A change within ±STABLE % is shown as stable rather than as a trend. */
export const STABLE = 5;
/** Security is split across these profiles, so the page also shows their total. */
export const SECURITY = ["cyber", "devsecops", "pentest"];
const NOTES: Record<string, string> = {
  cyber: "sécurité : SOC, IAM, RSSI…",
  devsecops: "sécurité applicative",
  ai: "data scientist, ML, LLM…",
  "ai-other": "titre qui mentionne l'IA",
  sysadmin: "admin, production, exploitation",
};

type Median = { p50: number } | null;
type CategoryCounts = {
  id: string;
  label: string;
  n: number;
  nPrior: number;
  rate?: Median;
  ratePrior?: Median;
};

export type Trend = {
  id: string;
  label: string;
  note?: string;
  /** False for totals, which have no profile page to link to. */
  linkable: boolean;
  n: number;
  nPrior: number;
  /** Percent change from the prior year to the last one. */
  change: number;
  /** Median daily rate over the last 12 months and the 12 before, when known. */
  rate: number | null;
  ratePrior: number | null;
};

const toTrend = (
  category: CategoryCounts,
  extra: Partial<Trend> = {},
): Trend => ({
  id: category.id,
  label: category.label,
  note: NOTES[category.id],
  linkable: true,
  n: category.n,
  nPrior: category.nPrior,
  change: (100 * (category.n - category.nPrior)) / category.nPrior,
  rate: category.rate?.p50 ?? null,
  ratePrior: category.ratePrior?.p50 ?? null,
  ...extra,
});

export function trends(categories: CategoryCounts[]) {
  const all = categories.find((category) => category.id === "all");
  const profiles = categories.filter((category) => category.id !== "all");
  const ranked = profiles
    .filter((c) => c.n >= MIN_OFFERS && c.nPrior >= MIN_OFFERS)
    .map((category) => toTrend(category));

  const security = profiles.filter((c) => SECURITY.includes(c.id));
  const securityTotal = {
    id: "security",
    label: "Sécurité, total",
    n: security.reduce((sum, c) => sum + c.n, 0),
    nPrior: security.reduce((sum, c) => sum + c.nPrior, 0),
  };
  if (security.length > 1 && securityTotal.nPrior >= MIN_OFFERS)
    ranked.push(
      toTrend(securityTotal, {
        note: "cyber + applicative + pentest",
        linkable: false,
      }),
    );

  ranked.sort((a, b) => b.change - a.change);
  return {
    market: all && all.nPrior > 0 ? toTrend(all) : undefined,
    up: ranked.filter((t) => t.change > STABLE),
    stable: ranked.filter((t) => Math.abs(t.change) <= STABLE),
    down: ranked.filter((t) => t.change < -STABLE),
  };
}

const whole = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
const oneDecimal = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
export const formatCount = (value: number) => whole.format(value);
export const formatRatio = (value: number) => oneDecimal.format(value);

/** "500 €" and its yearly move, "=", "+10 €" or "−25 €"; medians of separate groups can't be summed, so totals have none. */
export function formatRate(trend: Trend) {
  if (trend.rate === null) return null;
  const rate = `${whole.format(trend.rate)}\u00a0€`;
  if (trend.ratePrior === null) return { rate, move: "" };
  const diff = trend.rate - trend.ratePrior;
  const move =
    diff === 0
      ? "="
      : `${diff > 0 ? "+" : "−"}${whole.format(Math.abs(diff))}\u00a0€`;
  return { rate, move };
}

/** "+126 %", "−0,6 %": one decimal only where it changes the reading. */
export function formatChange(value: number) {
  const format = Math.abs(value) < 10 ? oneDecimal : whole;
  const text = format.format(Math.abs(value));
  const sign = text === "0" ? "" : value > 0 ? "+" : "−";
  return `${sign}${text} %`;
}

/** The ranked profiles as CSV, with the trend each one is shown under. */
export function trendsCsv(result: ReturnType<typeof trends>) {
  const quote = (text: string) =>
    /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  const lines = [
    [
      "profil",
      "tendance",
      "offres_annee_precedente",
      "offres_12_derniers_mois",
      "evolution_pct",
      "tjm_median_annee_precedente",
      "tjm_median_12_derniers_mois",
    ],
  ];
  for (const [trend, rows] of [
    ["hausse", result.up],
    ["stable", result.stable],
    ["baisse", result.down],
  ] as const)
    for (const row of rows)
      lines.push([
        row.label,
        trend,
        String(row.nPrior),
        String(row.n),
        row.change.toFixed(1),
        row.ratePrior === null ? "" : String(row.ratePrior),
        row.rate === null ? "" : String(row.rate),
      ]);
  return `${lines.map((line) => line.map(quote).join(",")).join("\n")}\n`;
}
