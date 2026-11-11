import type { buildStats } from "../pipeline/stats";
import { remoteSeries, remoteSvg } from "./remote";
import { drawSvgImage, drawTrendsImage, IMAGE_COLORS } from "./trends-image";
import {
  formatChange as percent,
  formatCount,
  formatRate,
  formatRatio,
  STABLE,
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

const monthLabel = (month: string) =>
  monthShort.format(new Date(`${month}-01T00:00:00Z`));

function render(stats: Stats) {
  const result = trends(stats.categories);
  const { market, up, stable, down } = result;
  const ranked = [...up, ...stable, ...down];
  if (!ranked.length) throw new Error("no trends");

  const months = stats.months;
  const period = (from: number, to: number) =>
    `${monthLabel(months.at(from) as string)} – ${monthLabel(months.at(to) as string)}`;
  $("period").textContent =
    `${period(-12, -1)}, comparé à ${period(-24, -13)}.`;
  exportButtons(
    $("trends-exports"),
    `freelance-tendances-${months.at(-1)}`,
    async () =>
      drawTrendsImage({
        result,
        period: period(-12, -1),
        priorPeriod: period(-24, -13),
        url: `${SITE}/tendances`,
      }),
    () => trendsCsv(result),
  );
  renderRemote(stats);

  const top = up[0];
  const bottom = down.at(-1);
  const parts = [
    market &&
      `Sur un an, le nombre d'offres freelance IT évolue de ${percent(market.change)} (${formatCount(market.nPrior)} → ${formatCount(market.n)}).`,
    top &&
      `${top.label} : ×${formatRatio(top.n / top.nPrior)} (${percent(top.change)}).`,
    bottom && `${bottom.label} : ${percent(bottom.change)}.`,
  ];
  $("lede").textContent = parts.filter(Boolean).join(" ");

  // The scale always shows ±50 % so small changes keep a sense of proportion.
  const changes = ranked.map((t) => t.change);
  const low = Math.min(-50, Math.floor(Math.min(...changes) / 50) * 50);
  const high = Math.max(50, Math.ceil(Math.max(...changes) / 50) * 50);
  const at = (value: number) => `${((value - low) / (high - low)) * 100}%`;
  const ticks: number[] = [];
  for (let tick = low; tick <= high; tick += 50) ticks.push(tick);
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
        ? { className: "name", href: `/#${trend.id}` }
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

  $("trends").replaceChildren(
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
  );

  $("updated").textContent =
    `Mis à jour le ${new Date(stats.generatedAt).toLocaleDateString("fr-FR")}.`;
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
    // The BOM makes Excel read the accents correctly.
    button("Télécharger CSV", () =>
      download(
        new Blob(["\ufeff", csv()], { type: "text/csv" }),
        `${name}.csv`,
      ),
    ),
  );
}

const share = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
const monthLong = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  timeZone: "UTC",
});
const monthName = (month: string) =>
  monthLong.format(new Date(`${month}-01T00:00:00Z`));

function renderRemote(stats: Stats) {
  const points = remoteSeries(stats.months, stats.remoteByMonth);
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 3) return;

  const pct = (value: number) => `${share.format(value)}\u00a0%`;
  $("remote-lede").textContent =
    `Missions 100 % sur site : ${pct(first.onsite)} des offres en ${monthName(first.month)}, ${pct(last.onsite)} en ${monthName(last.month)}. ` +
    `100 % télétravail : ${pct(last.full)}. Hybride : ${pct(last.hybrid)}.`;

  const host = $("remote-chart");
  const draw = () => {
    const width = host.clientWidth;
    host.innerHTML = remoteSvg(points, {
      width,
      height: width < 600 ? 220 : 280,
      labels: "values",
    });
  };
  draw();
  new ResizeObserver(draw).observe(host);

  const span = `${monthLabel(first.month)} – ${monthLabel(last.month)}`;
  exportButtons(
    $("remote-exports"),
    `freelance-teletravail-${last.month}`,
    () =>
      drawSvgImage({
        title: [
          {
            text: "Freelance IT : missions 100 % sur site ",
            color: IMAGE_COLORS.ink,
          },
          {
            text: `${pct(first.onsite)} → ${pct(last.onsite)}`,
            color: IMAGE_COLORS.up,
          },
        ],
        subtitle: [
          {
            text: `Part des offres freelance IT en France selon le mode de travail, ${span}. Hybride : `,
            color: IMAGE_COLORS.muted,
          },
          { text: pct(last.hybrid), color: IMAGE_COLORS.ink },
          { text: ` en ${monthName(last.month)}.`, color: IMAGE_COLORS.muted },
        ],
        svg: (width) =>
          remoteSvg(points, { width, height: 420, scale: 1.4, labels: "full" }),
        svgHeight: 420,
        url: `${SITE}/tendances#teletravail`,
        source: `Source : offres Free-Work précisant le mode de travail, ${span} · CC\u00a0BY\u00a04.0`,
      }),
    () =>
      [
        "mois,offres_avec_mode,sur_site_pct,hybride_pct,teletravail_pct",
        ...points.map((p) =>
          [p.month, p.n, p.onsite, p.hybrid, p.full]
            .map((v) =>
              typeof v === "number" && !Number.isInteger(v)
                ? v.toFixed(1)
                : String(v),
            )
            .join(","),
        ),
      ].join("\n") + "\n",
  );
  $("teletravail").hidden = false;
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
