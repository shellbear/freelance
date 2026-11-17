// Freelance-Informatique: the missions its listing pages declare as schema.org
// JobPosting data. It states neither the client nor a rate.
import type { SourceOffer } from "../offers";
import { decodeEntities, isLinkOn } from "./html";
import { fetchRetry } from "./http";

const HOST = "www.freelance-informatique.fr";
const LISTING = `https://${HOST}/offres-freelance`;
/** Far above the real page count: a guard against a listing that never ends. */
const MAX_PAGES = 60;

type JobPosting = {
  "@type"?: string;
  title?: string;
  url?: string;
  datePosted?: string;
  validThrough?: string;
  identifier?: { value?: string };
  jobLocation?: {
    address?: {
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
};
type ItemList = {
  "@type"?: string;
  itemListElement?: { item?: JobPosting }[];
};

/** Region names spelled as Free-Work spells them, so one filter covers every platform. */
const REGIONS: Record<string, string> = { "Ile-de-France": "Île-de-France" };

function parseJson(text: string): ItemList | null {
  try {
    return JSON.parse(text) as ItemList;
  } catch {
    return null;
  }
}

/** The missions one listing page declares in its structured data. */
export function parseListing(html: string): SourceOffer[] {
  const blocks = html.matchAll(
    /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g,
  );
  const offers: SourceOffer[] = [];
  for (const [, text] of blocks) {
    const list = parseJson(text ?? "");
    if (list?.["@type"] !== "ItemList") continue;
    for (const { item } of list.itemListElement ?? []) {
      const address = item?.jobLocation?.address;
      const country = address?.addressCountry ?? null;
      if (!item?.url || !item.title || !item.datePosted) continue;
      if (!isLinkOn(item.url, HOST)) continue;
      if (country !== null && country !== "FR") continue;
      offers.push({
        source: "freelance-informatique",
        id: item.identifier?.value ?? item.url,
        title: decodeEntities(item.title).trim(),
        company: null,
        url: item.url,
        job: null,
        min_rate: null,
        max_rate: null,
        region:
          REGIONS[address?.addressRegion ?? ""] ||
          address?.addressRegion ||
          null,
        city: address?.addressLocality || null,
        remote: null,
        experience: null,
        published: item.datePosted.slice(0, 10),
        expires: item.validThrough?.slice(0, 10) ?? null,
      });
    }
  }
  return offers;
}

/** Every open mission. Throws if a page fails, so a partial list is never published. */
export async function fetchFreelanceInformatique(): Promise<SourceOffer[]> {
  const offers = new Map<string, SourceOffer>();
  for (let page = 1; page <= MAX_PAGES; page++) {
    // Past the last page the site redirects to the first one: stop instead of following.
    const response = await fetchRetry(`${LISTING}?page=${page}`, {
      redirect: "manual",
    });
    if (response.status >= 300 && response.status < 400 && page > 1) break;
    if (!response.ok)
      throw new Error(
        `Freelance-Informatique page ${page}: HTTP ${response.status}`,
      );
    const found = parseListing(await response.text());
    const before = offers.size;
    for (const offer of found) offers.set(offer.id, offer);
    if (offers.size === before) break;
    await Bun.sleep(500);
  }
  return [...offers.values()];
}
