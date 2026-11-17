// Turns each platform's open offers into the one list the offers page reads.
// Only what is needed to filter and link out is kept: no descriptions, no contacts.
import { CATEGORIES, classify, normalize } from "./categories";
import { dailyRate } from "./stats";

/** A failed platform's offers are carried over from the previous file this long. */
const STALE_DAYS = 3;
/** Two platforms' offers further apart than this are different missions. */
const SAME_MISSION_DAYS = 30;
const DAY_MS = 86_400_000;

/** An open offer as a platform adapter returns it. */
export type SourceOffer = {
  source: string;
  id: string;
  title: string;
  company: string | null;
  url: string;
  /** The platform's own job label, used when the title says nothing specific. */
  job: string | null;
  min_rate: number | null;
  max_rate: number | null;
  region: string | null;
  city: string | null;
  remote: string | null;
  experience: string | null;
  published: string;
  expires: string | null;
};

export type PublicOffer = {
  title: string;
  company: string | null;
  min: number | null;
  max: number | null;
  region: string | null;
  city: string | null;
  remote: string | null;
  experience: string | null;
  published: string;
  expires: string | null;
  profiles: string[];
  /** One link per platform the mission was found on. */
  links: { source: string; url: string }[];
};

export type SourceStatus = {
  id: string;
  label: string;
  /** The last successful read, or null if the platform has never been read. */
  updatedAt: string | null;
  offers: number;
};

export type OffersFile = {
  generatedAt: string;
  sources: SourceStatus[];
  /** The profiles an offer can be tagged with, in display order. */
  profiles: { id: string; label: string; group: string }[];
  /** Rows found on more than one platform. */
  merged: number;
  offers: PublicOffer[];
};

/** What one platform returned today: null when it could not be read. */
export type SourceResult = {
  id: string;
  label: string;
  offers: SourceOffer[] | null;
};

const words = (text: string | null) =>
  normalize(text)
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();

/** A title reduced to what identifies the mission: "Dev Python (H/F)" and "DEV PYTHON" match. */
export const titleKey = (title: string) =>
  words(
    normalize(title).replace(/\(?\b[hf]\s*\/\s*[hf](\s*\/\s*x)?\b\)?/g, " "),
  );

export function toPublic(offer: SourceOffer): PublicOffer {
  return {
    title: offer.title,
    company: offer.company,
    // dailyRate with one bound returns it only when it can be a daily rate.
    min: dailyRate(offer.min_rate, null),
    max: dailyRate(offer.max_rate, null),
    region: offer.region,
    city: offer.city,
    remote: offer.remote,
    experience: offer.experience,
    published: offer.published,
    expires: offer.expires,
    profiles: classify(offer.title, offer.job),
    links: [{ source: offer.source, url: offer.url }],
  };
}

/** Keeps the newest when one company posts the same title in the same city on one platform. */
export function dropReposts(offers: PublicOffer[]): PublicOffer[] {
  const newest = new Map<string, PublicOffer>();
  offers.forEach((offer, index) => {
    const key = offer.company
      ? `${offer.links[0]?.source}|${words(offer.company)}|${titleKey(offer.title)}|${words(offer.city)}`
      : `#${index}`;
    const seen = newest.get(key);
    if (!seen || offer.published > seen.published) newest.set(key, offer);
  });
  return [...newest.values()];
}

/** True when the offers are one mission seen once on each of several platforms. */
function sameMission(offers: PublicOffer[]): boolean {
  const sources = new Set(offers.map((offer) => offer.links[0]?.source));
  const companies = new Set(
    offers.flatMap((offer) => (offer.company ? [words(offer.company)] : [])),
  );
  const days = offers.map((offer) => Date.parse(offer.published));
  return (
    offers.length > 1 &&
    sources.size === offers.length &&
    companies.size <= 1 &&
    Math.max(...days) - Math.min(...days) <= SAME_MISSION_DAYS * DAY_MS
  );
}

function combine(offers: PublicOffer[], order: string[]): PublicOffer {
  const rank = (offer: PublicOffer) =>
    order.indexOf(offer.links[0]?.source ?? "");
  const ranked = [...offers].sort((a, b) => rank(a) - rank(b));
  const first = <K extends keyof PublicOffer>(field: K) =>
    ranked.find((offer) => offer[field] !== null)?.[field] ?? null;
  const expiries = ranked.flatMap((offer) => offer.expires ?? []).sort();
  return {
    title: ranked[0]?.title ?? "",
    company: first("company"),
    min: first("min"),
    max: first("max"),
    region: first("region"),
    city: first("city"),
    remote: first("remote"),
    experience: first("experience"),
    published: ranked.map((offer) => offer.published).sort()[0] ?? "",
    expires: expiries.at(-1) ?? null,
    profiles: [...new Set(ranked.flatMap((offer) => offer.profiles))],
    links: ranked.flatMap((offer) => offer.links),
  };
}

/**
 * Joins a mission found on several platforms into one row with a link to each.
 * Offers are only joined when the title and city match and nothing else on
 * those platforms could be the same mission; a wrong join still shows every link.
 */
export function mergeSources(
  offers: PublicOffer[],
  order: string[],
): PublicOffer[] {
  const apart: PublicOffer[] = [];
  const candidates = new Map<string, PublicOffer[]>();
  for (const offer of offers) {
    const city = words(offer.city);
    if (!city) {
      apart.push(offer);
      continue;
    }
    const key = `${titleKey(offer.title)}|${city}`;
    candidates.set(key, [...(candidates.get(key) ?? []), offer]);
  }
  for (const group of candidates.values()) {
    apart.push(...(sameMission(group) ? [combine(group, order)] : group));
  }
  return apart;
}

/** The rows the previous file held for a platform, each cut back to that platform's link. */
function carriedOver(previous: OffersFile | null, source: string) {
  return (previous?.offers ?? []).flatMap((offer) => {
    const links = offer.links.filter((link) => link.source === source);
    return links.length > 0 ? [{ ...offer, links }] : [];
  });
}

export function buildOffers(
  results: SourceResult[],
  previous: OffersFile | null,
  now: Date,
  excludedCompanies: string[],
): OffersFile {
  const generatedAt = now.toISOString();
  const today = generatedAt.slice(0, 10);
  const excluded = new Set(excludedCompanies.map(words));
  const updatedAt = new Map<string, string | null>();
  const rows: PublicOffer[] = [];

  for (const { id, offers } of results) {
    if (offers) {
      const unique = new Map(offers.map((offer) => [offer.id, offer]));
      rows.push(...[...unique.values()].map(toPublic));
      updatedAt.set(id, generatedAt);
      continue;
    }
    const last =
      previous?.sources.find((source) => source.id === id)?.updatedAt ?? null;
    updatedAt.set(id, last);
    const fresh =
      last !== null && now.getTime() - Date.parse(last) <= STALE_DAYS * DAY_MS;
    if (fresh) rows.push(...carriedOver(previous, id));
  }

  const open = rows.filter(
    (offer) =>
      (offer.expires === null || offer.expires >= today) &&
      !(offer.company && excluded.has(words(offer.company))),
  );
  const order = results.map((result) => result.id);
  const offers = mergeSources(dropReposts(open), order).sort(
    (a, b) =>
      b.published.localeCompare(a.published) || a.title.localeCompare(b.title),
  );

  return {
    generatedAt,
    sources: results.map(({ id, label }) => ({
      id,
      label,
      updatedAt: updatedAt.get(id) ?? null,
      offers: offers.filter((offer) =>
        offer.links.some((link) => link.source === id),
      ).length,
    })),
    profiles: CATEGORIES.map(({ id, label, group }) => ({ id, label, group })),
    merged: offers.filter((offer) => offer.links.length > 1).length,
    offers,
  };
}

/** How many offers are open, in total and per profile: all the rates pages need to link to them. */
export type OffersSummary = {
  generatedAt: string;
  offers: number;
  profiles: Record<string, number>;
};

export function summarize(file: OffersFile): OffersSummary {
  const profiles: Record<string, number> = {};
  for (const offer of file.offers)
    for (const id of offer.profiles) profiles[id] = (profiles[id] ?? 0) + 1;
  return {
    generatedAt: file.generatedAt,
    offers: file.offers.length,
    profiles,
  };
}
