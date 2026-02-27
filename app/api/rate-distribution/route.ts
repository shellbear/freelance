import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const conditions: string[] = ['"maximumSalary" IS NOT NULL'];
  const params: unknown[] = [];
  let paramIndex = 1;

  if (search) {
    for (const word of search.split(" ")) {
      conditions.push(
        `("title" ILIKE $${paramIndex} OR "description" ILIKE $${paramIndex} OR "job" ILIKE $${paramIndex})`
      );
      params.push(`%${word}%`);
      paramIndex++;
    }
  }

  if (period && period !== "all") {
    const days = { "7d": 7, "30d": 30, "90d": 90, "1y": 365 }[period];
    conditions.push(`"publishedAt" >= NOW() - INTERVAL '${days} days'`);
  }

  const whereClause = `WHERE ${conditions.join(" AND ")}`;

  const rows = await prisma.$queryRawUnsafe<
    { bucket_start: number; count: bigint }[]
  >(
    `SELECT
      FLOOR("maximumSalary" / 100) * 100 AS bucket_start,
      COUNT(*) AS count
    FROM "Offer"
    ${whereClause}
    GROUP BY bucket_start
    ORDER BY bucket_start ASC`,
    ...params
  );

  const result = rows.map((r) => ({
    bucket: `${Number(r.bucket_start)}-${Number(r.bucket_start) + 100}`,
    count: Number(r.count),
  }));

  return NextResponse.json(result);
}
