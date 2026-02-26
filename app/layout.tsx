import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import "@/styles/globals.css";

const title = "Freelance Market Intelligence — TJM, tendances et offres freelance IT en France";
const description =
  "Suivez les TJM (taux journalier moyen), les tendances du marché et les technologies les plus demandées parmi des milliers d'offres freelance tech en France, collectées depuis 2022 via free-work.com.";
const url = "https://freelance.shellbear.me";

export const metadata: Metadata = {
  title,
  description,
  metadataBase: new URL(url),
  alternates: { canonical: "/" },
  keywords: [
    "freelance",
    "freelance informatique",
    "TJM",
    "taux journalier moyen",
    "tarif freelance",
    "salaire freelance",
    "offres freelance",
    "développeur freelance",
    "freelance France",
    "marché freelance tech",
    "tendances freelance",
    "free-work",
    "mission freelance",
    "consultant indépendant",
    "portage salarial",
  ],
  openGraph: {
    title,
    description,
    url,
    siteName: "Freelance Market Intelligence",
    type: "website",
    locale: "fr_FR",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Tableau de bord freelance — TJM, tendances et offres tech en France",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <head>
        <link
          href="https://api.fontshare.com/v2/css?f[]=satoshi@1,900,700,500,300,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
