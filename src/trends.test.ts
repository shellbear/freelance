import { expect, test } from "bun:test";
import { remoteSeries } from "./remote";
import {
  formatChange,
  formatGrowth,
  formatRate,
  combine,
  pick,
  shorten,
  subgroupTrends,
  type Trend,
  trends,
  trendsCsv,
} from "./trends";

const category = (id: string, nPrior: number, n: number) => ({
  id,
  label: id,
  n,
  nPrior,
});

test("trends sorts profiles into growing, stable and shrinking", () => {
  const result = trends([
    category("all", 1000, 1004),
    category("ai", 100, 226),
    category("js", 200, 196),
    category("product", 300, 200),
  ]);
  expect(result.market?.change).toBeCloseTo(0.4);
  expect(result.up.map((t) => t.id)).toEqual(["ai"]);
  expect(result.stable.map((t) => t.id)).toEqual(["js"]);
  expect(result.down.map((t) => t.id)).toEqual(["product"]);
});

test("trends leaves out profiles too small in either year", () => {
  const result = trends([category("go", 111, 69), category("rust", 15, 12)]);
  expect([...result.up, ...result.stable, ...result.down]).toEqual([]);
});

test("trends adds a security total, including small security profiles", () => {
  const result = trends([
    category("cyber", 1896, 1786),
    category("devsecops", 209, 315),
    category("pentest", 53, 43),
  ]);
  const total = result.stable.find((t) => t.id === "security");
  expect(total).toMatchObject({ n: 2144, nPrior: 2158, linkable: false });
  expect(result.up.map((t) => t.id)).toEqual(["devsecops"]);
  expect(result.down.map((t) => t.id)).toEqual(["cyber"]);
});

test("formatChange keeps one decimal only for small changes", () => {
  expect(formatChange(125.896)).toBe("+126 %");
  expect(formatChange(-0.62)).toBe("−0,6 %");
  expect(formatChange(0.01)).toBe("0 %");
});

test("trendsCsv lists every ranked profile with its trend", () => {
  const csv = trendsCsv(
    trends([category("ai", 100, 226), category("Java, Kotlin", 300, 200)]),
  );
  expect(csv).toBe(
    "profil,tendance,offres_annee_precedente,offres_12_derniers_mois,evolution_pct,tjm_median_annee_precedente,tjm_median_12_derniers_mois\n" +
      "ai,hausse,100,226,126.0,,\n" +
      '"Java, Kotlin",baisse,300,200,-33.3,,\n',
  );
});

test("formatRate shows the median and its yearly move", () => {
  const [ai] = trends([
    {
      ...category("ai", 100, 226),
      rate: { p50: 500 },
      ratePrior: { p50: 500 },
    },
  ]).up;
  const [cloud] = trends([
    {
      ...category("cloud", 100, 132),
      rate: { p50: 525 },
      ratePrior: { p50: 550 },
    },
  ]).up;
  expect(formatRate(ai as Trend)).toEqual({ rate: "500\u00a0€", move: "=" });
  expect(formatRate(cloud as Trend)?.move).toBe("−25\u00a0€");
});

test("the security total has no median rate", () => {
  const total = trends([
    { ...category("cyber", 1000, 1000), rate: { p50: 525 } },
    { ...category("devsecops", 200, 220), rate: { p50: 500 } },
  ]).stable.find((t) => t.id === "security");
  expect(total && formatRate(total)).toBeNull();
});

test("remoteSeries turns monthly counts into shares and skips empty months", () => {
  expect(
    remoteSeries(
      ["2025-12", "2026-01"],
      [null, { n: 200, none: 20, partial: 174, full: 6 }],
    ),
  ).toEqual([{ month: "2026-01", n: 200, onsite: 10, hybrid: 87, full: 3 }]);
});

test("subgroupTrends ranks large subgroups and links them to their profile", () => {
  const result = subgroupTrends([
    {
      ...category("data-eng", 1072, 1294),
      label: "Data Engineer",
      subgroups: [
        { id: "databricks", label: "Databricks", nPrior: 66, n: 167 },
        { id: "snowflake", label: "Snowflake", nPrior: 33, n: 62 },
        { id: "other", label: "Autre", nPrior: 693, n: 782 },
      ],
    },
    {
      ...category("js", 2259, 2239),
      label: "JS / TS",
      subgroups: [
        { id: "frontend", label: "Front-end", nPrior: 1209, n: 1022 },
        { id: "node", label: "Node / back-end", nPrior: 148, n: 131 },
      ],
    },
    { ...category("frontend", 1247, 1053), label: "Front-end" },
  ]);
  expect(result.up).toMatchObject([
    { id: "data-eng-databricks", note: "Data Engineer", profile: "data-eng" },
  ]);
  expect(result.down.map((t) => t.label)).toEqual(["Node / back-end"]);
  expect(result.stable).toEqual([]);
});

test("shorten keeps the biggest risers and fallers, pick filters rows", () => {
  const result = trends(
    [-40, -30, -20, -10, 0, 10, 20, 30, 40, 50, 60, 70, 80].map(
      (change, i) => ({
        ...category(`p${i}`, 1000, 1000 + change * 10),
        group: i % 2 ? "Rôles" : "Langages",
      }),
    ),
  );
  const short = shorten(result);
  expect(short.up.map((t) => t.change)).toEqual([80, 70, 60, 50, 40, 30]);
  expect(short.stable).toEqual([]);
  expect(short.down.map((t) => t.change)).toEqual([-10, -20, -30, -40]);
  const roles = pick(result, (t) => t.group === "Rôles");
  expect([...roles.up, ...roles.stable, ...roles.down].length).toBe(6);
});

test("formatGrowth uses a multiplier only once a count has doubled", () => {
  const [ai, tech] = trends([
    category("ai", 345, 1045),
    category("tech-lead", 1143, 1511),
  ]).up;
  expect(formatGrowth(ai as Trend)).toBe("×3");
  expect(formatGrowth(tech as Trend)).toBe("+32\u202f%");
});

test("a profile view combines the profile with its own subgroups", () => {
  const categories = [
    {
      ...category("mobile", 375, 362),
      label: "Mobile",
      subgroups: [
        { id: "ios", label: "iOS", nPrior: 93, n: 59 },
        { id: "flutter", label: "Flutter", nPrior: 47, n: 46 },
        { id: "native", label: "iOS + Android", nPrior: 15, n: 25 },
      ],
    },
    {
      ...category("data-eng", 1072, 1294),
      label: "Data Engineer",
      subgroups: [
        { id: "databricks", label: "Databricks", nPrior: 66, n: 167 },
      ],
    },
  ];
  const view = combine(
    pick(trends(categories), (t) => t.id === "mobile"),
    subgroupTrends(categories, { only: "mobile", min: 20 }),
  );
  const rows = [...view.up, ...view.stable, ...view.down];
  expect(rows.map((t) => t.label)).toEqual(["Flutter", "Mobile", "iOS"]);
});
