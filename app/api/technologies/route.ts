import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;

  const where = buildSearchWhere(search, period);

  const technologies = await prisma.offer.groupBy({
    by: ["job"],
    where: { ...where, job: { not: null } },
    _count: { _all: true },
    _avg: { minimumSalary: true, maximumSalary: true },
    orderBy: { _count: { job: "desc" } },
    take: 15,
  });

  return NextResponse.json(
    technologies.map((t) => ({
      job: t.job,
      count: t._count._all,
      avgMinRate: Math.round(t._avg.minimumSalary ?? 0),
      avgMaxRate: Math.round(t._avg.maximumSalary ?? 0),
    }))
  );
}
