import { Suspense } from "react";
import Link from "next/link";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { Skeleton } from "@/components/ui/skeleton";

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-4">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-10 w-80" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Skeleton className="h-[380px] w-full rounded-lg" />
        <Skeleton className="h-[380px] w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <Link
        href="/terminal"
        className="terminal-cta group fixed right-6 top-6 z-50 inline-flex items-center gap-2 rounded-lg bg-neutral-900 px-4 py-2.5 text-xs font-bold tracking-wider text-amber-500 shadow-lg shadow-amber-500/10 transition-all hover:scale-105 hover:shadow-xl hover:shadow-amber-500/20"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-500 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
        </span>
        SWITCH TO TERMINAL
      </Link>

      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Freelance Market Intelligence
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Track daily rates, market trends, and top technologies across thousands of French tech freelance offers since 2022
        </p>
      </div>

      {/* Dashboard Content + Footer */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardFilters />
      </Suspense>
    </div>
  );
}
