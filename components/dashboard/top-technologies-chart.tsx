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

interface TechnologyData {
  job: string;
  count: number;
  avgMinRate: number;
  avgMaxRate: number;
}

interface TopTechnologiesChartProps {
  data: TechnologyData[] | null;
  isLoading: boolean;
}

export function TopTechnologiesChart({
  data,
  isLoading,
}: TopTechnologiesChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Technologies</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <Skeleton className="h-[300px] w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
              <XAxis
                type="number"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="job"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={140}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "8px",
                  border: "1px solid #e5e5e5",
                  fontSize: "13px",
                }}
                formatter={(value: number, name: string) => [
                  name === "Avg Max Rate" ? `${value}€` : value,
                  name,
                ]}
              />
              <Bar
                dataKey="count"
                fill="#10b981"
                radius={[0, 4, 4, 0]}
                name="Offers"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
