// Turns offer rows into the public statistics. No offer-level data leaves this module.
import { CATEGORIES, classify, normalize, subgroupOf } from "./categories";

const MIN_GROUP = 5;
const MIN_RATE = 150;
const MAX_RATE = 2000;
const REPOST_DAYS = 30;
const ROLLING_MONTHS = 3;
/** Months with fewer offers stating a remote mode get no remote split. */
const MIN_REMOTE_MONTH = 100;
const DAY_MS = 86_400_000;

export type OfferRow = {
  title: string;
  company: string;
  job: string | null;
  skills: readonly string[] | null;
  min_rate: number | null;
  max_rate: number | null;
  day: string;
  remote: string | null;
  experience: string | null;
  region: string | null;
  country: string | null;
};

/** The advertised daily rate, ignoring values that can't be a daily rate. */
export function dailyRate(
  min: number | null,
  max: number | null,
): number | null {
  const valid = [min, max].filter(
    (rate): rate is number =>
      rate !== null && rate >= MIN_RATE && rate <= MAX_RATE,
  );
  if (valid.length === 0) return null;
  return valid.reduce((sum, rate) => sum + rate, 0) / valid.length;
}

const percentile = (sorted: number[], q: number) =>
  sorted[Math.floor(q * (sorted.length - 1))] ?? 0;

/** Quartiles rounded to 5 €, or null for groups too small to publish. */
export function quartiles(rates: number[]) {
  if (rates.length < MIN_GROUP) return null;
  const sorted = [...rates].sort((a, b) => a - b);
  const round = (q: number) => Math.round(percentile(sorted, q) / 5) * 5;
  return { p25: round(0.25), p50: round(0.5), p75: round(0.75) };
}

/** Drops an offer when the same company posted the same title in the last 30 days. */
export function dropReposts<T extends OfferRow>(rows: T[]): T[] {
  const lastSeen = new Map<string, number>();
  const kept: T[] = [];
  for (const row of [...rows].sort((a, b) => a.day.localeCompare(b.day))) {
    const key = `${row.company}|${normalize(row.title).trim()}`;
    const time = Date.parse(row.day);
    const previous = lastSeen.get(key);
    lastSeen.set(key, time);
    if (previous === undefined || time - previous >= REPOST_DAYS * DAY_MS)
      kept.push(row);
  }
  return kept;
}

function shiftMonth(month: string, by: number): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + by);
  return date.toISOString().slice(0, 7);
}

export function monthRange(first: string, last: string): string[] {
  const months: string[] = [];
  const cursor = new Date(`${first}-01T00:00:00Z`);
  while (cursor.toISOString().slice(0, 7) <= last) {
    months.push(cursor.toISOString().slice(0, 7));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}

type Offer = OfferRow & {
  month: string;
  rate: number | null;
  categories: string[];
};

const ratesOf = (offers: Offer[]) =>
  offers.flatMap((offer) => (offer.rate === null ? [] : [offer.rate]));

function breakdown(
  offers: Offer[],
  keyOf: (offer: Offer) => string | null,
  keys: string[],
) {
  return keys.flatMap((key) => {
    const group = offers.filter((offer) => keyOf(offer) === key);
    const stats = quartiles(ratesOf(group));
    return stats ? [{ key, n: group.length, ...stats }] : [];
  });
}

function topSkills(offers: Offer[]) {
  const tagged = offers.filter((offer) => offer.skills?.length);
  const counts = new Map<string, number>();
  for (const offer of tagged) {
    for (const skill of new Set(offer.skills)) {
      const name = skill.trim();
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }
  return [...counts]
    .filter(([, n]) => n >= MIN_GROUP)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, n]) => ({
      name,
      share: Math.round((100 * n) / tagged.length),
    }));
}

function location(offer: Offer) {
  if (offer.country !== "FR" || !offer.region) return null;
  return offer.region === "Île-de-France" ? "idf" : "regions";
}

type Subgroups = NonNullable<(typeof CATEGORIES)[number]["subgroups"]>;

/** Offers per subgroup in both years; each offer counts once, the rest under "other". */
function subgroupStats(
  inYear: Offer[],
  inPriorYear: Offer[],
  subgroups: Subgroups | undefined,
) {
  if (!subgroups) return [];
  const split = (offers: Offer[]) => {
    const groups = new Map<string, Offer[]>();
    for (const offer of offers) {
      const id = subgroupOf(subgroups, normalize(offer.title));
      groups.set(id, [...(groups.get(id) ?? []), offer]);
    }
    return groups;
  };
  const [year, prior] = [split(inYear), split(inPriorYear)];
  const published = (offers: Offer[] | undefined) =>
    offers && offers.length >= MIN_GROUP ? offers.length : null;
  return [...subgroups, { id: "other", label: "Autre" }].flatMap(
    ({ id, label }) => {
      const n = published(year.get(id));
      const nPrior = published(prior.get(id));
      if (n === null && nPrior === null) return [];
      return [
        { id, label, n, nPrior, rate: quartiles(ratesOf(year.get(id) ?? [])) },
      ];
    },
  );
}

function summarize(
  offers: Offer[],
  months: string[],
  year: Set<string>,
  priorYear: Set<string>,
  subgroups?: Subgroups,
) {
  const inYear = offers.filter((offer) => year.has(offer.month));
  const inPriorYear = offers.filter((offer) => priorYear.has(offer.month));
  const byMonth = new Map<string, Offer[]>();
  for (const offer of offers) {
    const list = byMonth.get(offer.month);
    if (list) list.push(offer);
    else byMonth.set(offer.month, [offer]);
  }

  // Rates use a trailing window so thin categories still produce a readable line.
  const rolling = months.map((_, index) =>
    quartiles(
      months
        .slice(Math.max(0, index - ROLLING_MONTHS + 1), index + 1)
        .flatMap((month) => ratesOf(byMonth.get(month) ?? [])),
    ),
  );

  const volume = months.map((month) => {
    const n = byMonth.get(month)?.length ?? 0;
    return n >= MIN_GROUP ? n : null;
  });

  return {
    n: inYear.length,
    nPrior: inPriorYear.length,
    rate: quartiles(ratesOf(inYear)),
    ratePrior: quartiles(ratesOf(inPriorYear)),
    volume,
    p25: rolling.map((stats) => stats?.p25 ?? null),
    p50: rolling.map((stats) => stats?.p50 ?? null),
    p75: rolling.map((stats) => stats?.p75 ?? null),
    experience: breakdown(inYear, (offer) => offer.experience, [
      "junior",
      "intermediate",
      "senior",
      "expert",
    ]),
    remote: breakdown(inYear, (offer) => offer.remote, [
      "none",
      "partial",
      "full",
    ]),
    location: breakdown(inYear, location, ["idf", "regions"]),
    skills: topSkills(inYear),
    subgroups: subgroupStats(inYear, inPriorYear, subgroups),
  };
}

/** Offers per remote mode for each month, among offers that state one. */
function remoteByMonth(offers: Offer[], months: string[]) {
  return months.map((month) => {
    const stated = offers.filter(
      (offer) => offer.month === month && offer.remote,
    );
    if (stated.length < MIN_REMOTE_MONTH) return null;
    const count = (mode: string) =>
      stated.filter((offer) => offer.remote === mode).length;
    return {
      n: stated.length,
      none: count("none"),
      partial: count("partial"),
      full: count("full"),
    };
  });
}

export function buildStats(rows: OfferRow[], now: Date) {
  const offers: Offer[] = dropReposts(rows).map((row) => ({
    ...row,
    month: row.day.slice(0, 7),
    rate: dailyRate(row.min_rate, row.max_rate),
    categories: classify(row.title, row.job),
  }));

  // The first and current months are partial, so they would read as false drops.
  // Empty months in between stay, so a collection outage remains visible.
  const earliest = offers.map((offer) => offer.month).sort()[0] ?? "";
  const months = monthRange(
    shiftMonth(earliest, 1),
    shiftMonth(now.toISOString().slice(0, 7), -1),
  );
  const year = new Set(months.slice(-12));
  const priorYear = new Set(months.slice(-24, -12));
  const usable = offers.filter((offer) => months.includes(offer.month));

  return {
    generatedAt: now.toISOString(),
    source: "Free-Work",
    license: "CC BY 4.0",
    months,
    minGroup: MIN_GROUP,
    offers: usable.length,
    remoteByMonth: remoteByMonth(usable, months),
    categories: [
      {
        id: "all",
        label: "Toutes les offres",
        group: "Marché",
        search: "",
        ...summarize(usable, months, year, priorYear),
      },
      ...CATEGORIES.map(({ id, label, group, search, subgroups }) => ({
        id,
        label,
        group,
        search,
        ...summarize(
          usable.filter((offer) => offer.categories.includes(id)),
          months,
          year,
          priorYear,
          subgroups,
        ),
      })),
    ],
  };
}
