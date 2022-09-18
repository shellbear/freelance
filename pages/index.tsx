import { PrismaClient } from "@prisma/client";
import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { Line } from "react-chartjs-2";
import { defaults } from "chart.js";
import "chart.js/auto";
import { useState } from "react";

defaults.font = {
  ...defaults.font,
  family: "Satoshi",
  size: 16,
};

const Home: NextPage<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ totalCount, offers }) => {
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      return query.get("search") || "";
    } else {
      return "";
    }
  });

  return (
    <div className="container mx-auto h-screen">
      <div className="grid p-20">
        <div className="flex flex-col gap-20">
          <div className="text-center justify-center">
            <h1 className="text-5xl font-black">Freelance</h1>
            <h3 className="text-xl font-semibold">
              Some freelance stats fetched from free-work...
            </h3>
          </div>

          <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
            <svg
              aria-hidden="true"
              className="w-5 h-5 text-gray-500 dark:text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            name="search"
            className="block p-4 pl-10 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
            placeholder="Search Fullstack, Golang, Python, RSSI..."
            value={search}
            onChange={(evt) => setSearch(evt.target.value)}
          />
          <button
            type="submit"
            className="text-white absolute right-2.5 bottom-2.5 bg-blue-700 hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Search
          </button>

          <div className="flex flex-col gap-5">
            <h2 className="text-2xl font-black">Total offers: {totalCount}</h2>
            <div className="shadow-lg rounded-lg">
              <div className="py-3 px-5 bg-gray-50">
                Count of offers per day
              </div>
              <Line
                className="p-10"
                data={{
                  labels: offers.map((offer) =>
                    offer.publishedAt.toDateString()
                  ),
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
};

export const getServerSideProps = async ({
  query,
}: GetServerSidePropsContext) => {
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
    ...(query.search && {
      where: {
        OR: (query.search as string).split(" ").map((search) => ({
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

  const totalCount = offers.reduce((acc, curr) => acc + curr._count._all, 0);

  return {
    props: {
      totalCount,
      offers,
    },
  };
};

export default Home;
