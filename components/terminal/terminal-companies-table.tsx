"use client";

import type { CompanyData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

interface TerminalCompaniesTableProps {
  data: CompanyData[] | null;
}

export function TerminalCompaniesTable({ data }: TerminalCompaniesTableProps) {
  return (
    <div className="terminal-panel flex h-full flex-col">
      <div
        className="px-3 py-1.5"
        style={{ borderBottom: "1px solid var(--term-border)" }}
      >
        <span
          className="text-[10px] font-bold tracking-wider"
          style={{ color: "var(--term-amber)" }}
        >
          TOP COMPANIES
        </span>
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
              <th className="px-2 py-1 text-left font-bold">#</th>
              <th className="px-2 py-1 text-left font-bold">COMPANY</th>
              <th className="px-2 py-1 text-right font-bold">OFFERS</th>
              <th className="px-2 py-1 text-right font-bold">TJM</th>
            </tr>
          </thead>
          <tbody>
            {!data
              ? Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={4} className="px-2 py-1">
                      <div className="terminal-loading h-4 w-full" />
                    </td>
                  </tr>
                ))
              : data.map((company, i) => (
                  <tr
                    key={company.company}
                    style={{
                      borderBottom: "1px solid var(--term-border)",
                    }}
                    className="transition-colors hover:bg-[#1a1a1a]"
                  >
                    <td
                      className="px-2 py-1 font-bold"
                      style={{ color: "var(--term-muted)" }}
                    >
                      {i + 1}
                    </td>
                    <td
                      className="px-2 py-1 font-bold"
                      style={{ color: "var(--term-cyan)" }}
                    >
                      {company.company}
                    </td>
                    <td
                      className="px-2 py-1 text-right font-bold"
                      style={{ color: "var(--term-white)" }}
                    >
                      {formatNumber(company.count)}
                    </td>
                    <td
                      className="px-2 py-1 text-right font-bold"
                      style={{ color: "var(--term-green)" }}
                    >
                      {Math.round(company.avgMaxRate)}€
                    </td>
                  </tr>
                ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
