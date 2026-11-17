// Free-Work: every open freelance offer, read from its public job postings API.
// Only the fields below are requested, so descriptions are never downloaded.
import type { SourceOffer } from "../offers";
import { fetchRetry } from "./http";

const API = "https://www.free-work.com/api/job_postings";
const SITE = "https://www.free-work.com/fr/tech-it/job-mission";
const PAGE_SIZE = 500;
const FIELDS = [
  "properties[]=id",
  "properties[]=title",
  "properties[]=slug",
  "properties[]=minDailySalary",
  "properties[]=maxDailySalary",
  "properties[]=publishedAt",
  "properties[]=expiredAt",
  "properties[]=remoteMode",
  "properties[]=experienceLevel",
  "properties[company][]=name",
  "properties[job][]=nameForUser",
  "properties[job][]=nameForUserSlug",
  "properties[location][]=locality",
  "properties[location][]=adminLevel1",
  "properties[location][]=countryCode",
].join("&");

export type Posting = {
  id: number;
  title: string;
  slug: string;
  minDailySalary: number | null;
  maxDailySalary: number | null;
  publishedAt: string;
  expiredAt: string | null;
  remoteMode: string | null;
  experienceLevel: string | null;
  company: { name: string };
  job: { nameForUser: string; nameForUserSlug: string };
  location: {
    locality: string | null;
    adminLevel1: string | null;
    countryCode: string | null;
  } | null;
};
type Page = { "hydra:totalItems": number; "hydra:member": Posting[] };

/** Maps a posting to an offer, or null when it is located outside France. */
export function toOffer(posting: Posting): SourceOffer | null {
  const country = posting.location?.countryCode ?? null;
  if (country !== null && country !== "FR") return null;
  return {
    source: "free-work",
    id: String(posting.id),
    title: posting.title,
    company: posting.company.name.trim() || null,
    url: `${SITE}/${posting.job.nameForUserSlug}/${posting.slug}`,
    job: posting.job.nameForUser,
    min_rate: posting.minDailySalary,
    max_rate: posting.maxDailySalary,
    region: posting.location?.adminLevel1 ?? null,
    city: posting.location?.locality ?? null,
    remote: posting.remoteMode,
    experience: posting.experienceLevel,
    published: posting.publishedAt.slice(0, 10),
    expires: posting.expiredAt?.slice(0, 10) ?? null,
  };
}

/** Every open freelance offer. Throws if any page is missing, so a partial list is never published. */
export async function fetchFreeWork(): Promise<SourceOffer[]> {
  const offers: SourceOffer[] = [];
  let totalPages = 1;
  for (let page = 1; page <= totalPages; page++) {
    const url = `${API}?page=${page}&itemsPerPage=${PAGE_SIZE}&contracts=contractor&${FIELDS}`;
    const response = await fetchRetry(url);
    if (!response.ok)
      throw new Error(`Free-Work page ${page}: HTTP ${response.status}`);
    const result = (await response.json()) as Page;
    totalPages = Math.ceil(result["hydra:totalItems"] / PAGE_SIZE);
    for (const posting of result["hydra:member"]) {
      const offer = toOffer(posting);
      if (offer) offers.push(offer);
    }
    await Bun.sleep(500);
  }
  return offers;
}
