import { PrismaClient } from "@prisma/client";
import { NextApiHandler } from "next";

export const getOffers = async (query?: string) => {
  return await prisma.offer.groupBy({
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
    ...(query && {
      where: {
        AND: query.split(" ").map((search) => ({
          OR: [
            {
              title: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: search,
                mode: "insensitive",
              },
            },
            {
              job: {
                contains: search,
                mode: "insensitive",
              },
            },
          ],
        })),
      },
    }),
  });
};

const prisma = new PrismaClient();

export type OffersResponse = Awaited<ReturnType<typeof getOffers>>;

const handler: NextApiHandler<OffersResponse> = async (req, res) => {
  const offers = await getOffers(req.query.search as string);
  return res.status(200).json(offers);
};

export default handler;
