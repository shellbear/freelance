import { PrismaClient } from "@prisma/client";
import { NextApiHandler } from "next";

const prisma = new PrismaClient();

const getBestOffers = async (query?: string) =>
  prisma.offer.findMany({
    orderBy: [
      {
        maximumSalary: "desc",
      },
      {
        minimumSalary: "desc",
      },
    ],
    where: {
      maximumSalary: {
        not: null,
      },
      minimumSalary: {
        not: null,
      },
      ...(query && {
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
      }),
    },
    take: 20,
  });

export type BestOffersResponse = Awaited<ReturnType<typeof getBestOffers>>;

const handler: NextApiHandler<BestOffersResponse> = async (req, res) => {
  const offers = await getBestOffers(req.query.search as string);
  return res.status(200).json(offers);
};

export default handler;
