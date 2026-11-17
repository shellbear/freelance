import { expect, test } from "bun:test";
import { CATEGORIES } from "./categories";
import {
  buildPages,
  demandTrend,
  pageTitle,
  hubPage,
  profileOf,
  profilePage,
  profilePath,
  rateTrend,
  sitemap,
} from "./pages";
import { buildStats, type OfferRow } from "./stats";

const NOW = new Date("2026-03-10T07:00:00Z");
const LEVELS = ["junior", "intermediate", "senior", "expert"];
const MODES = ["none", "partial", "full"];

/** Offers spread over the 14 months before NOW, with every breakdown filled in. */
function offers(title: string, count: number, base: number): OfferRow[] {
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(2025, index % 14, 1 + (index % 27)));
    return {
      title,
      company: `Société ${title} ${index}`,
      job: "Autre",
      skills: ["Python", "Django <ORM>"],
      min_rate: base + (index % 7) * 20,
      max_rate: base + 60 + (index % 7) * 20,
      day: month.toISOString().slice(0, 10),
      remote: MODES[index % 3] ?? null,
      experience: LEVELS[index % 4] ?? null,
      region: index % 2 ? "Île-de-France" : "Occitanie",
      country: "FR",
    };
  });
}

const stats = buildStats(
  [
    ...offers("Développeur Python", 140, 420),
    ...offers("Développeur Go", 70, 480),
    // Too few rated offers for a published rate: no page.
    ...offers("Développeur Rust", 3, 500),
  ],
  NOW,
);
const category = (id: string) => {
  const found = stats.categories.find((entry) => entry.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};
const python = category("python");
const jsonLd = (html: string) =>
  [
    ...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs),
  ].map((match) => JSON.parse(match[1] ?? ""));

test("every profile has its own readable, unique address", () => {
  const slugs = CATEGORIES.map(({ id, label }) => profileOf(id, label).slug);
  expect(new Set(slugs).size).toBe(slugs.length);
  for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  expect(profileOf("python", "Python")).toEqual({
    slug: "developpeur-python",
    name: "développeur Python",
  });
  expect(profilePath(python)).toBe("/tjm/developpeur-python");
});

test("pageTitle puts the searched words first and fits a search result", () => {
  expect(pageTitle("développeur Python", "2026", 475)).toBe(
    "TJM développeur Python freelance en 2026 : 475 € par jour",
  );
  expect(pageTitle("développeur JavaScript / TypeScript", "2026", 450)).toBe(
    "TJM développeur JavaScript / TypeScript freelance en 2026 : 450 €",
  );
});

test("profileOf falls back on the id and label for a profile it doesn't know", () => {
  expect(profileOf("cobol", "COBOL")).toEqual({ slug: "cobol", name: "COBOL" });
});

test("rateTrend words the yearly move of the median", () => {
  const rate = (p50: number) => ({ p25: 400, p50, p75: 600 });
  expect(rateTrend(rate(500), rate(500))).toBe(
    "Le TJM médian est stable sur un an.",
  );
  expect(rateTrend(rate(525), rate(500))).toBe(
    "Le TJM médian a gagné 25 € sur un an (500 € un an plus tôt).",
  );
  expect(rateTrend(rate(480), rate(500))).toBe(
    "Le TJM médian a perdu 20 € sur un an (500 € un an plus tôt).",
  );
  expect(rateTrend(rate(500), null)).toBe("");
});

test("demandTrend words the yearly move of the offers, when there were enough", () => {
  expect(demandTrend(1106, 922)).toBe(
    "Le nombre d'offres a progressé de 20 % sur un an (1 106 contre 922).",
  );
  expect(demandTrend(80, 100)).toBe(
    "Le nombre d'offres a reculé de 20 % sur un an (80 contre 100).",
  );
  expect(demandTrend(102, 100)).toBe(
    "Le nombre d'offres est stable sur un an (102 contre 100).",
  );
  expect(demandTrend(40, 12)).toBe("");
});

test("profilePage leads with the median rate in its title, description and first paragraph", () => {
  const html = profilePage(stats, python);
  const median = `${python.rate?.p50} €`;
  expect(html).toContain(
    `<title>TJM développeur Python freelance en 2026 : ${median} par jour</title>`,
  );
  expect(html).toContain(
    '<link rel="canonical" href="https://freelance.shellbear.me/tjm/developpeur-python" />',
  );
  expect(html).toContain("<h1>TJM développeur Python freelance</h1>");
  expect(html).toMatch(
    new RegExp(`<meta\\s+name="description"\\s+content="[^"]*${median}[^"]*"`),
  );
  expect(html).toContain(`<strong>${median} par jour</strong>`);
  expect(html).toContain('<html lang="fr">');
});

test("profilePage shows the median, the usual range and the offers on its leaf", () => {
  const html = profilePage(stats, python);
  const rate = python.rate;
  if (!rate) throw new Error("no rate");
  expect(html).toContain('<p class="binding">Python</p>');
  expect(html).toContain(`<p class="figure">${rate.p50} €</p>`);
  expect(html).toContain(`<dd>${rate.p25}–${rate.p75} €</dd>`);
  expect(html).toContain(`<dt>Offres sur 12 mois</dt><dd>${python.n}</dd>`);
  // The first paragraph already says all of it in words.
  expect(html).toContain('<div class="pad" aria-hidden="true">');
});

test("profilePage writes every breakdown into the page as text", () => {
  const html = profilePage(stats, python);
  for (const label of ["Junior", "Confirmé", "Senior", "Expert"])
    expect(html).toContain(`<th scope="row">${label}</th>`);
  for (const label of [
    "Sur site",
    "Hybride",
    "Île-de-France",
    "Autres régions",
  ])
    expect(html).toContain(`<th scope="row">${label}</th>`);
  expect(html).toContain("Comment le TJM a-t-il évolué sur 12 mois");
  expect(html).toContain('<th scope="row">Février 2026</th>');
});

test("profilePage escapes text taken from the offers", () => {
  const html = profilePage(stats, python);
  expect(html).toContain("Django &lt;ORM&gt;");
  expect(html).not.toContain("Django <ORM>");
});

test("profilePage links to the interactive view, the open missions and the other profiles", () => {
  const html = profilePage(stats, python);
  expect(html).toContain('href="/#python"');
  expect(html).toContain('href="/missions?profil=python"');
  expect(html).toContain('href="/tjm/developpeur-go"');
  expect(html).toContain('href="/tjm/"');
  expect(html).not.toContain("developpeur-rust");
});

test("profilePage describes where it sits in the site for search engines", () => {
  const [breadcrumb] = jsonLd(profilePage(stats, python));
  expect(breadcrumb["@type"]).toBe("BreadcrumbList");
  expect(
    breadcrumb.itemListElement.map((item: { name: string }) => item.name),
  ).toEqual(["TJM freelance IT", "TJM par profil", "développeur Python"]);
  expect(breadcrumb.itemListElement[1].item).toBe(
    "https://freelance.shellbear.me/tjm/",
  );
});

test("profilePage warns when a profile rests on few offers", () => {
  expect(profilePage(stats, category("go"))).toContain("à lire avec prudence");
  expect(profilePage(stats, python)).not.toContain("à lire avec prudence");
});

test("hubPage lists every profile that has a rate, with its figures", () => {
  const html = hubPage(stats);
  expect(html).toContain(
    "<title>TJM freelance IT en 2026 : tarifs par métier et par langage</title>",
  );
  expect(html).toContain(
    '<link rel="canonical" href="https://freelance.shellbear.me/tjm/" />',
  );
  expect(html).toContain('<a href="/tjm/developpeur-python">Python</a>');
  expect(html).toContain(`${python.rate?.p50} €`);
  expect(html).not.toContain("developpeur-rust");
  const [dataset] = jsonLd(html);
  expect(dataset["@type"]).toBe("Dataset");
  expect(dataset.distribution[0].contentUrl).toBe(
    "https://freelance.shellbear.me/data.json",
  );
});

test("hubPage shows the whole market on its leaf", () => {
  const html = hubPage(stats);
  const market = category("all");
  expect(html).toContain('<p class="binding">Tous profils</p>');
  expect(html).toContain(`<p class="figure">${market.rate?.p50} €</p>`);
  expect(html).toContain(`<dt>Offres depuis 2025</dt><dd>${stats.offers}</dd>`);
});

test("sitemap lists addresses with the day the data was last updated", () => {
  expect(sitemap(["/", "/tjm/developpeur-python"], "2026-03-10")).toBe(
    `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://freelance.shellbear.me/</loc><lastmod>2026-03-10</lastmod></url>
  <url><loc>https://freelance.shellbear.me/tjm/developpeur-python</loc><lastmod>2026-03-10</lastmod></url>
</urlset>
`,
  );
});

test("buildPages writes the hub, one page per rated profile and the sitemap", () => {
  const pages = buildPages(stats);
  const paths = [...pages.keys()];
  expect(paths).toContain("tjm/index.html");
  expect(paths).toContain("tjm/developpeur-python.html");
  expect(paths).toContain("tjm/developpeur-go.html");
  expect(paths).not.toContain("tjm/developpeur-rust.html");
  expect(paths).not.toContain("tjm/all.html");
  const map = pages.get("sitemap.xml") ?? "";
  for (const path of [
    "/",
    "/tendances",
    "/missions",
    "/tjm/",
    "/tjm/developpeur-go",
  ])
    expect(map).toContain(`<loc>https://freelance.shellbear.me${path}</loc>`);
  expect(map).toContain("<lastmod>2026-03-10</lastmod>");
});
