import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

type Granularity = "day" | "week" | "month";

function granularityForPeriod(period: Period): Granularity {
  switch (period) {
    case "7d":
    case "30d":
      return "day";
    case "90d":
    case "1y":
      return "week";
    case "all":
    default:
      return "month";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const where = buildSearchWhere(search, period);
  const granularity = granularityForPeriod(period);

  if (granularity === "day") {
    const offers = await prisma.offer.groupBy({
      by: ["publishedAt"],
      _avg: { maximumSalary: true, minimumSalary: true },
      _count: { _all: true },
      orderBy: { publishedAt: "asc" },
      where,
    });

    return NextResponse.json(offers);
  }

  // For week/month, use raw SQL to truncate dates
  const trunc = granularity === "week" ? "week" : "month";

  const searchConditions: string[] = [];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    const words = search.split(" ");
    for (const word of words) {
      searchConditions.push(
        `("title" ILIKE $${paramIndex} OR "description" ILIKE $${paramIndex} OR "job" ILIKE $${paramIndex})`
      );
      params.push(`%${word}%`);
      paramIndex++;
    }
  }

  if (period && period !== "all") {
    const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period];
    searchConditions.push(`"publishedAt" >= NOW() - INTERVAL '${days} days'`);
  }

  const whereClause =
    searchConditions.length > 0
      ? `WHERE ${searchConditions.join(" AND ")}`
      : "";

  const rows = await prisma.$queryRawUnsafe<
    {
      period_start: Date;
      avg_min: number | null;
      avg_max: number | null;
      count: bigint;
    }[]
  >(
    `SELECT
      DATE_TRUNC('${trunc}', "publishedAt") as period_start,
      AVG("minimumSalary") as avg_min,
      AVG("maximumSalary") as avg_max,
      COUNT(*) as count
    FROM "Offer"
    ${whereClause}
    GROUP BY period_start
    ORDER BY period_start ASC`,
    ...params
  );

  const result = rows.map((r) => ({
    publishedAt: r.period_start.toISOString(),
    _avg: {
      minimumSalary: r.avg_min ? Number(r.avg_min) : null,
      maximumSalary: r.avg_max ? Number(r.avg_max) : null,
    },
    _count: { _all: Number(r.count) },
  }));

  return NextResponse.json(result);
}
