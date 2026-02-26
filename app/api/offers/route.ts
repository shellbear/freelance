import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const where = buildSearchWhere(search, period);

  const offers = await prisma.offer.groupBy({
    by: ["publishedAt"],
    _avg: {
      maximumSalary: true,
      minimumSalary: true,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      publishedAt: "asc",
    },
    where,
  });

  return NextResponse.json(offers);
}
