"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface OfferData {
  publishedAt: string;
  _count: { _all: number };
  _avg: { minimumSalary: number | null; maximumSalary: number | null };
}

interface OfferVolumeChartProps {
  data: OfferData[] | null;
  isLoading: boolean;
}

export function OfferVolumeChart({ data, isLoading }: OfferVolumeChartProps) {
  const chartData = data?.map((d) => ({
    date: new Date(d.publishedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    count: d._count._all,
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Offer Volume Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !chartData ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                fill="#10b981"
                fillOpacity={0.15}
                strokeWidth={2}
                name="Offers"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
