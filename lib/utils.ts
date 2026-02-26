import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRate(value: number | null | undefined): string {
  if (value == null) return "N/A";
  return `${Math.round(value)}€`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("fr-FR").format(value);
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

export type Period = "7d" | "30d" | "90d" | "1y" | "all";

export function periodToDate(period: Period): Date | null {
  if (period === "all") return null;
  const now = new Date();
  switch (period) {
    case "7d":
      now.setDate(now.getDate() - 7);
      return now;
    case "30d":
      now.setDate(now.getDate() - 30);
      return now;
    case "90d":
      now.setDate(now.getDate() - 90);
      return now;
    case "1y":
      now.setFullYear(now.getFullYear() - 1);
      return now;
  }
}
