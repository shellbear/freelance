// Writes the pages search engines read (one per profile, their table, the
// sitemap) from the committed statistics, so anyone can build them.
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { buildPages } from "./pages";

const stats = await Bun.file("public/data.json").json();
const pages = buildPages(stats);
for (const [path, content] of pages) {
  const file = `public/${path}`;
  mkdirSync(dirname(file), { recursive: true });
  await Bun.write(file, content);
}
console.log(`${pages.size - 1} pages and the sitemap`);
