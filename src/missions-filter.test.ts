import { expect, test } from "bun:test";
import type { PublicOffer } from "../pipeline/offers";
import {
  ageLabel,
  DEFAULTS,
  filterOffers,
  type Filters,
  groupByDay,
  parseFilters,
  rateLabel,
  safeUrl,
  scalePosition,
  standing,
  toParams,
} from "./missions-filter";

const offer = (overrides: Partial<PublicOffer> = {}): PublicOffer => ({
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
  links: [{ source: "free-work", url: "https://example.com/1" }],
  ...overrides,
});

const filters = (overrides: Partial<Filters> = {}): Filters => ({
  ...DEFAULTS,
  ...overrides,
});
const titles = (offers: PublicOffer[], overrides: Partial<Filters>) =>
  filterOffers(offers, filters(overrides)).map((found) => found.title);

test("parseFilters reads the filters from a link and ignores unknown values", () => {
  const params = new URLSearchParams(
    "q=data&profil=go&tjm=600&region=Bretagne&teletravail=full&experience=senior&source=free-work&tri=tjm",
  );
  expect(parseFilters(params)).toEqual({
    q: "data",
    profile: "go",
    minRate: 600,
    region: "Bretagne",
    remote: "full",
    experience: "senior",
    source: "free-work",
    sort: "rate",
  });
  expect(parseFilters(new URLSearchParams("tjm=abc&tri=nope"))).toEqual(
    DEFAULTS,
  );
});

test("toParams writes only the filters that are set", () => {
  expect(toParams(DEFAULTS).toString()).toBe("");
  expect(
    toParams(filters({ profile: "go", minRate: 600, sort: "rate" })).toString(),
  ).toBe("profil=go&tjm=600&tri=tjm");
  const all = filters({
    q: "data",
    profile: "go",
    minRate: 600,
    region: "Bretagne",
    remote: "full",
    experience: "senior",
    source: "free-work",
    sort: "rate",
  });
  expect(parseFilters(toParams(all))).toEqual(all);
});

test("filterOffers searches title and company without accents or case", () => {
  const offers = [
    offer(),
    offer({ title: "Architecte Sécurité", company: "Zeta" }),
    offer({ title: "Chef de projet", company: null }),
  ];
  expect(titles(offers, { q: "SECURITE archi" })).toEqual([
    "Architecte Sécurité",
  ]);
  expect(titles(offers, { q: "acme" })).toEqual(["Développeur Python"]);
  expect(titles(offers, { q: "  " })).toHaveLength(3);
});

test("filterOffers filters by profile, region, remote, experience and platform", () => {
  const offers = [
    offer(),
    offer({
      title: "Dev Go",
      profiles: ["go"],
      region: "Bretagne",
      remote: "full",
      experience: "junior",
      links: [
        { source: "free-work", url: "https://example.com/2" },
        { source: "freelance-informatique", url: "https://example.com/3" },
      ],
    }),
  ];
  expect(titles(offers, { profile: "go" })).toEqual(["Dev Go"]);
  expect(titles(offers, { region: "Occitanie" })).toEqual([
    "Développeur Python",
  ]);
  expect(titles(offers, { remote: "full" })).toEqual(["Dev Go"]);
  expect(titles(offers, { experience: "senior" })).toEqual([
    "Développeur Python",
  ]);
  expect(titles(offers, { source: "freelance-informatique" })).toEqual([
    "Dev Go",
  ]);
});

test("filterOffers lists offers matching no profile under 'other'", () => {
  const offers = [offer(), offer({ title: "Acheteur IT", profiles: [] })];
  expect(titles(offers, { profile: "other" })).toEqual(["Acheteur IT"]);
});

test("filterOffers keeps offers whose top rate reaches the minimum", () => {
  const offers = [
    offer({ title: "range", min: 500, max: 600 }),
    offer({ title: "low", min: 400, max: null }),
    offer({ title: "none", min: null, max: null }),
    offer({ title: "top only", min: null, max: 650 }),
  ];
  expect(titles(offers, { minRate: 600 })).toEqual(["range", "top only"]);
});

test("filterOffers sorts by highest rate, with unstated rates last", () => {
  const offers = [
    offer({ title: "none", min: null, max: null }),
    offer({ title: "600", min: 500, max: 600 }),
    offer({ title: "700", min: 700, max: null }),
  ];
  expect(titles(offers, { sort: "rate" })).toEqual(["700", "600", "none"]);
  expect(titles(offers, {})).toEqual(["none", "600", "700"]);
});

test("rateLabel shows a range, a single rate or that none is stated", () => {
  expect(rateLabel(offer())).toBe("500–600 €");
  expect(rateLabel(offer({ min: 550, max: 550 }))).toBe("550 €");
  expect(rateLabel(offer({ min: null, max: 1200 }))).toBe("1\u202f200 €");
  expect(rateLabel(offer({ min: null, max: null }))).toBeNull();
});

test("ageLabel counts days since publication", () => {
  expect(ageLabel("2026-11-17", "2026-11-17")).toBe("aujourd'hui");
  expect(ageLabel("2026-11-16", "2026-11-17")).toBe("hier");
  expect(ageLabel("2026-11-10", "2026-11-17")).toBe("il y a 7 j");
  expect(ageLabel("2026-11-18", "2026-11-17")).toBe("aujourd'hui");
});

test("safeUrl only lets web links through", () => {
  expect(safeUrl("https://www.free-work.com/fr/a")).toBe(
    "https://www.free-work.com/fr/a",
  );
  expect(safeUrl("javascript:alert(1)")).toBe("#");
  expect(safeUrl("data:text/html,<script>alert(1)</script>")).toBe("#");
  expect(safeUrl(" JavaScript:alert(1)")).toBe("#");
  expect(safeUrl("not a url")).toBe("#");
  expect(safeUrl(undefined)).toBe("#");
});

const USUAL = { p25: 450, p50: 500, p75: 565 };

test("standing places an offer's rate against the profile's usual range", () => {
  expect(standing(offer({ min: 550, max: 700 }), USUAL)).toBe("above");
  expect(standing(offer({ min: 450, max: 510 }), USUAL)).toBe("inside");
  expect(standing(offer({ min: 280, max: 480 }), USUAL)).toBe("below");
  expect(standing(offer({ min: null, max: 600 }), USUAL)).toBe("above");
  expect(standing(offer({ min: 565, max: 565 }), USUAL)).toBe("inside");
});

test("standing is unknown without a rate or a usual range", () => {
  expect(standing(offer({ min: null, max: null }), USUAL)).toBeNull();
  expect(standing(offer(), null)).toBeNull();
});

test("scalePosition spreads rates from 200 to 1000 € and pins the rest to the ends", () => {
  expect(scalePosition(200)).toBe(0);
  expect(scalePosition(600)).toBe(50);
  expect(scalePosition(1000)).toBe(100);
  expect(scalePosition(90)).toBe(0);
  expect(scalePosition(1500)).toBe(100);
});

test("groupByDay groups the offers shown and counts each day in full", () => {
  const offers = [
    offer({ title: "a", published: "2026-11-17" }),
    offer({ title: "b", published: "2026-11-17" }),
    offer({ title: "c", published: "2026-11-16" }),
    offer({ title: "d", published: "2026-11-16" }),
    offer({ title: "e", published: "2026-11-15" }),
  ];
  const groups = groupByDay(offers, 3).map((group) => ({
    ...group,
    offers: group.offers.map((found) => found.title),
  }));
  expect(groups).toEqual([
    { day: "2026-11-17", total: 2, offers: ["a", "b"] },
    { day: "2026-11-16", total: 2, offers: ["c"] },
  ]);
});
