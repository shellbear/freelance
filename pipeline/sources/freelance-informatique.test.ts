import { expect, test } from "bun:test";
import { parseListing } from "./freelance-informatique";

const posting = (overrides: Record<string, unknown> = {}) => ({
  "@type": "JobPosting",
  title: "Développeur ABAP",
  url: "https://www.freelance-informatique.fr/mission-developpeur-abap-sur-blagnac-261117I005",
  description: "<p>Never read.</p>",
  datePosted: "2026-11-17",
  validThrough: "2027-02-17",
  employmentType: "CONTRACTOR",
  hiringOrganization: {
    "@type": "Organization",
    name: "Freelance-Informatique",
  },
  identifier: { "@type": "PropertyValue", value: "261117I005" },
  jobLocation: {
    "@type": "Place",
    address: {
      addressLocality: "Blagnac",
      addressRegion: "Occitanie",
      postalCode: "31",
      addressCountry: "FR",
    },
  },
  ...overrides,
});

const page = (...items: unknown[]) => `<html><head>
<script type="application/ld+json">{"@type":"BreadcrumbList","itemListElement":[]}</script>
<script type="application/ld+json">not json</script>
<script type="application/ld+json">${JSON.stringify({
  "@type": "ItemList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    item,
  })),
})}</script></head><body></body></html>`;

test("parseListing reads the missions a listing page declares", () => {
  expect(parseListing(page(posting()))).toEqual([
    {
      source: "freelance-informatique",
      id: "261117I005",
      title: "Développeur ABAP",
      company: null,
      url: "https://www.freelance-informatique.fr/mission-developpeur-abap-sur-blagnac-261117I005",
      job: null,
      min_rate: null,
      max_rate: null,
      region: "Occitanie",
      city: "Blagnac",
      remote: null,
      experience: null,
      published: "2026-11-17",
      expires: "2027-02-17",
    },
  ]);
});

test("parseListing decodes HTML entities in titles", () => {
  const [offer] = parseListing(
    page(posting({ title: "Technicien retail &#x2013; R&amp;D &#233;quipe" })),
  );
  expect(offer?.title).toBe("Technicien retail – R&D équipe");
});

test("parseListing skips missions outside France or without a link", () => {
  const abroad = posting({
    jobLocation: {
      address: { addressLocality: "Tunis", addressCountry: "TN" },
    },
  });
  expect(parseListing(page(abroad, posting({ url: undefined })))).toEqual([]);
});

test("parseListing tolerates a mission with no location", () => {
  const [offer] = parseListing(page(posting({ jobLocation: undefined })));
  expect([offer?.region, offer?.city]).toEqual([null, null]);
});

test("parseListing returns nothing for a page with no missions", () => {
  expect(parseListing("<html></html>")).toEqual([]);
});

test("parseListing spells regions as the other platforms do", () => {
  const paris = posting({
    jobLocation: {
      address: {
        addressLocality: "Massy",
        addressRegion: "Ile-de-France",
        addressCountry: "FR",
      },
    },
  });
  expect(parseListing(page(paris))[0]?.region).toBe("Île-de-France");
});

test("parseListing skips links that don't point to the platform over https", () => {
  const offers = parseListing(
    page(
      posting({ url: "javascript:alert(1)" }),
      posting({ url: "https://evil.example/mission-1" }),
      posting({ url: "http://www.freelance-informatique.fr/mission-1" }),
      posting({ url: "not a url" }),
    ),
  );
  expect(offers).toEqual([]);
});
