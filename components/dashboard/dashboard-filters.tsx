"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/utils";
import { PeriodSelector } from "./period-selector";
import { SearchBar } from "./search-bar";
import { KpiCards } from "./kpi-cards";
import { OfferVolumeChart } from "./offer-volume-chart";
import { RateEvolutionChart } from "./rate-evolution-chart";
import { RateDistributionChart } from "./rate-distribution-chart";
import { TopTechnologiesChart } from "./top-technologies-chart";
import { CompaniesTable } from "./companies-table";
import { BestOffersTable } from "./best-offers-table";

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

interface StatsData {
  totalOffers: number;
  avgMinRate: number;
  avgMaxRate: number;
  medianMinRate: number;
  medianMaxRate: number;
  offersTrend: number;
  rateTrend: number;
  topTechnology: string;
  collectingSince: string | null;
}

interface OfferData {
  publishedAt: string;
  _count: { _all: number };
  _avg: { minimumSalary: number | null; maximumSalary: number | null };
}

interface BestOffersData {
  offers: {
    id: number;
    title: string;
    company: string;
    job: string | null;
    minimumSalary: number | null;
    maximumSalary: number | null;
    publishedAt: string;
    url: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TechnologyData {
  job: string;
  count: number;
  avgMinRate: number;
  avgMaxRate: number;
}

interface CompanyData {
  company: string;
  count: number;
  avgMinRate: number;
  avgMaxRate: number;
}

interface RateDistributionData {
  bucket: string;
  count: number;
}

export function DashboardFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [period, setPeriod] = useState<Period>(
    (searchParams.get("period") as Period) || "all"
  );
  const [, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const debouncedSearch = useDebounce(search);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [offers, setOffers] = useState<OfferData[] | null>(null);
  const [bestOffers, setBestOffers] = useState<BestOffersData | null>(null);
  const [technologies, setTechnologies] = useState<TechnologyData[] | null>(null);
  const [companies, setCompanies] = useState<CompanyData[] | null>(null);
  const [rateDistribution, setRateDistribution] = useState<RateDistributionData[] | null>(null);

  const fetchData = useCallback(
    async (s: string, p: Period, pg: number) => {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (p !== "all") params.set("period", p);
      const qs = params.toString();
      const base = qs ? `?${qs}` : "";

      try {
        const [statsRes, offersRes, bestRes, techRes, compRes, rateRes] =
          await Promise.all([
            fetch(`/api/stats${base}`).then((r) => r.json() as Promise<StatsData>),
            fetch(`/api/offers${base}`).then((r) => r.json() as Promise<OfferData[]>),
            fetch(`/api/best-offers${base}${base ? "&" : "?"}page=${pg}`).then(
              (r) => r.json() as Promise<BestOffersData>
            ),
            fetch(`/api/technologies${base}`).then((r) => r.json() as Promise<TechnologyData[]>),
            fetch(`/api/companies${base}`).then((r) => r.json() as Promise<CompanyData[]>),
            fetch(`/api/rate-distribution${base}`).then(
              (r) => r.json() as Promise<RateDistributionData[]>
            ),
          ]);

        setStats(statsRes);
        setOffers(offersRes);
        setBestOffers(bestRes);
        setTechnologies(techRes);
        setCompanies(compRes);
        setRateDistribution(rateRes);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (period !== "all") params.set("period", period);
    const qs = params.toString();
    router.replace(qs ? `/?${qs}` : "/", { scroll: false });
    setPage(1);
    fetchData(debouncedSearch, period, 1);
  }, [debouncedSearch, period, router, fetchData]);

  const handlePageChange = useCallback(
    (newPage: number) => {
      setPage(newPage);
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (period !== "all") params.set("period", period);
      const qs = params.toString();
      const base = qs ? `?${qs}` : "";
      fetch(`/api/best-offers${base}${base ? "&" : "?"}page=${newPage}`)
        .then((r) => r.json() as Promise<BestOffersData>)
        .then(setBestOffers);
    },
    [debouncedSearch, period]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PeriodSelector value={period} onChange={setPeriod} />
        <div className="w-full sm:w-80">
          <SearchBar value={search} onChange={setSearch} isLoading={isLoading} />
        </div>
      </div>

      <KpiCards data={stats} isLoading={isLoading} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <OfferVolumeChart data={offers} isLoading={isLoading} />
        <RateEvolutionChart data={offers} isLoading={isLoading} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RateDistributionChart data={rateDistribution} isLoading={isLoading} />
        <TopTechnologiesChart data={technologies} isLoading={isLoading} />
      </div>

      <CompaniesTable data={companies} isLoading={isLoading} />

      <BestOffersTable
        data={bestOffers}
        isLoading={isLoading}
        onPageChange={handlePageChange}
      />

      <footer className="mt-6 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        <p>
          Data sourced from{" "}
          <a
            href="https://www.free-work.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            free-work.com
          </a>
          {stats?.collectingSince && (
            <>
              {" "}
              — Collecting since{" "}
              {new Date(stats.collectingSince).toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}{" "}
              to present
            </>
          )}
          {" "}— Updated daily at 8:00 AM UTC
        </p>
      </footer>
    </div>
  );
}
