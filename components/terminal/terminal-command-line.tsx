"use client";

import { useState, useRef, useEffect } from "react";
import type { Period } from "@/lib/utils";

interface TerminalCommandLineProps {
  onSearch: (query: string) => void;
  onPeriod: (period: Period) => void;
  onHome: () => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

const HELP_TEXT = [
  "AVAILABLE COMMANDS:",
  "  SEARCH <query>  — Filter by technology/keyword",
  "  PERIOD <7D|30D|90D|1Y|ALL> — Set time period",
  "  HOME            — Switch to standard dashboard",
  "  CLEAR           — Clear command history",
  "  HELP            — Show this help message",
];

const periodMap: Record<string, Period> = {
  "7D": "7d",
  "30D": "30d",
  "90D": "90d",
  "1Y": "1y",
  ALL: "all",
};

export function TerminalCommandLine({
  onSearch,
  onPeriod,
  onHome,
  inputRef,
}: TerminalCommandLineProps) {
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || fallbackRef;
  const outputRef = useRef<HTMLDivElement>(null);

  const [output, setOutput] = useState<string[]>([
    'FREELANCE TERMINAL v1.0 — Type "HELP" for commands',
  ]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  function execute(cmd: string) {
    const trimmed = cmd.trim().toUpperCase();
    const parts = trimmed.split(/\s+/);
    const command = parts[0];
    const arg = parts.slice(1).join(" ");

    const newOutput = [...output, `FREELANCE> ${cmd}`];

    switch (command) {
      case "SEARCH":
        if (arg) {
          onSearch(arg.toLowerCase());
          newOutput.push(`FILTER SET: "${arg}"`);
        } else {
          onSearch("");
          newOutput.push("FILTER CLEARED");
        }
        break;
      case "PERIOD":
        if (arg && periodMap[arg]) {
          onPeriod(periodMap[arg]);
          newOutput.push(`PERIOD SET: ${arg}`);
        } else {
          newOutput.push(`INVALID PERIOD. USE: ${Object.keys(periodMap).join(", ")}`);
        }
        break;
      case "HOME":
        newOutput.push("SWITCHING TO STANDARD MODE...");
        onHome();
        break;
      case "CLEAR":
        setOutput([]);
        setInput("");
        return;
      case "HELP":
        newOutput.push(...HELP_TEXT);
        break;
      default:
        if (trimmed) {
          newOutput.push(`UNKNOWN COMMAND: "${command}" — Type HELP for available commands`);
        }
    }

    setOutput(newOutput);
    setHistory((prev) => [cmd, ...prev]);
    setHistoryIndex(-1);
    setInput("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      execute(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        setInput(history[newIndex]);
      } else {
        setHistoryIndex(-1);
        setInput("");
      }
    }
  }

  return (
    <div
      className="flex flex-col"
      style={{
        background: "var(--term-bg)",
        borderTop: "1px solid var(--term-border)",
      }}
    >
      <div
        ref={outputRef}
        className="terminal-scroll max-h-24 overflow-y-auto px-3 py-1"
      >
        {output.map((line, i) => (
          <div
            key={i}
            className="text-[11px] leading-relaxed"
            style={{
              color: line.startsWith("FREELANCE>")
                ? "var(--term-amber)"
                : "var(--term-muted)",
            }}
          >
            {line}
          </div>
        ))}
      </div>
      <div
        className="flex items-center gap-2 px-3 py-1.5"
        style={{ borderTop: "1px solid var(--term-border)" }}
      >
        <span
          className="text-xs font-bold"
          style={{ color: "var(--term-amber)" }}
        >
          FREELANCE&gt;
        </span>
        <input
          ref={ref}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent text-xs font-bold uppercase tracking-wider outline-none"
          style={{
            color: "var(--term-white)",
            caretColor: "var(--term-amber)",
          }}
          spellCheck={false}
          autoComplete="off"
        />
        <span
          className="terminal-cursor text-xs font-bold"
          style={{ color: "var(--term-amber)" }}
        >
          _
        </span>
      </div>
    </div>
  );
}
