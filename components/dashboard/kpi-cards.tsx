"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatRate, formatPercent } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Briefcase,
  BarChart3,
  Code,
  EuroIcon,
} from "lucide-react";

interface StatsData {
  totalOffers: number;
  avgMinRate: number;
  avgMaxRate: number;
  medianMinRate: number;
  medianMaxRate: number;
  offersTrend: number;
  rateTrend: number;
  topTechnology: string;
}

interface KpiCardsProps {
  data: StatsData | null;
  isLoading: boolean;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  const Icon = isPositive ? TrendingUp : TrendingDown;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        isPositive ? "text-emerald-600" : "text-red-500"
      }`}
    >
      <Icon className="h-3 w-3" />
      {formatPercent(value)}
    </span>
  );
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Total Offers</CardTitle>
          <Briefcase className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatNumber(data.totalOffers)}
          </div>
          <TrendBadge value={data.offersTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Average TJM</CardTitle>
          <EuroIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatRate(data.avgMinRate)} - {formatRate(data.avgMaxRate)}
          </div>
          <TrendBadge value={data.rateTrend} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Median TJM</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {formatRate(data.medianMinRate)} - {formatRate(data.medianMaxRate)}
          </div>
          <p className="text-xs text-muted-foreground">50th percentile</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Top Technology</CardTitle>
          <Code className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{data.topTechnology}</div>
          <p className="text-xs text-muted-foreground">Most in-demand</p>
        </CardContent>
      </Card>
    </div>
  );
}
