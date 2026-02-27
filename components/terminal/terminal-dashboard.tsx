"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Period } from "@/lib/utils";
import type {
  StatsData,
  OfferData,
  BestOffersData,
  TechnologyData,
  CompanyData,
  RateDistributionData,
} from "@/lib/types";

import { TerminalHeader } from "./terminal-header";
import { TerminalTicker } from "./terminal-ticker";
import { TerminalKpiStrip } from "./terminal-kpi-strip";
import { TerminalPeriodSelector } from "./terminal-period-selector";
import { TerminalSearch } from "./terminal-search";
import { TerminalRateChart } from "./terminal-rate-chart";
import { TerminalVolumeChart } from "./terminal-volume-chart";
import { TerminalDistributionChart } from "./terminal-distribution-chart";
import { TerminalTechTable } from "./terminal-tech-table";
import { TerminalCompaniesTable } from "./terminal-companies-table";
import { TerminalOffersFeed } from "./terminal-offers-feed";
import { TerminalCommandLine } from "./terminal-command-line";

function useDebounce<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function TerminalDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [period, setPeriod] = useState<Period>(
    (searchParams.get("period") as Period) || "all"
  );
  const [, setPage] = useState(1);

  const debouncedSearch = useDebounce(search);

  const [stats, setStats] = useState<StatsData | null>(null);
  const [offers, setOffers] = useState<OfferData[] | null>(null);
  const [bestOffers, setBestOffers] = useState<BestOffersData | null>(null);
  const [technologies, setTechnologies] = useState<TechnologyData[] | null>(
    null
  );
  const [companies, setCompanies] = useState<CompanyData[] | null>(null);
  const [rateDistribution, setRateDistribution] = useState<
    RateDistributionData[] | null
  >(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const cmdInputRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(
    async (s: string, p: Period, pg: number) => {
      const params = new URLSearchParams();
      if (s) params.set("search", s);
      if (p !== "all") params.set("period", p);
      const qs = params.toString();
      const base = qs ? `?${qs}` : "";

      try {
        const [statsRes, offersRes, bestRes, techRes, compRes, rateRes] =
          await Promise.all([
            fetch(`/api/stats${base}`).then(
              (r) => r.json() as Promise<StatsData>
            ),
            fetch(`/api/offers${base}`).then(
              (r) => r.json() as Promise<OfferData[]>
            ),
            fetch(
              `/api/best-offers${base}${base ? "&" : "?"}page=${pg}`
            ).then((r) => r.json() as Promise<BestOffersData>),
            fetch(`/api/technologies${base}`).then(
              (r) => r.json() as Promise<TechnologyData[]>
            ),
            fetch(`/api/companies${base}`).then(
              (r) => r.json() as Promise<CompanyData[]>
            ),
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
      }
    },
    []
  );

  useEffect(() => {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (period !== "all") params.set("period", period);
    const qs = params.toString();
    router.replace(qs ? `/terminal?${qs}` : "/terminal", { scroll: false });
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

  // Keyboard shortcuts
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === "INPUT" || target.tagName === "TEXTAREA";

      if (e.key === "/" && !isInput) {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === "`" && !isInput) {
        e.preventDefault();
        cmdInputRef.current?.focus();
      } else if (!isInput && e.key >= "1" && e.key <= "5") {
        const periods: Period[] = ["7d", "30d", "90d", "1y", "all"];
        setPeriod(periods[parseInt(e.key) - 1]);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <>
      {/* Mobile fallback */}
      <div
        className="flex h-screen flex-col items-center justify-center p-8 text-center lg:hidden"
        style={{ background: "var(--term-bg)" }}
      >
        <p
          className="text-sm font-bold tracking-wider"
          style={{ color: "var(--term-amber)" }}
        >
          TERMINAL MODE REQUIRES MIN 1024PX VIEWPORT
        </p>
        <Link
          href="/"
          className="mt-4 px-3 py-1.5 text-xs font-bold tracking-wider"
          style={{
            color: "var(--term-cyan)",
            border: "1px solid var(--term-cyan)",
          }}
        >
          SWITCH TO STANDARD
        </Link>
      </div>

      {/* Desktop terminal */}
      <div className="hidden h-screen flex-col lg:flex">
        <TerminalHeader />

        <TerminalTicker stats={stats} technologies={technologies} />

        {/* Controls bar */}
        <div
          className="flex items-center justify-between px-4 py-1.5"
          style={{
            background: "var(--term-panel)",
            borderBottom: "1px solid var(--term-border)",
          }}
        >
          <TerminalPeriodSelector value={period} onChange={setPeriod} />
          <TerminalSearch
            value={search}
            onChange={setSearch}
            inputRef={searchInputRef}
          />
        </div>

        <TerminalKpiStrip
          stats={stats}
          technologies={technologies}
          totalOfferCount={stats?.totalOffers ?? 0}
        />

        {/* Main grid */}
        <div
          className="grid flex-1 grid-cols-12 overflow-hidden"
          style={{
            gap: "1px",
            background: "var(--term-border)",
            gridTemplateRows: "5fr 4fr 3fr",
          }}
        >
          {/* Row 1: Rate chart (8 cols) + Tech table (4 cols) */}
          <div className="col-span-8 min-h-0 overflow-hidden" style={{ background: "var(--term-bg)" }}>
            <TerminalRateChart data={offers} />
          </div>
          <div className="col-span-4 min-h-0 overflow-hidden" style={{ background: "var(--term-bg)" }}>
            <TerminalTechTable data={technologies} />
          </div>

          {/* Row 2: Volume chart (4 cols) + Distribution chart (4 cols) + Companies table (4 cols) */}
          <div className="col-span-4 min-h-0 overflow-hidden" style={{ background: "var(--term-bg)" }}>
            <TerminalVolumeChart data={offers} />
          </div>
          <div className="col-span-4 min-h-0 overflow-hidden" style={{ background: "var(--term-bg)" }}>
            <TerminalDistributionChart data={rateDistribution} />
          </div>
          <div className="col-span-4 min-h-0 overflow-hidden" style={{ background: "var(--term-bg)" }}>
            <TerminalCompaniesTable data={companies} />
          </div>

          {/* Row 3: Best offers feed (full width) */}
          <div className="col-span-12 min-h-0 overflow-hidden" style={{ background: "var(--term-bg)" }}>
            <TerminalOffersFeed
              data={bestOffers}
              onPageChange={handlePageChange}
            />
          </div>
        </div>

        {/* Command line */}
        <TerminalCommandLine
          onSearch={setSearch}
          onPeriod={setPeriod}
          onHome={() => router.push("/")}
          inputRef={cmdInputRef}
        />
      </div>
    </>
  );
}
