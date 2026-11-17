// Silkhom: a recruitment firm whose listing page holds every offer at once,
// most of them hidden until filtered. Only its freelance IT offers are kept;
// it states no rate and never names the client.
import type { SourceOffer } from "../offers";
import { decodeEntities, isLinkOn } from "./html";
import { fetchRetry } from "./http";

const HOST = "www.silkhom.com";
const LISTING = `https://${HOST}/nos-offres-demploi/`;
/** Silkhom gives no end date and leaves offers online for months: older ones are treated as closed. */
const VALID_DAYS = 90;
const DAY_MS = 86_400_000;

/** Silkhom also recruits for electronics and mechanics; an offer needs one of these to be listed. */
const IT_DOMAINS = new Set([
  "infrastructure-cloud-devops",
  "outils-de-gestion-erp-bi-crm",
  "developpement-logiciel-qa",
  "developpement-web-mobile",
  "developpement-c",
  "logiciel-embarque",
  "securite-cybersecurite",
  "data-ia",
]);

/** Region names spelled as Free-Work spells them. A place missing here is abroad or unknown. */
const REGIONS: Record<string, string> = {
  "auvergne-rhone-alpes": "Auvergne-Rhône-Alpes",
  "bourgogne-franche-comte": "Bourgogne-Franche-Comté",
  bretagne: "Bretagne",
  "centre-val-de-loire": "Centre-Val de Loire",
  corse: "Corse",
  "grand-est": "Grand Est",
  "hauts-de-france": "Hauts-de-France",
  "ile-de-france": "Île-de-France",
  normandie: "Normandie",
  "nouvelle-aquitaine": "Nouvelle-Aquitaine",
  occitanie: "Occitanie",
  "pays-de-la-loire": "Pays de la Loire",
  paca: "Provence-Alpes-Côte d'Azur",
  "provence-alpes-cote-dazur": "Provence-Alpes-Côte d'Azur",
};
const ABROAD = new Set(["maroc", "bruxelles-capitale"]);
const REMOTE = "100-teletravail";

const CARD =
  /<div post-id="(\d+)" offer-i="\d+"[^>]*class="wrapper-offre ([^"]*)"[^>]*>\s*<div class="padding">\s*<h2><a href="([^"]+)">([\s\S]*?)<\/a><\/h2>\s*<div class="infos-lieu-date">([\s\S]*?)<\/div>/g;

const text = (fragment: string) =>
  decodeEntities(
    fragment.replace(/<noscript>[\s\S]*?<\/noscript>|<[^>]+>/g, ""),
  ).trim();

/** "17/11/2026" as "2026-11-17", or null when it isn't a date. */
function isoDay(date: string): string | null {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : null;
}

const addDays = (day: string, days: number) =>
  new Date(Date.parse(day) + days * DAY_MS).toISOString().slice(0, 10);

/** The freelance IT offers in France that the listing page holds. */
export function parseListing(html: string): SourceOffer[] {
  const offers: SourceOffer[] = [];
  for (const [, id, classes, url, title, infos] of html.matchAll(CARD)) {
    const tags = (prefix: string) =>
      (classes ?? "")
        .split(/\s+/)
        .filter((name) => name.startsWith(prefix))
        .map((name) => name.slice(prefix.length));
    const [city, , date] = [
      ...(infos ?? "").matchAll(/<p>([\s\S]*?)<\/p>/g),
    ].map((match) => text(match[1] ?? ""));
    const [place] = tags("locations-");
    const published = isoDay(date ?? "");

    if (!tags("contrat-").includes("Freelance")) continue;
    if (!tags("domains-").some((domain) => IT_DOMAINS.has(domain))) continue;
    if (place && ABROAD.has(place)) continue;
    if (!id || !url || !title || !published || !isLinkOn(url, HOST)) continue;

    const remote = place === REMOTE;
    offers.push({
      source: "silkhom",
      id,
      title: text(title),
      company: "Silkhom",
      url,
      job: null,
      min_rate: null,
      max_rate: null,
      region: REGIONS[place ?? ""] ?? null,
      city: remote ? null : city || null,
      remote: remote ? "full" : null,
      experience: null,
      published,
      expires: addDays(published, VALID_DAYS),
    });
  }
  return offers;
}

export async function fetchSilkhom(): Promise<SourceOffer[]> {
  const response = await fetchRetry(LISTING);
  if (!response.ok) throw new Error(`Silkhom: HTTP ${response.status}`);
  return parseListing(await response.text());
}
