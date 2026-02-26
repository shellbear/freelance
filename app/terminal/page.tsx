import { Suspense } from "react";
import { TerminalDashboard } from "@/components/terminal/terminal-dashboard";

function TerminalSkeleton() {
  return (
    <div className="flex h-screen flex-col" style={{ background: "#0a0a0a" }}>
      <div
        className="h-10 w-full"
        style={{ background: "#111111", borderBottom: "1px solid #2a2a2a" }}
      />
      <div
        className="h-8 w-full"
        style={{ background: "#0a0a0a", borderBottom: "1px solid #2a2a2a" }}
      />
      <div className="flex-1 p-2">
        <div className="grid h-full grid-cols-12 gap-px">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className={`terminal-loading ${i < 3 ? "col-span-4" : "col-span-4"}`}
              style={{ background: "#111111" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function TerminalPage() {
  return (
    <Suspense fallback={<TerminalSkeleton />}>
      <TerminalDashboard />
    </Suspense>
  );
}
