// Small helpers for reading text out of scraped HTML.

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  rsquo: "’",
  lsquo: "‘",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  laquo: "«",
  raquo: "»",
  eacute: "é",
  egrave: "è",
  agrave: "à",
  ccedil: "ç",
};

/** "R&amp;D &#8211; d&rsquo;un" becomes "R&D – d’un"; unknown entities are left as they are. */
export const decodeEntities = (text: string) =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, code: string) => {
    if (code.startsWith("#x") || code.startsWith("#X"))
      return String.fromCodePoint(Number.parseInt(code.slice(2), 16));
    if (code.startsWith("#"))
      return String.fromCodePoint(Number.parseInt(code.slice(1), 10));
    return ENTITIES[code.toLowerCase()] ?? entity;
  });

/** True for an https link on the given host; scraped data is not trusted to say so. */
export function isLinkOn(url: string, host: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname === host;
  } catch {
    return false;
  }
}
