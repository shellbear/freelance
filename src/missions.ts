import type { OffersFile, PublicOffer } from "../pipeline/offers";
import type { buildStats } from "../pipeline/stats";
import {
  ageLabel,
  DEFAULTS,
  type Filters,
  filterOffers,
  groupByDay,
  parseFilters,
  type Quartiles,
  rateLabel,
  safeUrl,
  scalePosition,
  standing,
  toParams,
} from "./missions-filter";

type Stats = ReturnType<typeof buildStats>;

/** Rows drawn at first, and added by each "show more". */
const PAGE = 60;
/** Profiles listed before "all profiles" is opened. */
const TOP_PROFILES = 12;
/** A platform not read for this long gets a warning. */
const STALE_MS = 2 * 86_400_000;
const DAY_MS = 86_400_000;
const RATES = [400, 500, 600, 700, 800];
const TICKS = [300, 400, 500, 600, 700, 800, 900];
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

const number = new Intl.NumberFormat("fr-FR");
const euros = (value: number) => `${number.format(value)} €`;
const missions = (count: number) =>
  `${number.format(count)} mission${count > 1 ? "s" : ""}`;
/** "Free-Work, Freelance-Informatique et Silkhom" */
const list = new Intl.ListFormat("fr-FR", { type: "conjunction" });
const dayMonth = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "long",
  timeZone: "Europe/Paris",
});
const weekday = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const $ = (id: string) => document.getElementById(id) as HTMLElement;

function el(
  tag: string,
  props: Record<string, string> = {},
  ...children: (Node | string)[]
) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props))
    key === "className"
      ? (node.className = value)
      : node.setAttribute(key, value);
  node.append(...children);
  return node;
}

/** A mark on the rate scale, placed by its left edge and optional width in percent. */
function mark(className: string, left: number, width?: string) {
  const node = el("i", { className });
  node.style.left = `${left}%`;
  if (width) node.style.width = width;
  return node;
}

/** One row's slice of the scale: the usual range, the median, and the offer's own rate. */
function track(usual: Quartiles | null, offer?: PublicOffer) {
  const node = el("div", { className: "track" });
  if (usual) {
    const from = scalePosition(usual.p25);
    node.append(
      mark("usual", from, `${scalePosition(usual.p75) - from}%`),
      mark("median", scalePosition(usual.p50)),
    );
  }
  const low = offer?.min ?? offer?.max ?? null;
  const high = offer?.max ?? offer?.min ?? null;
  if (offer && low !== null && high !== null) {
    const from = scalePosition(low);
    node.append(
      mark(
        `fill ${standing(offer, usual) ?? "inside"}`,
        from,
        `max(6px, ${scalePosition(high) - from}%)`,
      ),
    );
  }
  return node;
}

async function main() {
  const [file, stats] = (await Promise.all(
    ["/offers.json", "/data.json"].map(async (path) => {
      const response = await fetch(path);
      if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
      return response.json();
    }),
  )) as [OffersFile, Stats];
  const today = new Date().toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - DAY_MS).toISOString().slice(0, 10);
  const sourceLabels = new Map(
    file.sources.map((source) => [source.id, source.label]),
  );
  const categories = new Map(
    stats.categories.map((category) => [category.id, category]),
  );
  /** The profile's label and usual rates; the whole market when none is chosen. */
  const market = (profile: string) =>
    categories.get(profile) ?? categories.get("all");

  let filters = parseFilters(new URLSearchParams(location.search));
  let shown = PAGE;
  let allProfiles = false;

  function set(patch: Partial<Filters>) {
    filters = { ...filters, ...patch };
    shown = PAGE;
    const query = toParams(filters).toString();
    history.replaceState(null, "", query ? `?${query}` : location.pathname);
    sync();
    draw();
  }

  // The side column is built once; `sync` then marks what is selected.
  const choices: { key: keyof Filters; value: unknown; button: HTMLElement }[] =
    [];
  function facet<K extends keyof Filters>(
    title: string,
    key: K,
    options: [Filters[K], string, number?][],
  ) {
    return el(
      "fieldset",
      {},
      el("legend", {}, title),
      ...options.map(([value, label, count]) => {
        const button = el(
          "button",
          { type: "button" },
          el("span", {}, label),
          ...(count === undefined
            ? []
            : [el("small", {}, number.format(count))]),
        );
        // Choosing the selected value again clears the filter.
        button.addEventListener("click", () =>
          set({
            [key]: filters[key] === value ? DEFAULTS[key] : value,
          } as Partial<Filters>),
        );
        choices.push({ key, value, button });
        return button;
      }),
    );
  }

  const counts = new Map<string, number>();
  for (const offer of file.offers)
    for (const id of offer.profiles) counts.set(id, (counts.get(id) ?? 0) + 1);
  const profiles = file.profiles
    .flatMap((profile) => {
      const count = counts.get(profile.id);
      return count ? [{ ...profile, count }] : [];
    })
    .sort((a, b) => b.count - a.count);
  const untagged = file.offers.filter(
    (offer) => offer.profiles.length === 0,
  ).length;

  const profileFacet = facet("Profil", "profile", [
    ...profiles.map((profile): [string, string, number] => [
      profile.id,
      profile.label,
      profile.count,
    ]),
    ["other", "Autres métiers", untagged],
  ]);
  const profileButtons = [...profileFacet.querySelectorAll("button")];
  const expand = el("button", { type: "button", className: "expand" });
  expand.addEventListener("click", () => {
    allProfiles = !allProfiles;
    sync();
  });
  profileFacet.append(expand);

  const region = el(
    "select",
    { "aria-label": "Région" },
    el("option", { value: "" }, "Toutes les régions"),
    ...[...new Set(file.offers.flatMap((offer) => offer.region ?? []))]
      .sort((a, b) => a.localeCompare(b, "fr"))
      .map((name) => el("option", { value: name }, name)),
  ) as HTMLSelectElement;
  region.addEventListener("change", () => set({ region: region.value }));

  $("facets").append(
    profileFacet,
    facet(
      "TJM minimum",
      "minRate",
      RATES.map((rate): [number, string] => [rate, `${rate} € et plus`]),
    ),
    facet("Télétravail", "remote", Object.entries(REMOTE)),
    facet("Expérience", "experience", Object.entries(EXPERIENCE)),
    el("fieldset", {}, el("legend", {}, "Région"), region),
    facet(
      "Plateforme",
      "source",
      file.sources.map((source): [string, string, number] => [
        source.id,
        source.label,
        source.offers,
      ]),
    ),
  );

  // Filters stay open beside the list on wide screens and fold above it on small ones.
  const wide = matchMedia("(min-width: 861px)");
  const folded = $("filters") as HTMLDetailsElement;
  folded.open = wide.matches;
  wide.addEventListener("change", () => {
    folded.open = wide.matches;
  });

  const search = $("q") as HTMLInputElement;
  search.addEventListener("input", () => set({ q: search.value }));
  const sort = $("sort") as HTMLSelectElement;
  sort.addEventListener("change", () =>
    set({ sort: sort.value === "rate" ? "rate" : "recent" }),
  );
  $("reset").addEventListener("click", () => set({ ...DEFAULTS }));
  $("more").addEventListener("click", () => {
    shown += PAGE;
    draw();
  });

  function sync() {
    for (const { key, value, button } of choices)
      button.setAttribute("aria-pressed", String(filters[key] === value));
    // Past the most common profiles, the list stays folded unless one of them is selected.
    const selected = profileButtons.findIndex(
      (button) => button.getAttribute("aria-pressed") === "true",
    );
    const open = allProfiles || selected >= TOP_PROFILES;
    profileButtons.forEach((button, index) => {
      button.hidden = !open && index >= TOP_PROFILES;
    });
    expand.textContent = open
      ? "Moins de profils"
      : `Tous les profils (${profileButtons.length})`;
    expand.hidden = selected >= TOP_PROFILES;
    if (search.value !== filters.q) search.value = filters.q;
    region.value = filters.region;
    sort.value = filters.sort;
  }

  function scale(usual: Quartiles | null) {
    const axis = el("div", { className: "track axis" });
    for (const tick of TICKS) {
      const label = el("span", {}, String(tick));
      label.style.left = `${scalePosition(tick)}%`;
      axis.append(label);
    }
    if (usual) {
      const median = el("b", {}, `médiane ${euros(usual.p50)}`);
      median.style.left = `${scalePosition(usual.p50)}%`;
      axis.append(median);
    }
    return el(
      "li",
      { className: "scale" },
      el("span"),
      axis,
      el("span", { className: "rate" }, "TJM affiché"),
    );
  }

  function row(offer: PublicOffer, usual: Quartiles | null, withAge: boolean) {
    const place = [offer.city, offer.region]
      .filter((part, index, parts) => part && parts.indexOf(part) === index)
      .join(", ");
    const details = [
      offer.company,
      place,
      REMOTE[offer.remote ?? ""],
      EXPERIENCE[offer.experience ?? ""],
    ].filter(Boolean);
    const rate = rateLabel(offer);
    return el(
      "li",
      { className: "offer" },
      el(
        "div",
        { className: "what" },
        el(
          "a",
          {
            href: safeUrl(offer.links[0]?.url),
            rel: "noopener",
            target: "_blank",
          },
          offer.title,
        ),
        el(
          "small",
          {},
          details.join(", "),
          ...(withAge
            ? [
                el(
                  "span",
                  { className: "age" },
                  ageLabel(offer.published, today),
                ),
              ]
            : []),
          ...offer.links.map((link) =>
            el(
              "a",
              {
                className: "src",
                href: safeUrl(link.url),
                rel: "noopener",
                target: "_blank",
              },
              sourceLabels.get(link.source) ?? link.source,
            ),
          ),
        ),
      ),
      track(usual, offer),
      el(
        "span",
        { className: `rate ${rate ? (standing(offer, usual) ?? "") : "none"}` },
        rate ?? "non communiqué",
      ),
    );
  }

  function dayLabel(day: string) {
    if (day === today) return "Aujourd'hui";
    if (day === yesterday) return "Hier";
    return weekday.format(new Date(`${day}T00:00:00Z`));
  }

  function draw() {
    const found = filterOffers(file.offers, filters);
    const profile = market(filters.profile);
    const usual = profile?.rate ?? null;
    const stated = found.filter((offer) => rateLabel(offer));
    const above = stated.filter(
      (offer) => standing(offer, usual) === "above",
    ).length;
    const below = stated.filter(
      (offer) => standing(offer, usual) === "below",
    ).length;

    $("market").replaceChildren(
      ...(profile && usual
        ? [
            el("strong", {}, profile.label),
            ` : sur 12 mois, la moitié des offres affichent entre ${euros(usual.p25)} et ${euros(usual.p75)}, pour une médiane de ${euros(usual.p50)}. Parmi les missions ci-dessous, `,
            el(
              "span",
              { className: "above" },
              `${number.format(above)} au-dessus`,
            ),
            ", ",
            el(
              "span",
              { className: "below" },
              `${number.format(below)} en dessous`,
            ),
            ` et ${number.format(stated.length - above - below)} dans cette fourchette.`,
          ]
        : ["Pas assez d'offres sur 12 mois pour situer les TJM de ce profil."]),
    );
    $("count").textContent =
      found.length === 0
        ? "Aucune mission ne correspond à ces filtres."
        : `${missions(found.length)}, dont ${number.format(stated.length)} avec un TJM affiché`;
    $("reset").hidden = toParams(filters).toString() === "";

    const byRate = filters.sort === "rate";
    $("offers").replaceChildren(
      ...(found.length === 0 ? [] : [scale(usual)]),
      ...(byRate
        ? found.slice(0, shown).map((offer) => row(offer, usual, true))
        : groupByDay(found, shown).flatMap((group) => [
            el(
              "li",
              { className: "day" },
              el("span", {}, dayLabel(group.day)),
              track(usual),
              el("small", {}, missions(group.total)),
            ),
            ...group.offers.map((offer) => row(offer, usual, false)),
          ])),
    );
    const more = $("more");
    more.hidden = found.length <= shown;
    more.textContent = `Afficher ${Math.min(PAGE, found.length - shown)} missions de plus`;
  }

  $("lede").textContent =
    `${missions(file.offers.length)} freelance IT ouvertes en France, relevées chaque jour sur ${list.format(file.sources.map((source) => source.label))}.`;
  $("sources").textContent = file.sources
    .map((source) =>
      source.updatedAt
        ? `${source.label} : ${missions(source.offers)}, relevé du ${dayMonth.format(new Date(source.updatedAt))}`
        : `${source.label} : indisponible`,
    )
    .join(" · ");
  const stale = file.sources.filter(
    (source) =>
      !source.updatedAt || Date.now() - Date.parse(source.updatedAt) > STALE_MS,
  );
  if (stale.length > 0) {
    const warning = $("stale");
    warning.hidden = false;
    warning.textContent = `Relevé en retard pour ${list.format(stale.map((source) => source.label))} : certaines missions peuvent ne plus être ouvertes.`;
  }

  sync();
  draw();
}

main().catch((error) => {
  console.error(error);
  const warning = $("stale");
  warning.hidden = false;
  warning.textContent =
    "Les missions n'ont pas pu être chargées. Réessayez dans un instant.";
  $("count").textContent = "";
});
