import type { buildStats } from "../pipeline/stats";
import { drawTrendsImage } from "./trends-image";
import {
  formatChange as percent,
  formatCount,
  formatRate,
  formatGrowth,
  combine,
  pick,
  type Ranked,
  STABLE,
  shorten,
  subgroupTrends,
  type Trend,
  trends,
  trendsCsv,
} from "./trends";

type Stats = ReturnType<typeof buildStats>;

const monthShort = new Intl.DateTimeFormat("fr-FR", {
  month: "short",
  year: "numeric",
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

const monthYear = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
/** "Octobre 2026" */
const monthTitle = (month: string) => {
  const text = monthYear.format(new Date(`${month}-01T00:00:00Z`));
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const monthLabel = (month: string) =>
  monthShort.format(new Date(`${month}-01T00:00:00Z`));

/** Views of the ranking; each tab has its own link and its own image. */
const VIEWS = [
  { id: "tout", label: "Tout" },
  // Engineering roles across families, like the usual industry charts.
  {
    id: "roles",
    label: "Rôles",
    ids: [
      "backend",
      "frontend",
      "fullstack",
      "mobile",
      "cpp",
      "devops",
      "cloud",
      "devsecops",
      "cyber",
      "data-eng",
      "ai",
      "ai-other",
      "tech-lead",
      "architect",
      "qa",
      "swe",
    ],
  },
  { id: "langages", label: "Langages", group: "Langages" },
  { id: "mobile", label: "Mobile", profile: "mobile" },
  { id: "infra", label: "Infra & sécurité", group: "Infra & sécurité" },
  { id: "data", label: "Data & IA", group: "Data & IA" },
  {
    id: "gestion",
    label: "Gestion & métier",
    ids: ["project-manager", "product", "business-analyst", "sap"],
  },
  { id: "technos", label: "Technos" },
] as const;
type View = (typeof VIEWS)[number];
/** Floor for subgroups in a view dedicated to one profile. */
const DETAIL_MIN_OFFERS = 20;
/** Views longer than this export the biggest moves only, with a full version on request. */
const SHORT_AFTER = 12;

function render(stats: Stats) {
  const profiles = trends(stats.categories);
  const technos = subgroupTrends(stats.categories);
  const { market, up, down } = profiles;
  if (!up.length && !down.length) throw new Error("no trends");

  const months = stats.months;
  const period = (from: number, to: number) =>
    `${monthLabel(months.at(from) as string)} – ${monthLabel(months.at(to) as string)}`;
  const year = period(-12, -1);
  const priorYear = period(-24, -13);
  $("period").textContent = `${year}, comparé à ${priorYear}.`;

  const top = up[0];
  const bottom = down.at(-1);
  $("lede").textContent = [
    market &&
      `Sur un an, le nombre d'offres freelance IT évolue de ${percent(market.change)} (${formatCount(market.nPrior)} → ${formatCount(market.n)}).`,
    top &&
      `${top.label} : ${formatGrowth(top)}${top.n >= 2 * top.nPrior ? ` (${percent(top.change)})` : ""}.`,
    bottom && `${bottom.label} : ${percent(bottom.change)}.`,
  ]
    .filter(Boolean)
    .join(" ");

  $("updated").textContent =
    `Mis à jour le ${new Date(stats.generatedAt).toLocaleDateString("fr-FR")}.`;

  const resultFor = (view: View) =>
    view.id === "technos"
      ? technos
      : "group" in view
        ? pick(profiles, (t) => t.group === view.group)
        : "ids" in view
          ? pick(profiles, (t) =>
              (view.ids as readonly string[]).includes(t.id),
            )
          : "profile" in view
            ? // A profile next to its own detail, with a lower floor: counts stay visible.
              combine(
                mapRows(
                  pick(profiles, (t) => t.id === view.profile),
                  (t) => ({ ...t, label: `${t.label}, total` }),
                ),
                // The tab already names the profile, so its subgroups drop that note.
                mapRows(
                  subgroupTrends(stats.categories, {
                    only: view.profile,
                    min: DETAIL_MIN_OFFERS,
                  }),
                  (t) => ({ ...t, note: undefined }),
                ),
              )
            : profiles;
  const rows = (result: Ranked) =>
    result.up.length + result.stable.length + result.down.length;

  const tabs = new Map<string, HTMLElement>();
  const show = (view: View) => {
    const result = resultFor(view);
    for (const [id, tab] of tabs)
      tab.setAttribute("aria-selected", String(id === view.id));
    $("view-caption").textContent =
      view.id === "technos"
        ? "Le détail à l'intérieur des profils (Databricks dans Data Engineer, Vue dans Front-end…). Chaque ligne compte au moins 50 offres par an : comparez les volumes, pas seulement les pourcentages."
        : "Cliquez sur un profil pour voir son TJM et son détail.";
    $("trends").replaceChildren(...rankedChart(result));

    const url = `${SITE}/tendances${view.id === "tout" ? "" : `#${view.id}`}`;
    const subtitle =
      view.id === "technos"
        ? "Évolution du nombre d'offres sur un an, par techno et spécialité au sein de chaque profil."
        : "profile" in view
          ? `Évolution du nombre d'offres ${view.label} sur un an, au total et par plateforme.`
          : // The title already names the view; the default adds the whole market.
            undefined;
    const image = (ranking: Ranked, short: boolean) => () =>
      Promise.resolve(
        drawTrendsImage({
          result: ranking,
          period: year,
          priorPeriod: priorYear,
          url,
          title: `Freelance IT · France · ${monthTitle(months.at(-1) as string)}`,
          subtitle: short
            ? `${subtitle ?? "Évolution du nombre d'offres sur un an."} Les plus fortes hausses et baisses ; tout le classement sur le site.`
            : subtitle,
        }),
      );
    const long = rows(result) > SHORT_AFTER;
    exportButtons(
      $("trends-exports"),
      `freelance-tendances-${view.id}-${months.at(-1)}`,
      long ? image(shorten(result), true) : image(result, false),
      () => trendsCsv(result),
      long ? image(result, false) : undefined,
    );
  };

  $("views").replaceChildren(
    ...VIEWS.map((view) => {
      const tab = el(
        "a",
        {
          role: "tab",
          href: view.id === "tout" ? "#" : `#${view.id}`,
          className: "chip",
        },
        view.label,
      );
      tab.addEventListener("click", (event) => {
        event.preventDefault();
        history.replaceState(
          null,
          "",
          view.id === "tout" ? location.pathname : `#${view.id}`,
        );
        show(view);
      });
      tabs.set(view.id, tab);
      return tab;
    }),
  );
  const fromHash = () =>
    VIEWS.find((view) => view.id === location.hash.slice(1)) ?? VIEWS[0];
  addEventListener("hashchange", () => show(fromHash()));
  show(fromHash());
}

function mapRows(result: Ranked, change: (trend: Trend) => Trend): Ranked {
  return {
    market: result.market,
    up: result.up.map(change),
    stable: result.stable.map(change),
    down: result.down.map(change),
  };
}

/** The ranked bar chart, shared by profiles and by technologies. */
function rankedChart(result: ReturnType<typeof trends>) {
  // The scale always shows ±50 % so small changes keep a sense of proportion.
  const { up, stable, down } = result;
  const ranked = [...up, ...stable, ...down];
  const changes = ranked.map((t) => t.change);
  const low = Math.min(-50, Math.floor(Math.min(...changes) / 50) * 50);
  const high = Math.max(50, Math.ceil(Math.max(...changes) / 50) * 50);
  const at = (value: number) => `${((value - low) / (high - low)) * 100}%`;
  const ticks: number[] = [];
  // Wide scales get fewer ticks so their labels don't run into each other.
  const step = high - low > 200 ? 100 : 50;
  for (let tick = Math.ceil(low / step) * step; tick <= high; tick += step)
    ticks.push(tick);
  const gridlines = () =>
    ticks.map((tick) =>
      el("span", {
        className: tick === 0 ? "zero" : "gridline",
        style: `left:${at(tick)}`,
      }),
    );

  const row = (trend: Trend) => {
    const direction =
      trend.change > STABLE ? "up" : trend.change < -STABLE ? "down" : "flat";
    const from = Math.min(0, trend.change);
    const to = Math.max(0, trend.change);
    const counts = `${formatCount(trend.nPrior)} → ${formatCount(trend.n)}`;
    const name = el(
      trend.linkable ? "a" : "span",
      trend.linkable
        ? { className: "name", href: `/#${trend.profile ?? trend.id}` }
        : { className: "name" },
      trend.label,
      ...(trend.note ? [el("small", {}, trend.note)] : []),
    );
    return el(
      "li",
      {
        className: `row ${direction}`,
        title: `${trend.label} : ${percent(trend.change)} sur un an (${counts} offres)`,
      },
      name,
      el(
        "div",
        { className: "track", "aria-hidden": "true" },
        ...gridlines(),
        el("span", {
          className: "bar",
          style: `left:${at(from)};width:calc(${at(to)} - ${at(from)})`,
        }),
      ),
      el("span", { className: "pct" }, percent(trend.change)),
      el("span", { className: "counts" }, counts),
      rateCell(trend),
    );
  };

  const groups = [
    { title: "En hausse", rows: up },
    { title: "Stable", rows: stable, hint: `entre −${STABLE} et +${STABLE} %` },
    { title: "En baisse", rows: down },
  ].filter((group) => group.rows.length);

  return [
    el(
      "div",
      { className: "row head", "aria-hidden": "true" },
      el("span"),
      el("span"),
      el("span", { className: "pct" }, "Sur un an"),
      el("span", { className: "counts" }, "Offres"),
      el("span", { className: "rate" }, "TJM médian"),
    ),
    ...groups.flatMap((group) => [
      el(
        "h2",
        { className: "group" },
        group.title,
        ...(group.hint ? [el("span", {}, ` · ${group.hint}`)] : []),
      ),
      el("ol", { className: "rows" }, ...group.rows.map(row)),
    ]),
    el(
      "div",
      { className: "axis", "aria-hidden": "true" },
      el("span"),
      el(
        "div",
        { className: "track" },
        ...ticks.map((tick) =>
          el(
            "span",
            { style: `left:${at(tick)}` },
            percent(tick).replace(" ", ""),
          ),
        ),
      ),
    ),
  ];
}

function rateCell(trend: Trend) {
  const rate = formatRate(trend);
  if (!rate) return el("span", { className: "rate" }, "–");
  return el(
    "span",
    {
      className: "rate",
      title: rate.move
        ? `TJM médian sur un an : ${rate.move === "=" ? "inchangé" : rate.move}`
        : "",
    },
    rate.rate,
    ...(rate.move ? [el("small", {}, ` ${rate.move}`)] : []),
  );
}

const SITE = "freelance.shellbear.me";
const toPng = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("no image"))),
      "image/png",
    ),
  );

function download(blob: Blob, file: string) {
  const link = el("a", { href: URL.createObjectURL(blob), download: file });
  link.click();
  setTimeout(
    () => URL.revokeObjectURL(link.getAttribute("href") as string),
    1000,
  );
}

/** Copy and download buttons for one chart: its image carries the title and source. */
function exportButtons(
  host: HTMLElement,
  name: string,
  image: () => Promise<HTMLCanvasElement>,
  csv: () => string,
  /** A longer image offered next to a short default one. */
  fullImage?: () => Promise<HTMLCanvasElement>,
) {
  const status = el("span", { role: "status" });
  const say = (text: string) => {
    status.textContent = text;
    setTimeout(() => {
      if (status.textContent === text) status.textContent = "";
    }, 4000);
  };
  const png = async () => toPng(await image());
  const button = (label: string, action: () => Promise<void> | void) => {
    const node = el("button", { type: "button" }, label);
    node.addEventListener("click", action);
    return node;
  };
  host.replaceChildren(
    status,
    button("Copier l'image", async () => {
      try {
        // The promise form keeps Safari's user-gesture check happy.
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png() }),
        ]);
        say("Image copiée.");
      } catch (error) {
        console.error(error);
        download(await png(), `${name}.png`);
        say("Copie impossible dans ce navigateur : image téléchargée.");
      }
    }),
    button("Télécharger PNG", async () => download(await png(), `${name}.png`)),
    ...(fullImage
      ? [
          button("PNG complet", async () =>
            download(await toPng(await fullImage()), `${name}-complet.png`),
          ),
        ]
      : []),
    // The BOM makes Excel read the accents correctly.
    button("Télécharger CSV", () =>
      download(
        new Blob(["\ufeff", csv()], { type: "text/csv" }),
        `${name}.csv`,
      ),
    ),
  );
}

fetch("/data.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<Stats>;
  })
  .then(render)
  .catch((error) => {
    console.error(error);
    $("lede").textContent =
      "Impossible de charger les données. Réessayez dans un instant.";
  });
