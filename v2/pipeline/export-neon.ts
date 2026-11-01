// One-off migration: copies offers from Postgres into a private Parquet file.
// The connection is read-only, and descriptions are left behind on purpose.
import { mkdirSync } from "node:fs";
import { DuckDBInstance } from "@duckdb/node-api";

const url = new URL(process.env.DATABASE_URL ?? "");
for (const key of [...url.searchParams.keys()]) {
  if (key !== "sslmode") url.searchParams.delete(key);
}

mkdirSync(".data", { recursive: true });
const db = await (await DuckDBInstance.create()).connect();
try {
  await db.run("INSTALL postgres; LOAD postgres;");
  await db.run(
    `ATTACH '${url.href.replaceAll("'", "''")}' AS pg (TYPE postgres, READ_ONLY)`,
  );
  await db.run(`
    COPY (
      SELECT "sourceId" AS id, title, company, job, skills,
             "minimumSalary" AS min_rate, "maximumSalary" AS max_rate,
             "publishedAt"::DATE AS published_at, "remoteMode" AS remote,
             "experienceLevel" AS experience, "locationRegion" AS region,
             "locationCountryCode" AS country
      FROM pg.public."Offer" ORDER BY "publishedAt"
    ) TO '.data/offers.parquet' (FORMAT parquet, COMPRESSION zstd)`);
  const result = await db.runAndReadAll(`
    SELECT count(*)::INT AS n, min(published_at)::VARCHAR AS first, max(published_at)::VARCHAR AS last
    FROM '.data/offers.parquet'`);
  console.log(result.getRowObjectsJS()[0]);
} catch (error) {
  // DuckDB can echo the connection string, so never print its raw message.
  const message = error instanceof Error ? error.message : String(error);
  console.error(
    "export failed:",
    message.replace(/postgres(ql)?:\/\/\S+/g, "<database url>"),
  );
  process.exit(1);
}
