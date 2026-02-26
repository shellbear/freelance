import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildSearchWhere } from "@/lib/queries";
import type { Period } from "@/lib/utils";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const search = searchParams.get("search") || undefined;
  const period = (searchParams.get("period") || "all") as Period;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = 20;

  const where = buildSearchWhere(search, period);

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      orderBy: [{ maximumSalary: "desc" }, { minimumSalary: "desc" }],
      where: {
        ...where,
        maximumSalary: { not: null },
        minimumSalary: { not: null },
      },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.offer.count({
      where: {
        ...where,
        maximumSalary: { not: null },
        minimumSalary: { not: null },
      },
    }),
  ]);

  return NextResponse.json({
    offers,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}
