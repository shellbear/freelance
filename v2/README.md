# Freelance stats

TJM and demand per profile for IT freelancers in France. A static page and one
JSON file, rebuilt every day.

## How it works

1. `pipeline/fetch.ts` merges the last 7 days of Free-Work offers into a private
   Parquet file, without their descriptions.
2. `pipeline/build.ts` turns that file into `public/data.json`, which holds
   aggregated statistics only.
3. `.github/workflows/daily-stats.yml` runs both every day, stores the Parquet
   file in a private R2 bucket, deploys the static site to Cloudflare and commits
   `data.json`. The daily commit keeps the schedule active and gives the
   statistics a public history.

Offer-level data must stay out of this public repository: `.data/` is ignored.

## Commands

```sh
bun install
bun run verify      # format, type check and tests
bunx wrangler@4 r2 object get freelance-offers/offers.parquet --remote --file .data/offers.parquet
bun run fetch       # needs .data/offers.parquet
bun run build
bun run dev         # http://localhost:8787
```

## Licences

Code: GPL-3.0, see `../LICENSE`. Statistics in `public/data.json`: CC BY 4.0.
