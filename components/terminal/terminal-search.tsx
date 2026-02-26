"use client";

import { useRef } from "react";

interface TerminalSearchProps {
  value: string;
  onChange: (value: string) => void;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}

export function TerminalSearch({ value, onChange, inputRef }: TerminalSearchProps) {
  const fallbackRef = useRef<HTMLInputElement>(null);
  const ref = inputRef || fallbackRef;

  return (
    <div className="flex items-center gap-2">
      <span
        className="text-xs font-bold tracking-wider"
        style={{ color: "var(--term-amber)" }}
      >
        FILTER:
      </span>
      <input
        ref={ref}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="SEARCH..."
        className="w-48 bg-transparent px-2 py-1 text-xs font-bold uppercase tracking-wider outline-none placeholder:opacity-30"
        style={{
          color: "var(--term-cyan)",
          border: `1px solid var(--term-border)`,
          caretColor: "var(--term-amber)",
        }}
      />
    </div>
  );
}
