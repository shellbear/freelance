"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface RateDistributionData {
  bucket: string;
  count: number;
}

interface RateDistributionChartProps {
  data: RateDistributionData[] | null;
  isLoading: boolean;
}

const CAP = 1500;

function clipDistribution(raw: RateDistributionData[]): RateDistributionData[] {
  let overflow = 0;
  const kept: RateDistributionData[] = [];

  for (const d of raw) {
    const start = parseInt(d.bucket, 10);
    if (isNaN(start) || start >= CAP) {
      overflow += d.count;
    } else {
      kept.push(d);
    }
  }

  if (overflow > 0) {
    kept.push({ bucket: `${CAP}+`, count: overflow });
  }

  return kept;
}

export function RateDistributionChart({
  data,
  isLoading,
}: RateDistributionChartProps) {
  const chartData = data ? clipDistribution(data) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Distribution (€/day)</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !chartData ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="bucket"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                  fontSize: "13px",
                }}
              />
              <Bar
                dataKey="count"
                fill="#10b981"
                radius={[4, 4, 0, 0]}
                name="Offers"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
