// Draws the trends chart as a shareable image, with its title, source and site
// address baked in, so a copied or downloaded chart always says where it came from.
import {
  formatChange,
  formatCount,
  formatRate,
  formatRatio,
  STABLE,
  type Trend,
  type trends,
} from "./trends";

const WIDTH = 1200;
const SCALE = 2;
const COLORS = {
  bg: "#0b0c0e",
  card: "#141517",
  ink: "#f0efec",
  muted: "#a3a29b",
  faint: "#6f6e69",
  line: "#2a2b2d",
  up: "#3987e5",
  down: "#d95926",
  flat: "#5d5c58",
};
const SANS =
  '-apple-system, "SF Pro Display", "Segoe UI", Inter, "Helvetica Neue", Arial, sans-serif';
const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

// Card and chart geometry, in CSS pixels.
const CARD = { x: 28, y: 28, w: WIDTH - 56, padTop: 56, padBottom: 28 };
const LEFT = CARD.x + 40;
const RIGHT = CARD.x + CARD.w - 40;
const LABEL_X = CARD.x + 330;
const PLOT_L = CARD.x + 380;
const PLOT_R = CARD.x + CARD.w - 360; // leaves room for values and the rate column
const ROW_H = 47;
const BAR_H = 28;
const GROUP_HEAD = 44;
const GROUP_GAP = 18;

type Span = { text: string; color: string };
type Options = {
  result: ReturnType<typeof trends>;
  /** "nov. 2025 – oct. 2026" and the year before. */
  period: string;
  priorPeriod: string;
  url: string;
};

/** Wraps colored spans word by word; returns the y after the last line. */
function drawSpans(
  ctx: CanvasRenderingContext2D,
  spans: Span[],
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  align: "left" | "right" = "left",
) {
  const words = spans.flatMap((span) =>
    span.text
      .split(/(?<= )/)
      .filter(Boolean)
      .map((text) => ({ text, color: span.color })),
  );
  const lines: Span[][] = [[]];
  let width = 0;
  for (const word of words) {
    const w = ctx.measureText(word.text).width;
    const line = lines.at(-1) as Span[];
    if (width + w > maxWidth && line.length) {
      lines.push([word]);
      width = w;
    } else {
      line.push(word);
      width += w;
    }
  }
  for (const line of lines) {
    const lineWidth = ctx.measureText(
      line
        .map((s) => s.text)
        .join("")
        .trimEnd(),
    ).width;
    let cx = align === "right" ? x - lineWidth : x;
    for (const word of line) {
      ctx.fillStyle = word.color;
      ctx.fillText(word.text, cx, y);
      cx += ctx.measureText(word.text).width;
    }
    y += lineHeight;
  }
  return y;
}

/** A tall drawing layer, and a finish step that adds the card, footer and crop. */
function startImage() {
  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = 3000 * SCALE;
  const ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
  ctx.scale(SCALE, SCALE);

  // Content goes on its own layer: the card behind it needs the final height.
  const content = document.createElement("canvas");
  content.width = canvas.width;
  content.height = canvas.height;
  const c = content.getContext("2d") as CanvasRenderingContext2D;
  c.scale(SCALE, SCALE);

  const finish = (cardBottom: number, url: string, source: string) => {
    // The site address, then the source on its own line so they never collide.
    c.textAlign = "left";
    c.font = `700 22px ${MONO}`;
    const [host, ...path] = url.split("/");
    const [name, ...domain] = (host as string).split(".");
    const brand: Span[] = [
      { text: name as string, color: COLORS.ink },
      { text: ".", color: COLORS.up },
      { text: [domain.join("."), ...path].join("/"), color: COLORS.ink },
    ];
    let bx = CARD.x + 28;
    const brandY = cardBottom + 46;
    for (const part of brand) {
      c.fillStyle = part.color;
      c.fillText(part.text, bx, brandY);
      bx += c.measureText(part.text).width;
    }
    c.font = `400 16px ${SANS}`;
    const footerEnd = drawSpans(
      c,
      [{ text: source, color: COLORS.faint }],
      CARD.x + 28,
      brandY + 32,
      CARD.w - 56,
      24,
    );
    const height = Math.ceil(footerEnd + 12);

    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, WIDTH, height);
    ctx.fillStyle = COLORS.card;
    ctx.strokeStyle = COLORS.line;
    ctx.beginPath();
    ctx.roundRect(
      CARD.x + 0.5,
      CARD.y + 0.5,
      CARD.w - 1,
      cardBottom - CARD.y,
      20,
    );
    ctx.fill();
    ctx.stroke();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(content, 0, 0);

    const out = document.createElement("canvas");
    out.width = WIDTH * SCALE;
    out.height = height * SCALE;
    out.getContext("2d")?.drawImage(canvas, 0, 0);
    return out;
  };
  return { c, finish };
}

/** Title and subtitle at the top of the card; returns the y below them. */
function drawHeading(
  c: CanvasRenderingContext2D,
  title: Span[],
  subtitle: Span[],
) {
  c.font = `800 50px ${SANS}`;
  const y = drawSpans(
    c,
    title,
    LEFT,
    CARD.y + CARD.padTop + 46,
    RIGHT - LEFT,
    58,
  );
  c.font = `400 24px ${SANS}`;
  return drawSpans(c, subtitle, LEFT, y + 4, RIGHT - LEFT, 32);
}

/** Frames an SVG chart with a title, the site address and its source. */
export async function drawSvgImage({
  title,
  subtitle,
  svg,
  svgHeight,
  url,
  source,
}: {
  title: Span[];
  subtitle: Span[];
  svg: (width: number) => string;
  svgHeight: number;
  url: string;
  source: string;
}) {
  const { c, finish } = startImage();
  const y = drawHeading(c, title, subtitle) + 16;
  const width = RIGHT - LEFT;
  const image = new Image();
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg(width))}`;
  await image.decode();
  c.drawImage(image, LEFT, y, width, svgHeight);
  return finish(y + svgHeight + CARD.padBottom + 8, url, source);
}

export const IMAGE_COLORS = COLORS;
export type { Span };

export function drawTrendsImage({ result, period, priorPeriod, url }: Options) {
  const { market, up, stable, down } = result;
  const ranked = [...up, ...stable, ...down];
  const { c, finish } = startImage();

  const top = up[0];
  const bottom = down.at(-1);
  const title: Span[] = [{ text: "Freelance IT : ", color: COLORS.ink }];
  if (top)
    title.push({
      text: `${top.label} ×${formatRatio(top.n / top.nPrior)}`,
      color: COLORS.up,
    });
  if (bottom)
    title.push({
      text: `${top ? ", " : ""}${bottom.label}\u00a0${formatChange(bottom.change)}`,
      color: COLORS.ink,
    });

  const subtitle: Span[] = [
    {
      text: "Évolution sur un an du nombre d'offres freelance IT en France. ",
      color: COLORS.muted,
    },
  ];
  if (market)
    subtitle.push(
      { text: "Marché global : ", color: COLORS.muted },
      { text: formatChange(market.change), color: COLORS.ink },
      {
        text: ` (${formatCount(market.nPrior)} → ${formatCount(market.n)} offres).`,
        color: COLORS.muted,
      },
    );
  let y = drawHeading(c, title, subtitle);

  const changes = ranked.map((t) => t.change);
  const low = Math.min(-50, Math.floor(Math.min(...changes) / 50) * 50);
  const high = Math.max(50, Math.ceil(Math.max(...changes) / 50) * 50);
  const at = (value: number) =>
    PLOT_L + ((value - low) / (high - low)) * (PLOT_R - PLOT_L);

  const groups = [
    { title: "EN HAUSSE", rows: up },
    { title: "STABLE", rows: stable },
    { title: "EN BAISSE", rows: down },
  ].filter((group) => group.rows.length);

  const plotTop = y + 4;
  y = plotTop;
  const bars: (() => void)[] = [];
  for (const [index, group] of groups.entries()) {
    if (index > 0) {
      c.fillStyle = COLORS.line;
      c.fillRect(LEFT, y + GROUP_GAP / 2, RIGHT - LEFT, 1);
      y += GROUP_GAP;
    }
    c.font = `700 16px ${MONO}`;
    c.fillStyle = COLORS.muted;
    c.textAlign = "left";
    if ("letterSpacing" in c) c.letterSpacing = "2px";
    c.fillText(group.title, LEFT, y + 30);
    if (index === 0) {
      c.textAlign = "right";
      c.fillText("TJM MÉDIAN", RIGHT, y + 30);
      c.textAlign = "left";
    }
    if ("letterSpacing" in c) c.letterSpacing = "0px";
    y += GROUP_HEAD;
    for (const trend of group.rows) {
      const cy = y + ROW_H / 2;
      bars.push(() => drawRow(c, trend, cy, at));
      y += ROW_H;
    }
  }
  const plotBottom = y;

  // Gridlines under the bars.
  for (let tick = low; tick <= high; tick += 50) {
    c.fillStyle = tick === 0 ? COLORS.muted : COLORS.line;
    const w = tick === 0 ? 2 : 1;
    c.fillRect(
      at(tick) - w / 2,
      plotTop + GROUP_HEAD - 6,
      w,
      plotBottom - plotTop - GROUP_HEAD + 6,
    );
    c.font = `400 15px ${MONO}`;
    c.fillStyle = COLORS.faint;
    c.textAlign = "center";
    c.fillText(formatChange(tick), at(tick), plotBottom + 30);
  }
  for (const bar of bars) bar();

  const cardBottom = plotBottom + 44 + CARD.padBottom;

  return finish(
    cardBottom,
    url,
    `Source : offres Free-Work, ${period} vs ${priorPeriod} · CC\u00a0BY\u00a04.0`,
  );
}

function drawRow(
  c: CanvasRenderingContext2D,
  trend: Trend,
  cy: number,
  at: (value: number) => number,
) {
  c.textAlign = "right";
  c.fillStyle = COLORS.ink;
  c.font = `500 23px ${SANS}`;
  if (trend.note) {
    c.fillText(trend.label, LABEL_X, cy + 1);
    c.font = `400 15px ${SANS}`;
    c.fillStyle = COLORS.muted;
    c.fillText(trend.note, LABEL_X, cy + 20);
  } else {
    c.fillText(trend.label, LABEL_X, cy + 8);
  }

  const zero = at(0);
  const end = at(trend.change);
  const width = Math.max(Math.abs(end - zero), 3);
  const positive = trend.change >= 0;
  c.fillStyle =
    trend.change > STABLE
      ? COLORS.up
      : trend.change < -STABLE
        ? COLORS.down
        : COLORS.flat;
  c.beginPath();
  c.roundRect(
    positive ? zero : zero - width,
    cy - BAR_H / 2,
    width,
    BAR_H,
    positive ? [0, 4, 4, 0] : [4, 0, 0, 4],
  );
  c.fill();

  c.textAlign = "left";
  const x = (positive ? end : zero) + 12;
  c.font = `700 22px ${MONO}`;
  c.fillStyle = COLORS.ink;
  const value = formatChange(trend.change);
  c.fillText(value, x, cy + 8);
  const valueWidth = c.measureText(value).width;
  c.font = `400 16px ${MONO}`;
  c.fillStyle = COLORS.faint;
  c.fillText(
    `${formatCount(trend.nPrior)} → ${formatCount(trend.n)}`,
    x + valueWidth + 12,
    cy + 8,
  );

  const rate = formatRate(trend);
  c.textAlign = "right";
  let rx = RIGHT;
  if (rate?.move) {
    c.font = `400 16px ${MONO}`;
    c.fillStyle = COLORS.faint;
    c.fillText(rate.move, rx, cy + 8);
    rx -= c.measureText(rate.move).width + 10;
  }
  c.font = `700 20px ${MONO}`;
  c.fillStyle = rate ? COLORS.ink : COLORS.faint;
  c.fillText(rate?.rate ?? "–", rx, cy + 8);
  c.textAlign = "left";
}
