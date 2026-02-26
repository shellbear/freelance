import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const where = buildSearchWhere(search, period);

  const [current, aggregates] = await Promise.all([
    prisma.offer.aggregate({
      where,
      _count: { _all: true },
      _avg: { minimumSalary: true, maximumSalary: true },
    }),
    prisma.offer.aggregate({
      where: {
        ...where,
        minimumSalary: { not: null },
        maximumSalary: { not: null },
      },
      _avg: { minimumSalary: true, maximumSalary: true },
    }),
  ]);

  // Calculate median rates via raw SQL
  const medianResult = await prisma.$queryRawUnsafe<
    { median_min: number | null; median_max: number | null }[]
  >(
    `SELECT
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "minimumSalary") as median_min,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY "maximumSalary") as median_max
    FROM "Offer"
    WHERE "minimumSalary" IS NOT NULL AND "maximumSalary" IS NOT NULL`
  );

  // Calculate trend (compare current period to previous equivalent period)
  let offersTrend = 0;
  let rateTrend = 0;

  if (period !== "all") {
    const now = new Date();
    const periodDays = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period];
    const prevStart = new Date(now);
    prevStart.setDate(prevStart.getDate() - periodDays * 2);
    const prevEnd = new Date(now);
    prevEnd.setDate(prevEnd.getDate() - periodDays);

    const prevWhere = buildSearchWhere(search);
    const previousPeriod = await prisma.offer.aggregate({
      where: {
        ...prevWhere,
        publishedAt: { gte: prevStart, lt: prevEnd },
      },
      _count: { _all: true },
      _avg: { maximumSalary: true },
    });

    if (previousPeriod._count._all > 0) {
      offersTrend =
        ((current._count._all - previousPeriod._count._all) /
          previousPeriod._count._all) *
        100;
    }

    if (previousPeriod._avg.maximumSalary && aggregates._avg.maximumSalary) {
      rateTrend =
        ((aggregates._avg.maximumSalary - previousPeriod._avg.maximumSalary) /
          previousPeriod._avg.maximumSalary) *
        100;
    }
  }

  // Get top technology
  const topTech = await prisma.offer.groupBy({
    by: ["job"],
    where: { ...where, job: { not: null } },
    _count: { _all: true },
    orderBy: { _count: { job: "desc" } },
    take: 1,
  });

  return NextResponse.json({
    totalOffers: current._count._all,
    avgMinRate: Math.round(aggregates._avg.minimumSalary ?? 0),
    avgMaxRate: Math.round(aggregates._avg.maximumSalary ?? 0),
    medianMinRate: Math.round(Number(medianResult[0]?.median_min ?? 0)),
    medianMaxRate: Math.round(Number(medianResult[0]?.median_max ?? 0)),
    offersTrend: Math.round(offersTrend * 10) / 10,
    rateTrend: Math.round(rateTrend * 10) / 10,
    topTechnology: topTech[0]?.job ?? "N/A",
  });
}
