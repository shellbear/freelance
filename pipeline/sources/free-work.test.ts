import { expect, test } from "bun:test";
import { type Posting, toOffer } from "./free-work";

const posting = (overrides: Partial<Posting> = {}): Posting => ({
  id: 694931,
  title: "Ingénieur système projet H/F",
  slug: "ingenieur-systeme-projet-h-f",
  minDailySalary: 450,
  maxDailySalary: 550,
  publishedAt: "2026-11-17T16:07:10+01:00",
  expiredAt: "2027-01-16T16:07:10+01:00",
  remoteMode: "partial",
  experienceLevel: "intermediate",
  company: { name: "HAYS France " },
  job: {
    nameForUser: "Administrateur·rice système Unix (linux...)",
    nameForUserSlug: "administrateur-systeme-linux",
  },
  location: {
    locality: "Tours",
    adminLevel1: "Centre-Val de Loire",
    countryCode: "FR",
  },
  ...overrides,
});

test("toOffer maps a posting and links to its page on Free-Work", () => {
  expect(toOffer(posting())).toEqual({
    source: "free-work",
    id: "694931",
    title: "Ingénieur système projet H/F",
    company: "HAYS France",
    url: "https://www.free-work.com/fr/tech-it/job-mission/administrateur-systeme-linux/ingenieur-systeme-projet-h-f",
    job: "Administrateur·rice système Unix (linux...)",
    min_rate: 450,
    max_rate: 550,
    region: "Centre-Val de Loire",
    city: "Tours",
    remote: "partial",
    experience: "intermediate",
    published: "2026-11-17",
    expires: "2027-01-16",
  });
});

test("toOffer keeps an offer that states no location", () => {
  const offer = toOffer(posting({ location: null }));
  expect([offer?.region, offer?.city]).toEqual([null, null]);
});

test("toOffer skips offers outside France", () => {
  const abroad = { locality: "London", adminLevel1: null, countryCode: "GB" };
  expect(toOffer(posting({ location: abroad }))).toBeNull();
});
