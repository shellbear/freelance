import { expect, test } from "bun:test";
import { parseListing } from "./silkhom";

const NOSCRIPT = `<img src="data:image/svg+xml,x" data-lazy-src="/pin.svg"/><noscript><img src="/pin.svg"/></noscript>`;

const card = ({
  id = "521586",
  classes = "contrat-Freelance domains-developpement-logiciel-qa  locations-ile-de-france category-api",
  url = "https://www.silkhom.com/annonce/developpeur-python/",
  title = "Développeur Python",
  city = "Paris",
  contract = "Freelance",
  date = "17/11/2026",
  hidden = false,
} = {}) => `
<div post-id="${id}" offer-i="3" class="wrapper-offre ${classes}"${hidden ? ' style="display:none;"' : ""}>
  <div class="padding">
    <h2><a href="${url}">${title}</a></h2>
    <div class="infos-lieu-date">
      <p>${NOSCRIPT}${city}</p>
      <p>${NOSCRIPT}${contract}</p>
      <p>${NOSCRIPT}${date}</p>
    </div>
    <div class="conteneur-description">Never read.</div>
  </div>
</div>`;

const page = (...cards: string[]) =>
  `<html><body><div class="listing-offres">${cards.join("")}</div></body></html>`;

test("parseListing reads a freelance offer, including hidden ones", () => {
  expect(parseListing(page(card({ hidden: true })))).toEqual([
    {
      source: "silkhom",
      id: "521586",
      title: "Développeur Python",
      company: "Silkhom",
      url: "https://www.silkhom.com/annonce/developpeur-python/",
      job: null,
      min_rate: null,
      max_rate: null,
      region: "Île-de-France",
      city: "Paris",
      remote: null,
      experience: null,
      published: "2026-11-17",
      expires: "2027-02-15",
    },
  ]);
});

test("parseListing keeps only freelance offers", () => {
  const cdi = card({
    classes: "contrat-CDI domains-data-ia locations-bretagne",
    contract: "CDI",
  });
  expect(parseListing(page(cdi))).toEqual([]);
});

test("parseListing keeps only IT offers", () => {
  const welder = card({
    id: "1",
    classes: "contrat-Freelance domains-mecanique locations-occitanie",
    title: "Monteur Soudeur",
  });
  const support = card({
    id: "2",
    classes:
      "contrat-Freelance domains-production domains-infrastructure-cloud-devops locations-occitanie",
    title: "Technicien support IT",
  });
  expect(parseListing(page(welder, support)).map((offer) => offer.id)).toEqual([
    "2",
  ]);
});

test("parseListing skips offers outside France", () => {
  const abroad = card({
    classes: "contrat-Freelance domains-data-ia locations-maroc",
    city: "Casablanca",
  });
  expect(parseListing(page(abroad))).toEqual([]);
});

test("parseListing reads a fully remote offer as remote with no place", () => {
  const [offer] = parseListing(
    page(
      card({
        classes: "contrat-Freelance domains-data-ia locations-100-teletravail",
        city: "100% Télétravail",
      }),
    ),
  );
  expect([offer?.remote, offer?.region, offer?.city]).toEqual([
    "full",
    null,
    null,
  ]);
});

test("parseListing names regions as the other platforms do", () => {
  const region = (slug: string) =>
    parseListing(
      page(card({ classes: `contrat-Freelance domains-data-ia ${slug}` })),
    )[0]?.region;
  expect(region("locations-paca")).toBe("Provence-Alpes-Côte d'Azur");
  expect(region("locations-auvergne-rhone-alpes")).toBe("Auvergne-Rhône-Alpes");
  expect(region("locations-ile-de-france-bretagne")).toBeNull();
});

test("parseListing decodes HTML entities in titles and cities", () => {
  const [offer] = parseListing(
    page(
      card({
        title: "Chef de projet &#8211; R&amp;D d&rsquo;un éditeur",
        city: "L&rsquo;Isle-d&rsquo;Abeau",
      }),
    ),
  );
  expect(offer?.title).toBe("Chef de projet – R&D d’un éditeur");
  expect(offer?.city).toBe("L’Isle-d’Abeau");
});

test("parseListing skips links that don't point to the platform and unreadable dates", () => {
  const offers = parseListing(
    page(
      card({ id: "1", url: "javascript:alert(1)" }),
      card({ id: "2", url: "https://evil.example/annonce/x/" }),
      card({ id: "3", date: "bientôt" }),
    ),
  );
  expect(offers).toEqual([]);
});
