import { expect, test } from "bun:test";
import {
  buildStats,
  dailyRate,
  dropReposts,
  monthRange,
  type OfferRow,
  quartiles,
} from "./stats";

const offer = (overrides: Partial<OfferRow> = {}): OfferRow => ({
  title: "Développeur Python",
  company: "Acme",
  job: "Autre",
  skills: [],
  min_rate: 500,
  max_rate: 600,
  day: "2026-01-15",
  remote: null,
  experience: null,
  region: null,
  country: null,
  ...overrides,
});

const NOW = new Date("2026-03-10T07:00:00Z");

test("dailyRate averages valid bounds and ignores impossible values", () => {
  expect(dailyRate(500, 600)).toBe(550);
  expect(dailyRate(null, 600)).toBe(600);
  expect(dailyRate(1, 600)).toBe(600);
  expect(dailyRate(500, 45000)).toBe(500);
  expect(dailyRate(0, 75500)).toBeNull();
  expect(dailyRate(null, null)).toBeNull();
});

test("quartiles hides groups under the minimum size", () => {
  expect(quartiles([500, 550, 600, 650])).toBeNull();
  expect(quartiles([500, 550, 600, 650, 700])).toEqual({
    p25: 550,
    p50: 600,
    p75: 650,
  });
});

test("dropReposts keeps a title again after 30 days", () => {
  const kept = dropReposts([
    offer({ day: "2026-01-01" }),
    offer({ day: "2026-01-10", title: "  DÉVELOPPEUR python " }),
    offer({ day: "2026-01-10", company: "Other" }),
    offer({ day: "2026-03-01" }),
  ]);
  expect(kept.map((row) => `${row.company} ${row.day}`)).toEqual([
    "Acme 2026-01-01",
    "Other 2026-01-10",
    "Acme 2026-03-01",
  ]);
});

test("monthRange includes months without offers, across a year boundary", () => {
  expect(monthRange("2025-11", "2026-02")).toEqual([
    "2025-11",
    "2025-12",
    "2026-01",
    "2026-02",
  ]);
});

test("buildStats drops the partial first and current months", () => {
  const stats = buildStats(
    [
      offer({ day: "2025-12-20", company: "A" }),
      offer({ day: "2026-01-15", company: "B" }),
      offer({ day: "2026-03-01", company: "C" }),
    ],
    NOW,
  );
  expect(stats.months).toEqual(["2026-01", "2026-02"]);
  expect(stats.offers).toBe(1);
});

test("published output never contains offer-level fields or small groups", () => {
  const rows = [
    offer({ day: "2025-12-20", company: "Secret Corp", title: "Pentester" }),
    offer({ day: "2026-01-15", company: "Secret Corp", title: "Pentester" }),
    offer({
      day: "2026-02-15",
      company: "Secret Corp",
      title: "Pentester senior",
    }),
  ];
  const stats = buildStats(rows, NOW);
  const json = JSON.stringify(stats);
  expect(json).not.toContain("Secret Corp");
  expect(json).not.toContain("Pentester");
  const pentest = stats.categories.find(
    (category) => category.id === "pentest",
  );
  expect(pentest?.volume).toEqual([null, null]);
  expect(pentest?.p50).toEqual([null, null]);
  expect(pentest?.rate).toBeNull();
});

test("an offer counts in every category it matches", () => {
  const rows = [
    offer({ day: "2025-12-20" }),
    ...Array.from({ length: 5 }, (_, index) =>
      offer({ title: `Développeur Python Angular ${index}` }),
    ),
    offer({ day: "2026-02-01" }),
  ];
  const stats = buildStats(rows, NOW);
  const count = (id: string) =>
    stats.categories.find((category) => category.id === id)?.n;
  expect(count("python")).toBe(6);
  expect(count("js")).toBe(5);
  expect(count("all")).toBe(6);
});
