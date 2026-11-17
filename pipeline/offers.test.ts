import { expect, test } from "bun:test";
import {
  buildOffers,
  dropReposts,
  mergeSources,
  type OffersFile,
  type PublicOffer,
  type SourceOffer,
  summarize,
  titleKey,
  toPublic,
} from "./offers";

const NOW = new Date("2026-11-17T07:00:00Z");
const ORDER = ["free-work", "freelance-informatique"];

const sourceOffer = (overrides: Partial<SourceOffer> = {}): SourceOffer => ({
  source: "free-work",
  id: "1",
  title: "Développeur Python",
  company: "Acme",
  url: "https://www.free-work.com/fr/tech-it/job-mission/dev/python-1",
  job: null,
  min_rate: 500,
  max_rate: 600,
  region: "Occitanie",
  city: "Toulouse",
  remote: "partial",
  experience: "senior",
  published: "2026-11-10",
  expires: "2027-01-09",
  ...overrides,
});

const fromFi = (overrides: Partial<SourceOffer> = {}): SourceOffer =>
  sourceOffer({
    source: "freelance-informatique",
    id: "261110I001",
    company: null,
    url: "https://www.freelance-informatique.fr/mission-python-261110I001",
    min_rate: null,
    max_rate: null,
    remote: null,
    experience: null,
    published: "2026-11-12",
    expires: "2027-02-12",
    ...overrides,
  });

const row = (overrides: Partial<SourceOffer> = {}): PublicOffer =>
  toPublic(sourceOffer(overrides));
const fiRow = (overrides: Partial<SourceOffer> = {}): PublicOffer =>
  toPublic(fromFi(overrides));

test("toPublic keeps the display fields, tags profiles and links to the source", () => {
  expect(row()).toEqual({
    title: "Développeur Python",
    company: "Acme",
    min: 500,
    max: 600,
    region: "Occitanie",
    city: "Toulouse",
    remote: "partial",
    experience: "senior",
    published: "2026-11-10",
    expires: "2027-01-09",
    profiles: ["swe", "python"],
    links: [
      {
        source: "free-work",
        url: "https://www.free-work.com/fr/tech-it/job-mission/dev/python-1",
      },
    ],
  });
});

test("toPublic drops rates that can't be a daily rate", () => {
  const offer = row({ min_rate: 45, max_rate: 60000 });
  expect([offer.min, offer.max]).toEqual([null, null]);
});

test("toPublic leaves an offer matching no profile untagged", () => {
  expect(row({ title: "Acheteur IT" }).profiles).toEqual([]);
});

test("titleKey ignores case, accents, punctuation and gender markers", () => {
  expect(titleKey("Développeur Python (H/F)")).toBe("developpeur python");
  expect(titleKey("DEVELOPPEUR  PYTHON - F/H")).toBe("developpeur python");
  expect(titleKey("Développeur·euse C++ H/F/X")).toBe("developpeureuse c++");
  expect(titleKey("Lead C# / .NET")).toBe("lead c# net");
});

test("dropReposts keeps the newest of one company's same title in one city", () => {
  const kept = dropReposts([
    row({ id: "1", published: "2026-11-01" }),
    row({ id: "2", published: "2026-11-10", title: "Développeur Python H/F" }),
    row({ id: "3", published: "2026-11-05", city: "Lyon" }),
    row({ id: "4", published: "2026-11-05", company: "Other" }),
  ]);
  expect(
    kept.map((offer) => [offer.company, offer.city, offer.published]),
  ).toEqual([
    ["Acme", "Toulouse", "2026-11-10"],
    ["Acme", "Lyon", "2026-11-05"],
    ["Other", "Toulouse", "2026-11-05"],
  ]);
});

test("dropReposts never groups offers that name no company", () => {
  const kept = dropReposts([fiRow({ id: "a" }), fiRow({ id: "b" })]);
  expect(kept).toHaveLength(2);
});

test("mergeSources joins one mission found on two platforms into one row", () => {
  const merged = mergeSources(
    [fiRow({ title: "Développeur Python H/F" }), row()],
    ORDER,
  );
  expect(merged).toEqual([
    {
      title: "Développeur Python",
      company: "Acme",
      min: 500,
      max: 600,
      region: "Occitanie",
      city: "Toulouse",
      remote: "partial",
      experience: "senior",
      published: "2026-11-10",
      expires: "2027-02-12",
      profiles: ["swe", "python"],
      links: [
        {
          source: "free-work",
          url: "https://www.free-work.com/fr/tech-it/job-mission/dev/python-1",
        },
        {
          source: "freelance-informatique",
          url: "https://www.freelance-informatique.fr/mission-python-261110I001",
        },
      ],
    },
  ]);
});

test("mergeSources fills fields the first platform leaves empty", () => {
  const [merged] = mergeSources(
    [row({ region: null, remote: null }), fiRow({ remote: "full" })],
    ORDER,
  );
  expect(merged?.region).toBe("Occitanie");
  expect(merged?.remote).toBe("full");
});

test("mergeSources leaves offers apart when several could match", () => {
  const offers = [
    row({ id: "1" }),
    row({ id: "2", company: "Other" }),
    fiRow(),
  ];
  expect(mergeSources(offers, ORDER)).toHaveLength(3);
});

test("mergeSources leaves offers apart when the companies differ", () => {
  const offers = [row(), fiRow({ company: "Other" })];
  expect(mergeSources(offers, ORDER)).toHaveLength(2);
});

test("mergeSources leaves offers apart without a city or in different cities", () => {
  expect(
    mergeSources([row({ city: null }), fiRow({ city: null })], ORDER),
  ).toHaveLength(2);
  expect(mergeSources([row(), fiRow({ city: "Lyon" })], ORDER)).toHaveLength(2);
});

test("mergeSources leaves offers apart when published more than 30 days apart", () => {
  const offers = [row({ published: "2026-09-01" }), fiRow()];
  expect(mergeSources(offers, ORDER)).toHaveLength(2);
});

test("mergeSources never merges two offers from the same platform", () => {
  const offers = [fiRow({ id: "a" }), fiRow({ id: "b" })];
  expect(mergeSources(offers, ORDER)).toHaveLength(2);
});

const SOURCES = [
  { id: "free-work", label: "Free-Work" },
  { id: "freelance-informatique", label: "Freelance-Informatique" },
];
const build = (
  freeWork: SourceOffer[] | null,
  fi: SourceOffer[] | null,
  previous: OffersFile | null = null,
  excluded: string[] = [],
  now = NOW,
) =>
  buildOffers(
    [
      { ...SOURCES[0]!, offers: freeWork },
      { ...SOURCES[1]!, offers: fi },
    ],
    previous,
    now,
    excluded,
  );

test("buildOffers lists newest first and reports each source", () => {
  const file = build(
    [
      sourceOffer({
        id: "1",
        title: "Développeur Go",
        published: "2026-11-01",
      }),
      sourceOffer({ id: "2", published: "2026-11-15" }),
    ],
    [fromFi({ title: "Architecte Cloud AWS", city: "Massy" })],
  );
  expect(file.generatedAt).toBe("2026-11-17T07:00:00.000Z");
  expect(file.offers.map((offer) => offer.title)).toEqual([
    "Développeur Python",
    "Architecte Cloud AWS",
    "Développeur Go",
  ]);
  expect(file.merged).toBe(0);
  expect(file.sources).toEqual([
    {
      id: "free-work",
      label: "Free-Work",
      updatedAt: "2026-11-17T07:00:00.000Z",
      offers: 2,
    },
    {
      id: "freelance-informatique",
      label: "Freelance-Informatique",
      updatedAt: "2026-11-17T07:00:00.000Z",
      offers: 1,
    },
  ]);
});

test("buildOffers counts merged rows once per platform", () => {
  const file = build([sourceOffer()], [fromFi()]);
  expect(file.offers).toHaveLength(1);
  expect(file.merged).toBe(1);
  expect(file.sources.map((source) => source.offers)).toEqual([1, 1]);
});

test("buildOffers drops expired offers and excluded companies", () => {
  const file = build(
    [
      sourceOffer({ id: "1", expires: "2026-11-16" }),
      sourceOffer({ id: "2", company: "  ACMÉ Consulting " }),
      sourceOffer({ id: "3", company: "Kept", expires: "2026-11-17" }),
    ],
    [],
    null,
    ["acme consulting"],
  );
  expect(file.offers.map((offer) => offer.company)).toEqual(["Kept"]);
});

test("buildOffers keeps one row per offer id within a platform", () => {
  const file = build([sourceOffer(), sourceOffer({ company: "Other" })], []);
  expect(file.offers).toHaveLength(1);
});

test("buildOffers carries a failed platform over from the previous file", () => {
  const previous = build([sourceOffer()], [fromFi()]);
  const nextDay = new Date("2026-11-18T07:00:00Z");
  const file = build(null, [fromFi()], previous, [], nextDay);

  expect(file.offers).toHaveLength(1);
  expect(file.offers[0]?.links.map((link) => link.source)).toEqual(ORDER);
  expect(file.offers[0]?.company).toBe("Acme");
  expect(file.sources).toEqual([
    {
      id: "free-work",
      label: "Free-Work",
      updatedAt: "2026-11-17T07:00:00.000Z",
      offers: 1,
    },
    {
      id: "freelance-informatique",
      label: "Freelance-Informatique",
      updatedAt: "2026-11-18T07:00:00.000Z",
      offers: 1,
    },
  ]);
});

test("buildOffers carries over only the failed platform's side of a merged row", () => {
  const previous = build([sourceOffer()], [fromFi()]);
  const nextDay = new Date("2026-11-18T07:00:00Z");
  // The mission left Freelance-Informatique, and Free-Work failed today.
  const file = build(null, [], previous, [], nextDay);

  expect(file.offers).toHaveLength(1);
  expect(file.offers[0]?.links.map((link) => link.source)).toEqual([
    "free-work",
  ]);
});

test("buildOffers drops a platform that has failed for more than 3 days", () => {
  const previous = build([sourceOffer()], []);
  const later = new Date("2026-11-21T08:00:00Z");
  const file = build(null, [fromFi()], previous, [], later);

  expect(file.offers.map((offer) => offer.links[0]?.source)).toEqual([
    "freelance-informatique",
  ]);
  expect(file.sources[0]).toEqual({
    id: "free-work",
    label: "Free-Work",
    updatedAt: "2026-11-17T07:00:00.000Z",
    offers: 0,
  });
});

test("buildOffers reports a platform that never succeeded", () => {
  const file = build(null, [fromFi()]);
  expect(file.sources[0]).toEqual({
    id: "free-work",
    label: "Free-Work",
    updatedAt: null,
    offers: 0,
  });
});

test("buildOffers names the profiles offers are tagged with", () => {
  const file = build([sourceOffer()], []);
  expect(file.profiles).toContainEqual({
    id: "python",
    label: "Python",
    group: "Langages",
  });
});

test("summarize counts the open offers in total and per profile", () => {
  const file = build(
    [
      sourceOffer({ id: "1" }),
      sourceOffer({ id: "2", title: "Développeur Go", company: "Other" }),
      sourceOffer({ id: "3", title: "Acheteur IT", company: "Third" }),
    ],
    [],
  );
  expect(summarize(file)).toEqual({
    generatedAt: "2026-11-17T07:00:00.000Z",
    offers: 3,
    profiles: { swe: 2, python: 1, go: 1 },
  });
});
