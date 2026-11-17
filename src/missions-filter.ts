// Filtering and labels for the offers page, kept apart from the page so they can be tested.
import type { PublicOffer } from "../pipeline/offers";

export type Filters = {
  q: string;
  /** A profile id, "other" for offers matching no profile, or "" for all. */
  profile: string;
  minRate: number | null;
  region: string;
  remote: string;
  experience: string;
  source: string;
  sort: "recent" | "rate";
};

export const DEFAULTS: Filters = {
  q: "",
  profile: "",
  minRate: null,
  region: "",
  remote: "",
  experience: "",
  source: "",
  sort: "recent",
};

const DAY_MS = 86_400_000;
const number = new Intl.NumberFormat("fr-FR");

const plain = (text: string | null) =>
  (text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** The filters a link carries: ?profil=go&tjm=600&tri=tjm */
export function parseFilters(params: URLSearchParams): Filters {
  const rate = Number.parseInt(params.get("tjm") ?? "", 10);
  return {
    q: params.get("q") ?? "",
    profile: params.get("profil") ?? "",
    minRate: Number.isFinite(rate) && rate > 0 ? rate : null,
    region: params.get("region") ?? "",
    remote: params.get("teletravail") ?? "",
    experience: params.get("experience") ?? "",
    source: params.get("source") ?? "",
    sort: params.get("tri") === "tjm" ? "rate" : "recent",
  };
}

export function toParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  const set = (key: string, value: string) => value && params.set(key, value);
  set("q", filters.q.trim());
  set("profil", filters.profile);
  set("tjm", filters.minRate ? String(filters.minRate) : "");
  set("region", filters.region);
  set("teletravail", filters.remote);
  set("experience", filters.experience);
  set("source", filters.source);
  set("tri", filters.sort === "rate" ? "tjm" : "");
  return params;
}

/** The most an offer says it pays, or null when it states no rate. */
const topRate = (offer: PublicOffer) => offer.max ?? offer.min;

/** The offers matching the filters. They arrive newest first and keep that order unless sorted by rate. */
export function filterOffers(
  offers: PublicOffer[],
  filters: Filters,
): PublicOffer[] {
  const terms = plain(filters.q).split(/\s+/).filter(Boolean);
  const kept = offers.filter((offer) => {
    if (filters.profile === "other" && offer.profiles.length > 0) return false;
    if (
      filters.profile &&
      filters.profile !== "other" &&
      !offer.profiles.includes(filters.profile)
    )
      return false;
    if (filters.minRate && (topRate(offer) ?? 0) < filters.minRate)
      return false;
    if (filters.region && offer.region !== filters.region) return false;
    if (filters.remote && offer.remote !== filters.remote) return false;
    if (filters.experience && offer.experience !== filters.experience)
      return false;
    if (
      filters.source &&
      !offer.links.some((link) => link.source === filters.source)
    )
      return false;
    if (terms.length === 0) return true;
    const text = plain(`${offer.title} ${offer.company ?? ""}`);
    return terms.every((term) => text.includes(term));
  });
  if (filters.sort !== "rate") return kept;
  return kept.sort((a, b) => (topRate(b) ?? 0) - (topRate(a) ?? 0));
}

/** The link if it is a web address, "#" otherwise: the list is data, so a script link must never be drawn. */
export function safeUrl(url: string | undefined): string {
  try {
    const { protocol, href } = new URL(url ?? "");
    return protocol === "https:" || protocol === "http:" ? href : "#";
  } catch {
    return "#";
  }
}

/** "500–600 €", "550 €", or null when the offer states no rate. */
export function rateLabel(offer: PublicOffer): string | null {
  const { min, max } = offer;
  if (min !== null && max !== null && min !== max)
    return `${number.format(min)}–${number.format(max)} €`;
  const rate = max ?? min;
  return rate === null ? null : `${number.format(rate)} €`;
}

/** "aujourd'hui", "hier" or "il y a 7 j", from two YYYY-MM-DD days. */
export function ageLabel(published: string, today: string): string {
  const days = Math.round((Date.parse(today) - Date.parse(published)) / DAY_MS);
  if (days <= 0) return "aujourd'hui";
  return days === 1 ? "hier" : `il y a ${days} j`;
}

/** A profile's usual rates over 12 months, from the site's statistics. */
export type Quartiles = { p25: number; p50: number; p75: number };
export type Standing = "above" | "inside" | "below";

/**
 * Where an offer's rate sits against the usual range, judged on the middle of
 * its range. Null when the offer states no rate or the usual range is unknown.
 */
export function standing(
  offer: PublicOffer,
  usual: Quartiles | null,
): Standing | null {
  const low = offer.min ?? offer.max;
  const high = offer.max ?? offer.min;
  if (low === null || high === null || !usual) return null;
  const middle = (low + high) / 2;
  if (middle > usual.p75) return "above";
  return middle < usual.p25 ? "below" : "inside";
}

/** The rates the scale spans; almost every advertised rate falls between them. */
export const SCALE = { low: 200, high: 1000 };

/** A rate's place along the scale, from 0 to 100. Rates off the scale sit at its ends. */
export function scalePosition(rate: number): number {
  const clamped = Math.min(SCALE.high, Math.max(SCALE.low, rate));
  return (100 * (clamped - SCALE.low)) / (SCALE.high - SCALE.low);
}

/**
 * The first `shown` offers grouped by publication day, in the order given.
 * Each day's total counts all its offers, including those not shown yet.
 */
export function groupByDay(offers: PublicOffer[], shown: number) {
  const totals = new Map<string, number>();
  for (const offer of offers)
    totals.set(offer.published, (totals.get(offer.published) ?? 0) + 1);
  const groups = new Map<string, PublicOffer[]>();
  for (const offer of offers.slice(0, shown))
    groups.set(offer.published, [
      ...(groups.get(offer.published) ?? []),
      offer,
    ]);
  return [...groups].map(([day, found]) => ({
    day,
    total: totals.get(day) ?? 0,
    offers: found,
  }));
}

const readingDate = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Paris",
});

/** The day a reading was made, in Paris, split the way a calendar leaf shows it. */
export function readingDay(generatedAt: string) {
  const parts = Object.fromEntries(
    readingDate
      .formatToParts(new Date(generatedAt))
      .map((part) => [part.type, part.value]),
  );
  return {
    weekday: parts.weekday ?? "",
    day: parts.day ?? "",
    month: `${parts.month} ${parts.year}`,
  };
}
