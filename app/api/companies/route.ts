import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const where = buildSearchWhere(search, period);

  const companies = await prisma.offer.groupBy({
    by: ["company"],
    where,
    _count: { _all: true },
    _avg: { minimumSalary: true, maximumSalary: true },
    orderBy: { _count: { company: "desc" } },
    take: 20,
  });

  return NextResponse.json(
    companies.map((c) => ({
      company: c.company,
      count: c._count._all,
      avgMinRate: Math.round(c._avg.minimumSalary ?? 0),
      avgMaxRate: Math.round(c._avg.maximumSalary ?? 0),
    }))
  );
}
