"use client";

import type { BestOffersData } from "@/lib/types";

interface TerminalOffersFeedProps {
  data: BestOffersData | null;
  onPageChange: (page: number) => void;
}

function formatTerminalDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate().toString().padStart(2, "0");
  const months = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
  ];
  return `${day}${months[d.getMonth()]}`;
}

export function TerminalOffersFeed({
  data,
  onPageChange,
}: TerminalOffersFeedProps) {
  return (
    <div className="terminal-panel flex h-full flex-col">
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ borderBottom: "1px solid var(--term-border)" }}
      >
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color: "var(--term-amber)" }}
        >
          BEST OFFERS FEED
        </span>
        {data && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(data.page - 1)}
              disabled={data.page <= 1}
              className="px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-30"
              style={{
                color: "var(--term-cyan)",
                border: "1px solid var(--term-border)",
              }}
            >
              PREV
            </button>
            <span
              className="text-[10px]"
              style={{ color: "var(--term-muted)" }}
            >
              {data.page}/{data.totalPages}
            </span>
            <button
              onClick={() => onPageChange(data.page + 1)}
              disabled={data.page >= data.totalPages}
              className="px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-30"
              style={{
                color: "var(--term-cyan)",
                border: "1px solid var(--term-border)",
              }}
            >
              NEXT
            </button>
          </div>
        )}
      </div>
      <div className="terminal-scroll flex-1 overflow-y-auto">
        <table className="w-full text-xs">
          <thead>
            <tr
              style={{
                borderBottom: "1px solid var(--term-border)",
                color: "var(--term-muted)",
              }}
            >
              <th className="px-2 py-1 text-left font-bold">TIME</th>
              <th className="px-2 py-1 text-left font-bold">TITLE</th>
              <th className="px-2 py-1 text-left font-bold">COMPANY</th>
              <th className="px-2 py-1 text-left font-bold">TECH</th>
              <th className="px-2 py-1 text-right font-bold">RATE</th>
            </tr>
          </thead>
          <tbody>
            {!data
              ? Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={5} className="px-2 py-1">
                      <div className="terminal-loading h-4 w-full" />
                    </td>
                  </tr>
                ))
              : data.offers.map((offer) => (
                  <tr
                    key={offer.id}
                    style={{
                      borderBottom: "1px solid var(--term-border)",
                    }}
                    className="transition-colors hover:bg-[#1a1a1a]"
                  >
                    <td
                      className="whitespace-nowrap px-2 py-1 font-bold"
                      style={{ color: "var(--term-muted)" }}
                    >
                      {formatTerminalDate(offer.publishedAt)}
                    </td>
                    <td
                      className="max-w-[300px] truncate px-2 py-1"
                      style={{ color: "var(--term-white)" }}
                    >
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        style={{ color: "var(--term-white)" }}
                      >
                        {offer.title}
                      </a>
                    </td>
                    <td
                      className="max-w-[150px] truncate px-2 py-1"
                      style={{ color: "var(--term-cyan)" }}
                    >
                      {offer.company}
                    </td>
                    <td
                      className="px-2 py-1"
                      style={{ color: "var(--term-muted)" }}
                    >
                      {offer.job || "—"}
                    </td>
                    <td
                      className="whitespace-nowrap px-2 py-1 text-right font-bold"
                      style={{ color: "var(--term-green)" }}
                    >
                      {offer.maximumSalary
                        ? `${offer.maximumSalary} EUR`
                        : "N/A"}
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
