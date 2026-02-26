"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface OfferData {
  publishedAt: string;
  _count: { _all: number };
  _avg: { minimumSalary: number | null; maximumSalary: number | null };
}

interface RateEvolutionChartProps {
  data: OfferData[] | null;
  isLoading: boolean;
}

export function RateEvolutionChart({
  data,
  isLoading,
}: RateEvolutionChartProps) {
  const chartData = data?.map((d) => ({
    date: new Date(d.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    min: d._avg.minimumSalary ? Math.round(d._avg.minimumSalary) : null,
    max: d._avg.maximumSalary ? Math.round(d._avg.maximumSalary) : null,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Average Rate Evolution</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !chartData ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}€`}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                  fontSize: "13px",
                }}
                formatter={(value: number) => [`${value}€`, undefined]}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey="min"
                stroke="#06b6d4"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="Min Rate"
              />
              <Line
                type="monotone"
                dataKey="max"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                connectNulls
                name="Max Rate"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
