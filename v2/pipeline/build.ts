// Reads the private Parquet file and writes the one public file the site needs.
import { DuckDBInstance } from "@duckdb/node-api";
import { buildStats, type OfferRow } from "./stats";

const db = await (await DuckDBInstance.create()).connect();
const result = await db.runAndReadAll(`
  SELECT title, company, job, skills, min_rate, max_rate,
         published_at::VARCHAR AS day, remote, experience, region, country
  FROM '.data/offers.parquet'`);

const stats = buildStats(
  result.getRowObjectsJS() as unknown as OfferRow[],
  new Date(),
);
// Indented so each daily commit shows a readable diff in the public history.
const json = `${JSON.stringify(stats, null, 1)}\n`;
await Bun.write("public/data.json", json);

console.log(
  `${stats.offers} offers, ${stats.months.length} months, ${stats.categories.length} categories, ${json.length} bytes, ${Bun.gzipSync(json).length} gzipped`,
);
