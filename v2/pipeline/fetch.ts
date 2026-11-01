// Daily ingest: merges the last 7 days of offers into the private Parquet file.
// Re-reading a full week means one failed run heals itself the next day.
import { renameSync, rmSync } from "node:fs";
import { DuckDBInstance } from "@duckdb/node-api";

const API = "https://www.free-work.com/api/job_postings";
const PAGE_SIZE = 50;
const RETRIES = 3;
const KEYWORDS = [
  "développeur",
  "developer",
  "dev",
  "devops",
  "backend",
  "frontend",
  "full-stack",
  "fullstack",
  "pentest",
  "rssi",
  "cybersécurité",
  "react",
  "nodejs",
  "go",
  "c",
  "c++",
  "rust",
  "typescript",
  "golang",
  "python",
  "flutter",
  "react native",
  "swift",
  "sql",
  "mobile",
  "cto",
  "lead dev",
  "javascript",
  "aws",
  "gcp",
  "azure",
  "architecte",
];

type Posting = {
  id: number;
  title: string;
  minDailySalary: number | null;
  maxDailySalary: number | null;
  publishedAt: string;
  company: { name: string };
  job: { name: string };
  location: { adminLevel1: string | null; countryCode: string | null } | null;
  remoteMode: string | null;
  skills: { name: string }[] | null;
  experienceLevel: string | null;
};
type Page = { "hydra:totalItems": number; "hydra:member": Posting[] };

async function fetchPage(page: number): Promise<Page> {
  const url = new URL(API);
  url.search = new URLSearchParams({
    page: String(page),
    itemsPerPage: String(PAGE_SIZE),
    contracts: "contractor",
    publishedSince: "less_than_7_days",
    searchKeywords: KEYWORDS.join(","),
  }).toString();

  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return (await response.json()) as Page;
    } catch (error) {
      if (attempt === RETRIES) throw error;
      await Bun.sleep(2000 * attempt);
    }
  }
}

const toRow = (offer: Posting) => ({
  id: String(offer.id),
  title: offer.title,
  company: offer.company.name,
  job: offer.job.name,
  skills: offer.skills?.map((skill) => skill.name) ?? [],
  min_rate: offer.minDailySalary,
  max_rate: offer.maxDailySalary,
  published_at: offer.publishedAt.slice(0, 10),
  remote: offer.remoteMode,
  experience: offer.experienceLevel,
  region: offer.location?.adminLevel1 ?? null,
  country: offer.location?.countryCode ?? null,
});

const rows = new Map<string, ReturnType<typeof toRow>>();
const failedPages: number[] = [];
let totalPages = 1;

for (let page = 1; page <= totalPages; page++) {
  try {
    const result = await fetchPage(page);
    totalPages = Math.ceil(result["hydra:totalItems"] / PAGE_SIZE);
    for (const offer of result["hydra:member"]) {
      rows.set(String(offer.id), toRow(offer));
    }
  } catch (error) {
    console.error(`page ${page} failed:`, error);
    failedPages.push(page);
  }
  await Bun.sleep(500);
}

if (rows.size > 0) {
  await Bun.write(".data/new.json", JSON.stringify([...rows.values()]));
  const db = await (await DuckDBInstance.create()).connect();
  await db.run(`
    COPY (
      SELECT id, title, company, job, skills, min_rate, max_rate, published_at,
             remote, experience, region, country
      FROM (
        SELECT *, 1 AS priority FROM read_json('.data/new.json', columns = {
          id: 'VARCHAR', title: 'VARCHAR', company: 'VARCHAR', job: 'VARCHAR',
          skills: 'VARCHAR[]', min_rate: 'INTEGER', max_rate: 'INTEGER',
          published_at: 'DATE', remote: 'VARCHAR', experience: 'VARCHAR',
          region: 'VARCHAR', country: 'VARCHAR'
        })
        UNION ALL BY NAME
        SELECT *, 0 AS priority FROM '.data/offers.parquet'
      )
      -- Free-Work moves publishedAt forward on existing offers, so the first version
      -- seen wins. Otherwise old offers would keep jumping to the current month.
      QUALIFY row_number() OVER (PARTITION BY id ORDER BY priority) = 1
      ORDER BY published_at
    ) TO '.data/offers.tmp.parquet' (FORMAT parquet, COMPRESSION zstd)`);
  renameSync(".data/offers.tmp.parquet", ".data/offers.parquet");
  rmSync(".data/new.json");
}

console.log(`fetched ${rows.size} offers from ${totalPages} pages`);
// Fail loudly so the scheduler reports it, unlike the old cron that failed silently.
if (rows.size === 0 || failedPages.length > 0) {
  console.error("failed pages:", failedPages);
  process.exit(1);
}
