// The pages search engines can read: one per profile, a table of all of them,
// and the sitemap. The interactive pages draw their figures with JavaScript on
// a single address, so these carry the same statistics as plain text, each
// profile at its own address.
import type { buildStats } from "./stats";

type Stats = ReturnType<typeof buildStats>;
type Category = Stats["categories"][number];
type Quartiles = NonNullable<Category["rate"]>;

export const SITE = "https://freelance.shellbear.me";
/** Below this many offers in 12 months, a profile's figures come with a warning. */
const THIN = 100;
/** A yearly change in offers under this many percent reads as stable. */
const STABLE = 5;
/** Fewer offers than this the year before make a percentage meaningless. */
const MIN_PRIOR = 30;
const MARKET = "all";

/**
 * Each profile's address and the job name people search for. Addresses are
 * permanent: changing one loses the page's place in search results.
 */
const PROFILES: Record<string, { slug: string; name: string }> = {
  swe: { slug: "developpeur", name: "développeur" },
  "tech-lead": { slug: "tech-lead", name: "Tech Lead" },
  frontend: { slug: "developpeur-front-end", name: "développeur front-end" },
  backend: { slug: "developpeur-back-end", name: "développeur back-end" },
  fullstack: { slug: "developpeur-full-stack", name: "développeur full-stack" },
  architect: { slug: "architecte", name: "architecte IT" },
  "project-manager": { slug: "chef-de-projet", name: "chef de projet IT" },
  "business-analyst": {
    slug: "business-analyst",
    name: "Business Analyst / AMOA",
  },
  sap: { slug: "consultant-sap", name: "consultant SAP" },
  qa: { slug: "qa-testeur", name: "QA / testeur" },
  product: { slug: "product-owner", name: "Product Owner" },
  python: { slug: "developpeur-python", name: "développeur Python" },
  js: {
    slug: "developpeur-javascript-typescript",
    name: "développeur JavaScript / TypeScript",
  },
  java: { slug: "developpeur-java", name: "développeur Java / Kotlin" },
  go: { slug: "developpeur-go", name: "développeur Go" },
  rust: { slug: "developpeur-rust", name: "développeur Rust" },
  dotnet: { slug: "developpeur-dotnet", name: "développeur .NET / C#" },
  php: { slug: "developpeur-php", name: "développeur PHP" },
  cpp: { slug: "developpeur-c-cpp", name: "développeur C / C++ embarqué" },
  mobile: { slug: "developpeur-mobile", name: "développeur mobile" },
  devops: { slug: "devops", name: "DevOps / SRE" },
  sysadmin: { slug: "systeme-reseau", name: "ingénieur système et réseau" },
  cloud: { slug: "cloud", name: "ingénieur cloud" },
  devsecops: { slug: "devsecops", name: "DevSecOps" },
  cyber: { slug: "cybersecurite", name: "consultant cybersécurité" },
  pentest: { slug: "pentest", name: "pentester" },
  "data-eng": { slug: "data-engineer", name: "Data Engineer" },
  ai: { slug: "data-scientist-ia", name: "Data Scientist / ingénieur IA" },
  "ai-other": { slug: "ia", name: "IA hors data science" },
  "data-analyst": { slug: "data-analyst", name: "Data Analyst / BI" },
  dba: { slug: "dba", name: "DBA" },
};

const EXPERIENCE: Record<string, string> = {
  junior: "Junior",
  intermediate: "Confirmé",
  senior: "Senior",
  expert: "Expert",
};
const REMOTE: Record<string, string> = {
  none: "Sur site",
  partial: "Hybride",
  full: "100 % télétravail",
};
const LOCATION: Record<string, string> = {
  idf: "Île-de-France",
  regions: "Autres régions",
};

const number = new Intl.NumberFormat("fr-FR");
const euros = (value: number) => `${number.format(value)}\u00a0€`;
const range = (rate: Quartiles) =>
  `${number.format(rate.p25)} à ${euros(rate.p75)}`;
/** "entre 420 et 510 €", for use inside a sentence. */
const between = (rate: Quartiles) =>
  `entre ${number.format(rate.p25)} et ${euros(rate.p75)}`;
const longDay = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const longMonth = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
/** "Février 2026" */
const monthLabel = (month: string) =>
  capital(longMonth.format(new Date(`${month}-01T00:00:00Z`)));

const esc = (text: string) =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

/** A profile's address and searched name; an unknown profile keeps its id and label. */
export const profileOf = (id: string, label: string) =>
  PROFILES[id] ?? { slug: id, name: label };

export const profilePath = (category: { id: string; label: string }) =>
  `/tjm/${profileOf(category.id, category.label).slug}`;

/** Search results cut titles off at about this many characters. */
const TITLE_LENGTH = 60;

/** The search-result title: the searched words first, then the answer. Long names drop "par jour" to fit. */
export function pageTitle(name: string, year: string, median: number) {
  const title = `TJM ${name} freelance en ${year} : ${euros(median)}`;
  const full = `${title} par jour`;
  return full.length <= TITLE_LENGTH ? full : title;
}

/** "Le TJM médian a gagné 25 € sur un an (500 € un an plus tôt)." or "" without last year's rate. */
export function rateTrend(rate: Quartiles, prior: Quartiles | null): string {
  if (!prior) return "";
  const change = rate.p50 - prior.p50;
  if (change === 0) return "Le TJM médian est stable sur un an.";
  return `Le TJM médian a ${change > 0 ? "gagné" : "perdu"} ${euros(Math.abs(change))} sur un an (${euros(prior.p50)} un an plus tôt).`;
}

/** "Le nombre d'offres a progressé de 20 % sur un an (1 106 contre 922)." or "" when last year is too thin. */
export function demandTrend(n: number, nPrior: number): string {
  if (nPrior < MIN_PRIOR) return "";
  const percent = Math.round((100 * (n - nPrior)) / nPrior);
  const counts = `(${number.format(n)} contre ${number.format(nPrior)})`;
  if (Math.abs(percent) < STABLE)
    return `Le nombre d'offres est stable sur un an ${counts}.`;
  return `Le nombre d'offres a ${percent > 0 ? "progressé" : "reculé"} de ${Math.abs(percent)}\u00a0% sur un an ${counts}.`;
}

/** The profiles that have a published rate, and so a page. */
const rated = (stats: Stats) =>
  stats.categories.filter(
    (category) => category.id !== MARKET && category.rate !== null,
  );

function layout(page: {
  path: string;
  title: string;
  description: string;
  jsonLd: unknown;
  body: string;
}) {
  const url = SITE + page.path;
  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${esc(page.title)}</title>
    <meta name="description" content="${esc(page.description)}" />
    <meta name="theme-color" content="#0b0c0e" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:locale" content="fr_FR" />
    <meta property="og:title" content="${esc(page.title)}" />
    <meta property="og:description" content="${esc(page.description)}" />
    <meta property="og:image" content="${SITE}/og.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="/pages.css" />
    <script type="application/ld+json">${JSON.stringify(page.jsonLd).replaceAll("<", "\\u003c")}</script>
  </head>
  <body>
    <main>
${page.body}
    </main>
  </body>
</html>
`;
}

type Row = { label: string; n: number; rate: Quartiles };

const rateTable = (heading: string, rows: Row[]) => `
      <table>
        <thead>
          <tr><th scope="col">${heading}</th><th scope="col">TJM médian</th><th scope="col">Fourchette habituelle</th><th scope="col">Offres</th></tr>
        </thead>
        <tbody>${rows
          .map(
            (row) => `
          <tr><th scope="row">${esc(row.label)}</th><td>${euros(row.rate.p50)}</td><td>${range(row.rate)}</td><td>${number.format(row.n)}</td></tr>`,
          )
          .join("")}
        </tbody>
      </table>`;

const rowsOf = (
  groups: { key: string; n: number; p25: number; p50: number; p75: number }[],
  labels: Record<string, string>,
): Row[] =>
  groups.map(({ key, n, ...rate }) => ({ label: labels[key] ?? key, n, rate }));

const footer = (stats: Stats) => `
      <footer>
        <p>
          Source : offres publiées sur
          <a href="https://www.free-work.com/fr/tech-it/jobs" rel="noopener">Free-Work</a>.
          Site indépendant, sans lien avec Free-Work. Statistiques sous
          <a href="https://creativecommons.org/licenses/by/4.0/deed.fr" rel="noopener">CC BY 4.0</a> :
          <a href="/data.json">data.json</a>.
          <a href="/mentions-legales">Mentions légales</a>.
          Mis à jour le ${longDay.format(new Date(stats.generatedAt))}.
        </p>
      </footer>`;

const method = `
      <section>
        <h2>D'où viennent ces chiffres ?</h2>
        <p>
          Des offres freelance IT publiées en France sur Free-Work, relevées
          chaque jour. Le TJM est celui affiché dans l'annonce, pas celui
          réellement facturé ; quand une offre donne une fourchette, son milieu
          est retenu. Une offre republiée par la même société sous 30 jours ne
          compte qu'une fois. La fourchette habituelle va du premier au
          troisième quartile : la moitié des offres s'y trouvent.
        </p>
      </section>`;

/** The page for one profile. The profile must have a published rate. */
export function profilePage(stats: Stats, category: Category): string {
  const rate = category.rate;
  if (!rate) throw new Error(`${category.id} has no published rate`);
  const { name } = profileOf(category.id, category.label);
  const path = profilePath(category);
  const year = stats.generatedAt.slice(0, 4);
  const offers = `${number.format(category.n)} offres`;
  const trends = [
    rateTrend(rate, category.ratePrior),
    demandTrend(category.n, category.nPrior),
  ].filter(Boolean);

  const experience = rowsOf(category.experience, EXPERIENCE);
  const remote = rowsOf(category.remote, REMOTE);
  const location = rowsOf(category.location, LOCATION);
  const [lowest, highest] = [experience[0], experience.at(-1)];
  const [idf, regions] = [
    category.location.find((group) => group.key === "idf"),
    category.location.find((group) => group.key === "regions"),
  ];
  const specialties = category.subgroups.filter(
    (subgroup) => subgroup.n !== null && subgroup.id !== "other",
  );
  const months = stats.months
    .map((month, index) => ({
      month,
      p25: category.p25[index],
      p50: category.p50[index],
      p75: category.p75[index],
      volume: category.volume[index],
    }))
    .slice(-12)
    .reverse();
  const siblings = rated(stats).filter(
    (other) => other.group === category.group && other.id !== category.id,
  );

  const body = `      <nav class="crumbs" aria-label="Fil d'Ariane">
        <a href="/">TJM freelance IT</a> / <a href="/tjm/">TJM par profil</a> / ${esc(name)}
      </nav>
      <h1>TJM ${esc(name)} freelance</h1>
      <p class="lede">
        En ${year}, le TJM médian d'un profil ${esc(name)} freelance en France
        est de <strong>${euros(rate.p50)} par jour</strong>. La moitié des
        offres affichent ${between(rate)}. Ces chiffres portent sur
        ${offers} publiées en 12 mois.
      </p>${
        trends.length > 0
          ? `
      <p>${trends.join(" ")}</p>`
          : ""
      }${
        category.n < THIN
          ? `
      <p class="warning">
        Avec ${offers} seulement sur 12 mois, ces chiffres sont
        à lire avec prudence : quelques offres suffisent à les faire bouger.
      </p>`
          : ""
      }
      <p class="links">
        <a href="/#${category.id}">Voir le graphique interactif</a>
        <a href="/missions?profil=${category.id}">Voir les missions ${esc(category.label)} ouvertes</a>
      </p>
${
  experience.length > 0
    ? `
      <section>
        <h2>Quel TJM selon l'expérience ?</h2>${
          // Only worth a sentence when the rate does rise with experience.
          lowest && highest && highest.rate.p50 > lowest.rate.p50
            ? `
        <p>
          Un profil ${lowest.label.toLowerCase()} affiche un TJM médian de
          ${euros(lowest.rate.p50)}, un profil ${highest.label.toLowerCase()}
          ${euros(highest.rate.p50)}.
        </p>`
            : ""
        }${rateTable("Niveau", experience)}
      </section>`
    : ""
}${
    remote.length + location.length > 0
      ? `
      <section>
        <h2>Le TJM change-t-il selon le télétravail ou la région ?</h2>${
          idf && regions && idf.p50 !== regions.p50
            ? `
        <p>
          En Île-de-France, le TJM médian est de ${euros(idf.p50)}, contre
          ${euros(regions.p50)} dans les autres régions.
        </p>`
            : ""
        }${remote.length > 0 ? rateTable("Télétravail", remote) : ""}${
          location.length > 0 ? rateTable("Lieu", location) : ""
        }
      </section>`
      : ""
  }${
    specialties.length > 0
      ? `
      <section>
        <h2>Quelles spécialités dans ce profil ?</h2>
        <table>
          <thead>
            <tr><th scope="col">Spécialité</th><th scope="col">TJM médian</th><th scope="col">Offres sur 12 mois</th><th scope="col">Un an plus tôt</th></tr>
          </thead>
          <tbody>${specialties
            .map(
              (subgroup) => `
            <tr><th scope="row">${esc(subgroup.label)}</th><td>${subgroup.rate ? euros(subgroup.rate.p50) : "–"}</td><td>${number.format(subgroup.n ?? 0)}</td><td>${subgroup.nPrior === null ? "–" : number.format(subgroup.nPrior)}</td></tr>`,
            )
            .join("")}
          </tbody>
        </table>
      </section>`
      : ""
  }${
    category.skills.length > 0
      ? `
      <section>
        <h2>Quelles compétences sont demandées avec ce profil ?</h2>
        <p>Part des offres qui citent chaque compétence, sur 12 mois.</p>
        <ul class="skills">${category.skills
          .map(
            (skill) => `
          <li>${esc(skill.name)} <span>${skill.share}\u00a0%</span></li>`,
          )
          .join("")}
        </ul>
      </section>`
      : ""
  }
      <section>
        <h2>Comment le TJM a-t-il évolué sur 12 mois ?</h2>
        <p>
          Chaque mois est calculé sur les trois derniers mois d'offres, pour
          lisser les écarts.
        </p>
        <table>
          <thead>
            <tr><th scope="col">Mois</th><th scope="col">TJM médian</th><th scope="col">Fourchette habituelle</th><th scope="col">Offres du mois</th></tr>
          </thead>
          <tbody>${months
            .flatMap(({ month, p25, p50, p75, volume }) =>
              p25 == null || p50 == null || p75 == null
                ? []
                : [
                    `
            <tr><th scope="row">${monthLabel(month)}</th><td>${euros(p50)}</td><td>${range({ p25, p50, p75 })}</td><td>${volume == null ? "–" : number.format(volume)}</td></tr>`,
                  ],
            )
            .join("")}
          </tbody>
        </table>
      </section>
${method}${
    siblings.length > 0
      ? `
      <section>
        <h2>Autres profils : ${esc(category.group)}</h2>
        <ul class="others">${siblings
          .map(
            (other) => `
          <li><a href="${profilePath(other)}">${esc(other.label)}</a> ${other.rate ? euros(other.rate.p50) : ""}</li>`,
          )
          .join("")}
        </ul>
        <p><a href="/tjm/">Tous les TJM par profil</a></p>
      </section>`
      : ""
  }${footer(stats)}`;

  return layout({
    path,
    title: pageTitle(name, year, rate.p50),
    description: `TJM médian ${name} freelance : ${euros(rate.p50)}, de ${range(rate)} pour la moitié des offres. Calculé sur ${offers} en 12 mois, mis à jour chaque jour.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        ["TJM freelance IT", `${SITE}/`],
        ["TJM par profil", `${SITE}/tjm/`],
        [name, SITE + path],
      ].map(([label, item], index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: label,
        item,
      })),
    },
    body,
  });
}

/** The table of every profile, which links to each profile's page. */
export function hubPage(stats: Stats): string {
  const year = stats.generatedAt.slice(0, 4);
  const market = stats.categories.find((category) => category.id === MARKET);
  const profiles = rated(stats);
  const groups = [...new Set(profiles.map((profile) => profile.group))];

  const body = `      <nav class="crumbs" aria-label="Fil d'Ariane">
        <a href="/">TJM freelance IT</a> / TJM par profil
      </nav>
      <h1>TJM freelance IT par profil</h1>
      <p class="lede">${
        market?.rate
          ? `
        En ${year}, le TJM médian d'un freelance IT en France est de
        <strong>${euros(market.rate.p50)} par jour</strong>, tous profils
        confondus, et la moitié des offres affichent
        ${between(market.rate)}.`
          : ""
      }
        Ce tableau donne le TJM médian, la fourchette habituelle et le nombre
        d'offres de chaque métier et de chaque langage sur 12 mois, d'après
        ${number.format(stats.offers)} offres relevées depuis
        ${(stats.months[0] ?? year).slice(0, 4)}.
      </p>
      <p class="links">
        <a href="/">Voir les graphiques interactifs</a>
        <a href="/tendances">Quels profils recrutent le plus</a>
        <a href="/missions">Voir les missions ouvertes</a>
      </p>
${groups
  .map(
    (group) => `
      <section>
        <h2>${esc(group)}</h2>
        <table>
          <thead>
            <tr><th scope="col">Profil</th><th scope="col">TJM médian</th><th scope="col">Fourchette habituelle</th><th scope="col">Offres sur 12 mois</th><th scope="col">Un an plus tôt</th></tr>
          </thead>
          <tbody>${profiles
            .filter((profile) => profile.group === group)
            .map(
              (profile) => `
            <tr><th scope="row"><a href="${profilePath(profile)}">${esc(profile.label)}</a></th><td>${profile.rate ? euros(profile.rate.p50) : "–"}</td><td>${profile.rate ? range(profile.rate) : "–"}</td><td>${number.format(profile.n)}</td><td>${number.format(profile.nPrior)}</td></tr>`,
            )
            .join("")}
          </tbody>
        </table>
      </section>`,
  )
  .join("")}
${method}${footer(stats)}`;

  return layout({
    path: "/tjm/",
    title: `TJM freelance IT en ${year} : tarifs par métier et par langage`,
    description: `Le TJM médian, la fourchette habituelle et le nombre d'offres de ${profiles.length} profils freelance IT en France, calculés sur 12 mois et mis à jour chaque jour.`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "TJM des offres freelance IT en France",
      description:
        "Taux journaliers affichés (médiane et quartiles) et nombre d'offres freelance IT publiées en France, par métier et par langage, mis à jour chaque jour.",
      url: `${SITE}/tjm/`,
      license: "https://creativecommons.org/licenses/by/4.0/",
      isAccessibleForFree: true,
      inLanguage: "fr",
      keywords: [
        "TJM",
        "freelance",
        "tarif journalier",
        "informatique",
        "France",
      ],
      spatialCoverage: { "@type": "Country", name: "France" },
      temporalCoverage: `${stats.months[0] ?? year}/..`,
      dateModified: stats.generatedAt,
      creator: { "@type": "Organization", name: "TJM freelance", url: SITE },
      distribution: [
        {
          "@type": "DataDownload",
          encodingFormat: "application/json",
          contentUrl: `${SITE}/data.json`,
        },
      ],
    },
    body,
  });
}

/** A sitemap of the given addresses, all last changed on `day` (YYYY-MM-DD). */
export function sitemap(paths: string[], day: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${paths.map((path) => `  <url><loc>${SITE}${path}</loc><lastmod>${day}</lastmod></url>`).join("\n")}
</urlset>
`;
}

/** Every generated file, keyed by its path under the site's public folder. */
export function buildPages(stats: Stats): Map<string, string> {
  const profiles = rated(stats);
  const pages = new Map<string, string>([["tjm/index.html", hubPage(stats)]]);
  for (const profile of profiles)
    pages.set(
      `${profilePath(profile).slice(1)}.html`,
      profilePage(stats, profile),
    );
  pages.set(
    "sitemap.xml",
    sitemap(
      ["/", "/tjm/", ...profiles.map(profilePath), "/tendances", "/missions"],
      stats.generatedAt.slice(0, 10),
    ),
  );
  return pages;
}
