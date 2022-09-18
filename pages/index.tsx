import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
  NextPage,
} from "next";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { useEffect, useState } from "react";
import useSWR, { SWRConfig } from "swr";
import { getOffers, OffersResponse } from "./api/offers";
import { MagnifyingGlassIcon, ArrowPathIcon } from "@heroicons/react/24/solid";
import { useRouter } from "next/router";
import { BestOffersResponse } from "./api/best-offers";

const useDebounce = <T,>(value: T, delay = 300, hook?: () => void) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      hook?.();
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, hook]);

  return debouncedValue;
};

const Home = () => {
  const router = useRouter();
  const [search, setSearch] = useState(() => {
    if (typeof window !== "undefined") {
      const query = new URLSearchParams(window.location.search);
      return query.get("search") || "";
    } else {
      return "";
    }
  });
  const debouncedSearch = useDebounce(search, 300, () =>
    router.replace(search ? "/?search=" + search : "/", undefined, {
      shallow: true,
    })
  );

  const { data: bestOffers } = useSWR<BestOffersResponse>(
    `/api/best-offers?search=${debouncedSearch}`
  );

  const { data, isValidating } = useSWR<OffersResponse>(
    `/api/offers?search=${debouncedSearch}`
  );
  const totalCount =
    data?.reduce((acc, curr) => acc + curr._count._all, 0) || 0;

  return (
    <div className="container mx-auto mb-20 p-5 md:p-20">
      <div className="grid">
        <div className="flex flex-col gap-10 md:gap-20">
          <div className="text-center justify-center">
            <h1 className="text-5xl font-black">Freelance</h1>
            <h3 className="text-xl font-semibold">
              Some stats fetched from free-work...
            </h3>
          </div>

          <div className="relative">
            <div className="flex absolute inset-y-0 left-0 items-center pl-3 pointer-events-none">
              {isValidating ? (
                <ArrowPathIcon className="w-5 h-5 text-gray-500 dark:text-gray-400 animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              )}
            </div>
            <input
              name="search"
              className="block p-4 pl-10 w-full text-sm text-gray-900 bg-gray-50 rounded-lg border border-gray-300 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500"
              placeholder="Search Fullstack, Golang, Python, RSSI..."
              value={search}
              onChange={(evt) => setSearch(evt.target.value || "")}
            />
          </div>

          <div className="flex flex-col gap-5">
            <h2 className="text-2xl font-black">Total offers: {totalCount}</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="shadow-lg rounded-lg">
                <div className="py-3 px-5 bg-gray-50">
                  Count of newly created offers per day
                </div>
                <Line
                  className="p-2 md:p-10"
                  data={{
                    labels: data?.map((offer) =>
                      new Date(offer.publishedAt).toDateString()
                    ),
                    datasets: [
                      {
                        label: "Count",
                        borderColor: "#00C98D",
                        data: data?.map((offer) => offer._count._all || "N/A"),
                      },
                    ],
                  }}
                />
              </div>
              <div className="shadow-lg rounded-lg">
                <div className="py-3 px-5 bg-gray-50">
                  Average salary of newly created offers per day
                </div>
                <Line
                  className="p-2 md:p-10"
                  data={{
                    labels: data?.map((offer) =>
                      new Date(offer.publishedAt).toDateString()
                    ),
                    datasets: [
                      {
                        label: "Minimum salary",
                        borderColor: "#00FAAF",
                        spanGaps: true,
                        data: data?.map(({ _avg: { minimumSalary } }) =>
                          minimumSalary ? Math.round(minimumSalary) : "N/A"
                        ),
                      },
                      {
                        label: "Maximum salary",
                        borderColor: "#00C98D",
                        spanGaps: true,
                        data: data?.map(({ _avg: { maximumSalary } }) =>
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
      </div>

      {bestOffers && (
        <div className="container shadow-lg rounded-lg mx-auto mt-10">
          <ul className="flex flex-col">
            {bestOffers.map((offer) => (
              <a href={offer.url} key={offer.id}>
                <li className="flex justify-between items-center border-b border-grey-500 p-5">
                  <div>
                    <p className="font-semibold text-green-600">
                      {offer.title}
                    </p>
                    <p className="font-medium">{offer.job}</p>
                  </div>
                  <div className="text-end">
                    <span className="bg-green-100 text-green-800 text-xs font-semibold px-2.5 py-0.5 rounded dark:bg-green-200 dark:text-green-900">
                      {offer.minimumSalary} - {offer.maximumSalary}€
                    </span>
                    <p>{offer.company}</p>
                  </div>
                </li>
              </a>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const HomePage: NextPage<
  InferGetServerSidePropsType<typeof getServerSideProps>
> = ({ fallback }) => (
  <SWRConfig value={{ fallback }}>
    <Home />
  </SWRConfig>
);

export const getServerSideProps = async ({
  query,
}: GetServerSidePropsContext) => {
  const offers = await getOffers();

  return {
    props: {
      fallback: {
        [`/api/offers?search=${query.search}`]: offers,
      },
    },
  };
};

export default HomePage;
