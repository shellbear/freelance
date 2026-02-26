import type { Metadata } from "next";
import { JetBrains_Mono } from "next/font/google";
import "@/styles/terminal.css";

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-terminal",
});

export const metadata: Metadata = {
  title: "Freelance Terminal — Bloomberg-style Market Intelligence",
  description:
    "Bloomberg Terminal-style view of French tech freelance market data: TJM rates, trends, and offers.",
};

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${jetbrainsMono.className} h-screen overflow-hidden`}
      style={{
        background: "var(--term-bg, #0a0a0a)",
        color: "var(--term-white, #ffffff)",
      }}
    >
      {children}
    </div>
  );
}
