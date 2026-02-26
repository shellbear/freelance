import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const where = buildSearchWhere(search, period);

  // Get all offers with rates to compute buckets
  const offers = await prisma.offer.findMany({
    where: {
      ...where,
      maximumSalary: { not: null },
    },
    select: { maximumSalary: true },
  });

  // Create buckets of 100€ increments
  const buckets: Record<string, number> = {};
  const bucketSize = 100;

  for (const offer of offers) {
    if (offer.maximumSalary == null) continue;
    const bucketStart =
      Math.floor(offer.maximumSalary / bucketSize) * bucketSize;
    const label = `${bucketStart}-${bucketStart + bucketSize}`;
    buckets[label] = (buckets[label] || 0) + 1;
  }

  // Sort by bucket start value and return
  const sorted = Object.entries(buckets)
    .map(([bucket, count]) => ({ bucket, count }))
    .sort(
      (a, b) =>
        parseInt(a.bucket.split("-")[0]) - parseInt(b.bucket.split("-")[0])
    );

  return NextResponse.json(sorted);
}
