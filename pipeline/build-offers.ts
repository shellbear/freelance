// Reads every platform's open offers and writes the list the offers page reads.
// Rebuilt from scratch each day, so an offer that left its platform leaves the list.
import { EXCLUDED_COMPANIES } from "./excluded";
import {
  buildOffers,
  type OffersFile,
  type SourceOffer,
  summarize,
} from "./offers";
import { fetchFreeWork } from "./sources/free-work";
import { fetchFreelanceInformatique } from "./sources/freelance-informatique";
import { fetchSilkhom } from "./sources/silkhom";

const OUT = "public/offers.json";
/** A few hundred bytes of counts, so the rates pages can link to the missions without loading them. */
const SUMMARY = "public/offers-summary.json";
/** The file currently live, which a failed platform's offers are carried over from. */
const LIVE = "https://freelance.shellbear.me/offers.json";

// In display order: when a mission is on several platforms, the first one's fields win.
const SOURCES: {
  id: string;
  label: string;
  fetch: () => Promise<SourceOffer[]>;
}[] = [
  { id: "free-work", label: "Free-Work", fetch: fetchFreeWork },
  {
    id: "freelance-informatique",
    label: "Freelance-Informatique",
    fetch: fetchFreelanceInformatique,
  },
  { id: "silkhom", label: "Silkhom", fetch: fetchSilkhom },
];

async function previousFile(): Promise<OffersFile | null> {
  try {
    const response = await fetch(LIVE);
    return response.ok ? ((await response.json()) as OffersFile) : null;
  } catch {
    return null;
  }
}

const results = await Promise.all(
  SOURCES.map(async ({ id, label, fetch }) => {
    try {
      const offers = await fetch();
      // A platform with no offers at all is a broken read, not an empty market.
      if (offers.length === 0) throw new Error("no offers returned");
      return { id, label, offers };
    } catch (error) {
      console.error(`${label} failed:`, error);
      return { id, label, offers: null };
    }
  }),
);

const failed = results.filter((result) => result.offers === null);
const file = buildOffers(
  results,
  failed.length > 0 ? await previousFile() : null,
  new Date(),
  EXCLUDED_COMPANIES,
);

for (const source of file.sources) {
  console.log(
    `${source.label}: ${source.offers} offers, read ${source.updatedAt}`,
  );
}
if (file.offers.length === 0) {
  console.error("no offers to publish");
  process.exit(1);
}

const json = JSON.stringify(file);
await Bun.write(OUT, json);
await Bun.write(SUMMARY, JSON.stringify(summarize(file)));
console.log(
  `${file.offers.length} offers, ${file.merged} on several platforms, ${json.length} bytes, ${Bun.gzipSync(json).length} gzipped`,
);
// Fail loudly so the scheduler reports it; the file above is still published.
if (failed.length > 0) process.exit(1);
