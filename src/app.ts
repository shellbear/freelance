import uPlot from "uplot";
import "uplot/dist/uPlot.min.css";
import type { buildStats } from "../pipeline/stats";

type Stats = ReturnType<typeof buildStats>;
type Category = Stats["categories"][number];
type Group = Category["experience"];
type SortKey = "label" | "p50" | "spread" | "n" | "demand";

const THIN_GROUP = 30;
const STALE_AFTER_DAYS = 3;
const MUTED = "#a3a29b";
const LINE = "#2a2b2d";
const ACCENT = "#3987e5";
const BAND = "rgba(57, 135, 229, 0.22)";
const RANGES = [
  { label: "1 an", months: 12 },
  { label: "3 ans", months: 36 },
  { label: "Tout", months: Infinity },
];
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
const euros = (value: number) => `${number.format(value)} €`;
const monthLong = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const $ = (id: string) => document.getElementById(id) as HTMLElement;

type Child = Node | string;
function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & Record<string, unknown> = {},
  ...children: Child[]
) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (key.startsWith("aria-") || key === "scope")
      node.setAttribute(key, String(value));
    else Object.assign(node, { [key]: value });
  }
  node.append(...children);
  return node;
}

function demandChange(category: Category) {
  if (category.nPrior < 5) return null;
  return Math.round((100 * (category.n - category.nPrior)) / category.nPrior);
}
const signedPercent = (value: number | null) =>
  value === null ? "–" : `${value > 0 ? "+" : ""}${number.format(value)} %`;

function rateChange(category: Category) {
  if (!category.rate || !category.ratePrior)
    return "Pas de comparaison sur un an";
  const change = category.rate.p50 - category.ratePrior.p50;
  if (change === 0) return "Stable sur un an";
  return `${change > 0 ? "+" : "−"}${euros(Math.abs(change))} sur un an`;
}

const monthDate = (month: string) => new Date(`${month}-01T00:00:00Z`);

function main(stats: Stats) {
  const months = stats.months;
  const indexes = months.map((_, index) => index);
  const find = (id: string) =>
    stats.categories.find((category) => category.id === id);
  const initial = find(location.hash.slice(1)) ?? stats.categories[0];
  if (!initial) throw new Error("no data");
  let current: Category = initial;
  let rangeMonths = 36;
  let sortKey: SortKey = "p50";
  let sortDescending = true;

  const xAxis = {
    stroke: MUTED,
    grid: { show: false },
    ticks: { stroke: LINE },
    font: "12px ui-monospace, Menlo, Consolas, monospace",
    // Index-based ticks keep month labels exact in every time zone.
    splits: (_u: uPlot, _axis: number, min: number, max: number) => {
      const span = max - min;
      const step = span > 30 ? 12 : span > 15 ? 6 : 3;
      return indexes.filter(
        (index) =>
          index >= min &&
          index <= max &&
          monthDate(months[index] as string).getUTCMonth() % step === 0,
      );
    },
    values: (_u: uPlot, splits: number[]) =>
      splits.map((index) => {
        const [year, month] = (months[index] as string).split("-");
        return month === "01"
          ? String(year)
          : `${month}/${String(year).slice(2)}`;
      }),
  };
  const yAxis = (format: (value: number) => string) => ({
    stroke: MUTED,
    grid: { stroke: LINE, width: 1 },
    ticks: { show: false },
    size: 64,
    font: "12px ui-monospace, Menlo, Consolas, monospace",
    values: (_u: uPlot, splits: number[]) => splits.map(format),
  });
  const base = (host: HTMLElement, height: number) => ({
    width: host.clientWidth,
    height,
    legend: { show: false },
    scales: { x: { time: false } },
    cursor: {
      sync: { key: "months" },
      drag: { x: false, y: false },
      y: false,
      // Snap to the month being read out, so the line and the caption agree.
      // A negative position means the cursor is hidden, so it must stay that way.
      move: (u: uPlot, left: number, top: number): [number, number] => [
        left < 0 ? left : u.valToPos(u.posToIdx(left), "x"),
        top,
      ],
      points: { size: 9, fill: ACCENT, stroke: "#0b0c0e", width: 2 },
    },
  });

  const rateHost = $("rate");
  const rateChart = new uPlot(
    {
      ...base(rateHost, 300),
      axes: [xAxis, yAxis(euros)],
      series: [
        {},
        { stroke: "transparent", points: { show: false } },
        { stroke: ACCENT, width: 2, points: { show: false } },
        { stroke: "transparent", points: { show: false } },
      ],
      bands: [{ series: [3, 1], fill: BAND }],
      hooks: { setCursor: [(u) => showRate(u.cursor.idx)] },
    },
    [indexes, [], [], []],
    rateHost,
  );

  const volumeHost = $("volume");
  const volumeChart = new uPlot(
    {
      ...base(volumeHost, 150),
      scales: {
        x: { time: false },
        y: { range: (_u, _min, max) => [0, Math.max(max, 5) * 1.1] },
      },
      axes: [xAxis, yAxis((value) => number.format(value))],
      series: [
        {},
        {
          fill: ACCENT,
          stroke: ACCENT,
          width: 0,
          points: { show: false },
          paths: uPlot.paths.bars?.({ size: [0.7, 16], radius: 0.15 }),
        },
      ],
      hooks: { setCursor: [(u) => showVolume(u.cursor.idx)] },
    },
    [indexes, []],
    volumeHost,
  );

  function monthLabel(index: number) {
    return monthLong.format(monthDate(months[index] as string));
  }
  function lastIndexOf(values: (number | null)[]) {
    return values.findLastIndex((value) => value !== null);
  }

  function showRate(hovered?: number | null) {
    const index = hovered ?? lastIndexOf(current.p50);
    const median = current.p50[index];
    $("rate-caption").textContent =
      median === null || median === undefined
        ? hovered === null || hovered === undefined
          ? "Pas assez d'offres pour afficher une tendance."
          : `${monthLabel(index)} : pas assez d'offres`
        : `${monthLabel(index)} : médiane ${euros(median)}, la moitié des offres entre ${euros(current.p25[index] ?? 0)} et ${euros(current.p75[index] ?? 0)} (sur 3 mois)`;
  }
  function showVolume(hovered?: number | null) {
    const index = hovered ?? months.length - 1;
    const value = current.volume[index];
    $("volume-caption").textContent = `${monthLabel(index)} : ${
      value === null || value === undefined
        ? "moins de 5 offres"
        : `${number.format(value)} offres`
    }`;
  }

  function applyRange() {
    const last = months.length - 1;
    const min =
      rangeMonths === Infinity ? 0 : Math.max(0, last - rangeMonths + 1);
    for (const chart of [rateChart, volumeChart]) {
      chart.setScale("x", { min: min - 0.5, max: last + 0.5 });
    }
  }

  const rangeButtons = RANGES.map((range) =>
    el(
      "button",
      {
        type: "button",
        className: "chip",
        "aria-pressed": range.months === rangeMonths,
        onclick: () => {
          rangeMonths = range.months;
          for (const [i, button] of rangeButtons.entries()) {
            button.setAttribute(
              "aria-pressed",
              String(RANGES[i]?.months === rangeMonths),
            );
          }
          applyRange();
        },
      },
      range.label,
    ),
  );
  $("ranges").append(...rangeButtons);

  // Category picker, grouped so 21 options stay scannable.
  const chips = new Map<string, HTMLButtonElement>();
  for (const group of new Set(
    stats.categories.map((category) => category.group),
  )) {
    const buttons = stats.categories
      .filter((category) => category.group === group)
      .map((category) => {
        const button = el(
          "button",
          {
            type: "button",
            className: "chip",
            onclick: () => select(category),
          },
          category.label,
        );
        chips.set(category.id, button);
        return button;
      });
    $("picker").append(el("dt", {}, group), el("dd", {}, ...buttons));
  }

  function renderStats() {
    const { rate, n } = current;
    const change = demandChange(current);
    const tile = (label: string, value: string, hint: string) => [
      el("dt", {}, label),
      el(
        "dd",
        {},
        el("span", { className: "value" }, value),
        el("span", { className: "hint" }, hint),
      ),
    ];
    const tiles = [
      tile("TJM médian", rate ? euros(rate.p50) : "–", rateChange(current)),
      tile(
        "Fourchette courante",
        rate ? `${number.format(rate.p25)}–${euros(rate.p75)}` : "–",
        "La moitié des offres",
      ),
      tile(
        "Offres sur 12 mois",
        number.format(n),
        `${signedPercent(change)} sur un an`,
      ),
    ];
    $("stats").replaceChildren(
      ...tiles.map(([label, value]) =>
        el("div", {}, label as Node, value as Node),
      ),
    );
    const warning = $("warning");
    warning.hidden = n >= THIN_GROUP;
    warning.textContent = `Seulement ${number.format(n)} offres sur 12 mois : ces chiffres sont indicatifs.`;
  }

  function renderFactors() {
    const table = (
      title: string,
      rows: Group,
      labels: Record<string, string>,
    ) =>
      el(
        "table",
        {},
        el(
          "thead",
          {},
          el(
            "tr",
            {},
            el("th", { scope: "col" }, title),
            el("th", { scope: "col" }, "TJM"),
            el("th", { scope: "col" }, "Offres"),
          ),
        ),
        el(
          "tbody",
          {},
          ...(rows.length
            ? rows.map((row) =>
                el(
                  "tr",
                  { className: row.n < THIN_GROUP ? "thin" : "" },
                  el("td", {}, labels[row.key] ?? row.key),
                  el("td", {}, euros(row.p50)),
                  el("td", {}, number.format(row.n)),
                ),
              )
            : [el("tr", {}, el("td", { colSpan: 3 }, "Pas assez d'offres"))]),
        ),
      );
    $("factors").replaceChildren(
      table("Expérience", current.experience, EXPERIENCE),
      table("Télétravail", current.remote, REMOTE),
      table("Lieu", current.location, LOCATION),
    );
  }

  function renderSkills() {
    $("skills").replaceChildren(
      ...(current.skills.length
        ? current.skills
            .slice(0, 8)
            .map((skill) =>
              el(
                "li",
                {},
                `${skill.name} `,
                el("span", {}, `${skill.share} %`),
              ),
            )
        : [el("li", { className: "muted" }, "Pas assez d'offres")]),
    );
    const url = new URL(
      "https://www.free-work.com/fr/tech-it/jobs?contracts=contractor",
    );
    if (current.search) url.searchParams.set("query", current.search);
    const cta = $("cta") as HTMLAnchorElement;
    cta.href = url.href;
    cta.textContent = current.search
      ? `Voir les offres ${current.label} sur Free-Work →`
      : "Voir les offres sur Free-Work →";
  }

  function sortValue(category: Category, key: SortKey) {
    if (key === "label") return category.label;
    if (key === "n") return category.n;
    if (key === "demand") return demandChange(category) ?? -Infinity;
    if (key === "spread")
      return category.rate ? category.rate.p75 - category.rate.p25 : -Infinity;
    return category.rate?.p50 ?? -Infinity;
  }

  function renderCompare() {
    const sorted = [...stats.categories].sort((a, b) => {
      const [x, y] = [sortValue(a, sortKey), sortValue(b, sortKey)];
      const order =
        typeof x === "string"
          ? x.localeCompare(String(y), "fr")
          : x - (y as number);
      return sortDescending ? -order : order;
    });
    const column = (label: string, key: SortKey) =>
      el(
        "th",
        {
          scope: "col",
          ...(sortKey === key
            ? { "aria-sort": sortDescending ? "descending" : "ascending" }
            : {}),
        },
        el(
          "button",
          {
            type: "button",
            onclick: () => {
              sortDescending =
                sortKey === key ? !sortDescending : key !== "label";
              sortKey = key;
              renderCompare();
            },
          },
          `${label}${sortKey === key ? (sortDescending ? " ↓" : " ↑") : ""}`,
        ),
      );
    $("compare").replaceChildren(
      el(
        "thead",
        {},
        el(
          "tr",
          {},
          column("Profil", "label"),
          column("TJM médian", "p50"),
          column("Fourchette", "spread"),
          column("Offres", "n"),
          column("Sur un an", "demand"),
        ),
      ),
      el(
        "tbody",
        {},
        ...sorted.map((category) =>
          el(
            "tr",
            {
              className: category.n < THIN_GROUP ? "thin" : "",
              "aria-selected": category.id === current.id,
              onclick: () => select(category, true),
            },
            el(
              "td",
              {},
              el(
                "button",
                { type: "button", onclick: () => select(category, true) },
                category.label,
              ),
            ),
            el("td", {}, category.rate ? euros(category.rate.p50) : "–"),
            el(
              "td",
              {},
              category.rate
                ? `${number.format(category.rate.p25)}–${euros(category.rate.p75)}`
                : "–",
            ),
            el("td", {}, number.format(category.n)),
            el("td", {}, signedPercent(demandChange(category))),
          ),
        ),
      ),
    );
  }

  function select(category: Category, scroll = false) {
    current = category;
    history.replaceState(null, "", `#${category.id}`);
    for (const [id, chip] of chips)
      chip.setAttribute("aria-pressed", String(id === category.id));
    rateChart.setData(
      [indexes, category.p25, category.p50, category.p75],
      true,
    );
    volumeChart.setData([indexes, category.volume], true);
    applyRange();
    showRate();
    showVolume();
    renderStats();
    renderFactors();
    renderSkills();
    renderCompare();
    if (scroll) scrollTo({ top: 0, behavior: "smooth" });
  }

  new ResizeObserver(() => {
    rateChart.setSize({ width: rateHost.clientWidth, height: 300 });
    volumeChart.setSize({ width: volumeHost.clientWidth, height: 150 });
  }).observe(rateHost);

  addEventListener("hashchange", () => {
    const category = find(location.hash.slice(1));
    if (category && category !== current) select(category);
  });

  const first = months[0] as string;
  $("lede").textContent =
    `${number.format(stats.offers)} offres freelance IT depuis ${monthDate(first).getUTCFullYear()}, mises à jour chaque jour.`;
  const updated = new Date(stats.generatedAt);
  const updatedLabel = updated.toLocaleDateString("fr-FR");
  $("updated").textContent = `Mis à jour le ${updatedLabel}.`;
  // A stopped daily job reports no error, so this makes it visible instead.
  if (Date.now() - updated.getTime() > STALE_AFTER_DAYS * 86_400_000) {
    const stale = $("stale");
    stale.textContent = `Ces données datent du ${updatedLabel} : la mise à jour quotidienne semble interrompue.`;
    stale.hidden = false;
  }
  select(current);
}

fetch("/data.json")
  .then((response) => {
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json() as Promise<Stats>;
  })
  .then(main)
  .catch((error) => {
    console.error(error);
    $("lede").textContent =
      "Impossible de charger les données. Réessayez dans un instant.";
  });
