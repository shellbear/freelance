import { Suspense } from "react";
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
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
          Freelance Market Intelligence
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Real-time analytics for French tech freelance offers from free-work.com
        </p>
      </div>

      {/* Dashboard Content */}
      <Suspense fallback={<DashboardSkeleton />}>
        <DashboardFilters />
      </Suspense>

      {/* Footer */}
      <footer className="mt-12 border-t border-border pt-6 text-center text-sm text-muted-foreground">
        <p>
          Data sourced from{" "}
          <a
            href="https://www.free-work.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-primary hover:underline"
          >
            free-work.com
          </a>{" "}
          — Updated daily at 8:00 AM UTC
        </p>
      </footer>
    </div>
  );
}
