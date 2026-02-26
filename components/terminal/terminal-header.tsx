"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function TerminalHeader() {
  const [time, setTime] = useState("");
  const [date, setDate] = useState("");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
      setDate(
        now
          .toLocaleDateString("en-GB", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
          .toUpperCase()
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center justify-between px-4 py-2"
      style={{
        background: "var(--term-panel)",
        borderBottom: "1px solid var(--term-border)",
      }}
    >
      <div className="flex items-center gap-4">
        <span
          className="text-sm font-bold tracking-wider"
          style={{ color: "var(--term-amber)" }}
        >
          FREELANCE TERMINAL
        </span>
        <span className="text-xs" style={{ color: "var(--term-muted)" }}>
          {date}
        </span>
      </div>

      <div className="flex items-center gap-4">
        <span
          className="font-mono text-sm tabular-nums"
          style={{ color: "var(--term-green)" }}
        >
          {time}
        </span>
        <Link
          href="/"
          className="px-2 py-0.5 text-xs font-bold tracking-wider transition-colors hover:opacity-80"
          style={{
            color: "var(--term-cyan)",
            border: "1px solid var(--term-cyan)",
          }}
        >
          SWITCH TO STANDARD
        </Link>
      </div>
    </div>
  );
}
