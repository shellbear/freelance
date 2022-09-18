import { PrismaClient } from "@prisma/client";
import type { InferGetServerSidePropsType, NextPage } from "next";
import { Line } from "react-chartjs-2";
import { defaults } from "chart.js";
import "chart.js/auto";

defaults.font = {
  ...defaults.font,
  family: "Satoshi",
  size: 16,
};

const Home: NextPage<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ totalCount, offers }) => (
  <div className="container mx-auto h-screen">
    <div className="grid p-20">
      <div className="flex flex-col gap-20">
        <div className="text-center justify-center">
          <h1 className="text-5xl font-black">Freelance</h1>
          <h3 className="text-xl font-semibold">
            Some freelance stats fetched from free-work...
          </h3>
        </div>
        <div className="flex flex-col gap-5">
          <h2 className="text-2xl font-black">Total offers: {totalCount}</h2>
          <div className="shadow-lg rounded-lg">
            <div className="py-3 px-5 bg-gray-50">Count of offers per day</div>
            <Line
              className="p-10"
              data={{
                labels: offers.map((offer) => offer.publishedAt.toDateString()),
                datasets: [
                  {
                    label: "Count",
                    borderColor: "#00C98D",
                    data: offers.map((offer) => offer._count._all || "N/A"),
                  },
                ],
              }}
            />
          </div>
        </div>
        <div className="shadow-lg rounded-lg">
          <div className="py-3 px-5 bg-gray-50">
            Average salary of offers per day
          </div>
          <Line
            className="p-10"
            data={{
              labels: offers.map((offer) => offer.publishedAt.toDateString()),
              datasets: [
                {
                  label: "Minimum salary",
                  borderColor: "#00FAAF",
                  spanGaps: true,
                  data: offers.map(({ _avg: { minimumSalary } }) =>
                    minimumSalary ? Math.round(minimumSalary) : "N/A"
                  ),
                },
                {
                  label: "Maximum salary",
                  borderColor: "#00C98D",
                  spanGaps: true,
                  data: offers.map(({ _avg: { maximumSalary } }) =>
                    maximumSalary ? Math.round(maximumSalary) : "N/A"
                  ),
                },
              ],
            }}
          />
        </div>
      </div>
    </div>
  </div>
);

export const getServerSideProps = async () => {
  const prisma = new PrismaClient();
  const offers = await prisma.offer.groupBy({
    by: ["publishedAt"],
    _avg: {
      maximumSalary: true,
      minimumSalary: true,
    },
    _count: {
      _all: true,
    },
  });
  const totalCount = offers.reduce((acc, curr) => acc + curr._count._all, 0);

  return {
    props: {
      totalCount,
      offers,
    },
  };
};

export default Home;
