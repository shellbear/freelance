# Freelance Market Intelligence

Analytics dashboard for French tech freelance offers. Collects contractor job postings daily from [free-work.com](https://www.free-work.com) and presents market insights: rates, trends, top technologies, and hiring companies.

**[freelance.shellbear.me](https://freelance.shellbear.me/)**

![Dashboard Preview](.github/img/preview.png)

## Features

- **KPI dashboard** — total offers, average/median daily rates (TJM), period-over-period trends
- **Interactive charts** — offer volume over time, rate evolution, rate distribution histogram, top technologies
- **Company rankings** — top hiring companies with average rate ranges
- **Best offers** — highest-paying offers with pagination
- **Filtering** — search by keyword and filter by time period (7d, 30d, 90d, 1y, all)
- **Daily data collection** — automated cron job fetches new offers every day at 08:00 UTC

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript 5.9
- **UI:** Tailwind CSS 4, shadcn/ui components, Recharts
- **Database:** PostgreSQL with Prisma 6
- **Deployment:** Vercel (with cron support)

## Prerequisites

- Node.js 20+
- pnpm
- A PostgreSQL database

## Getting Started

1. **Install dependencies**

   ```sh
   pnpm install
   ```

2. **Configure environment variables**

   Copy `.env` to `.env.local` and fill in your database connection string:

   ```
   DATABASE_URL="postgresql://user:password@host:5432/dbname"
   ```

3. **Set up the database**

   ```sh
   pnpm prisma migrate dev
   ```

4. **Start the dev server**

   ```sh
   pnpm dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. **Seed initial data** (optional)

   Trigger the cron endpoint once to fetch the latest offers:

   ```sh
   curl http://localhost:3000/api/cron
   ```

## API Endpoints

| Endpoint | Description |
|---|---|
| `GET /api/stats` | Global KPIs (totals, averages, medians, trends) |
| `GET /api/offers` | Offer volume and average rates grouped by day |
| `GET /api/best-offers` | Top offers sorted by highest rate (paginated) |
| `GET /api/technologies` | Top job categories by offer count and avg rate |
| `GET /api/companies` | Top companies by offer count and avg rate |
| `GET /api/rate-distribution` | Daily rate distribution in 100EUR buckets |
| `GET /api/cron` | Fetches new offers from free-work.com |

All endpoints (except `/api/cron`) accept `?search=` and `?period=` query params.

## Project Structure

```
app/
  layout.tsx              Root layout (fonts, metadata, analytics)
  page.tsx                Main dashboard page
  api/                    Route Handlers
components/
  ui/                     Reusable UI primitives (Card, Table, Badge, etc.)
  dashboard/              Dashboard-specific components (charts, filters, tables)
lib/
  prisma.ts               Prisma client singleton
  queries.ts              Shared query helpers
  utils.ts                Utility functions (cn, periodToDate)
prisma/
  schema.prisma           Database schema
styles/
  globals.css             Tailwind v4 theme and global styles
```

## Deployment

The project is configured for Vercel. The `vercel.json` file defines a daily cron job at 08:00 UTC that calls `/api/cron` to ingest new offers.

## License

Private project.
