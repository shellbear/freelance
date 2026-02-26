import { Prisma } from "@prisma/client";
import { periodToDate, type Period } from "./utils";

export function buildSearchWhere(query?: string, period?: Period): Prisma.OfferWhereInput {
  const conditions: Prisma.OfferWhereInput[] = [];

  if (query) {
    conditions.push({
      AND: query.split(" ").map((search) => ({
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { description: { contains: search, mode: "insensitive" as const } },
          { job: { contains: search, mode: "insensitive" as const } },
        ],
      })),
    });
  }

  if (period && period !== "all") {
    const fromDate = periodToDate(period);
    if (fromDate) {
      conditions.push({ publishedAt: { gte: fromDate } });
    }
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}
