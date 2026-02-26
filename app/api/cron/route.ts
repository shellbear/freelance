import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const FREE_WORK_API_BASE_URL = "https://www.free-work.com/api";

interface FreeWorkResponse {
  "hydra:totalItems": number;
  "hydra:member": {
    id: number;
    title: string;
    slug: string;
    minDailySalary: number | null;
    maxDailySalary: number | null;
    duration: number;
    applicationsCount: number;
    description: string;
    candidateProfile: number;
    publishedAt: string;
    experienceLevel: "intermediate" | "senior";
    oldUrl: string;
    company: {
      id: number;
      name: string;
      slug: string;
    };
    job: {
      id: number;
      name: string;
      slug: string;
    };
  }[];
}

const keywords = [
  "développeur",
  "developer",
  "dev",
  "devops",
  "backend",
  "frontend",
  "full-stack",
  "fullstack",
  "pentest",
  "rssi",
  "cybersécurité",
  "react",
  "nodejs",
  "go",
  "c",
  "c++",
  "rust",
  "typescript",
  "golang",
  "python",
  "flutter",
  "react native",
  "swift",
  "sql",
  "mobile",
  "cto",
  "lead dev",
  "javascript",
  "aws",
  "gcp",
  "azure",
  "architecte",
];

async function getFreeWorkJobs(count = 1000): Promise<FreeWorkResponse> {
  const url = new URL(FREE_WORK_API_BASE_URL + "/job_postings");
  url.searchParams.append("itemsPerPage", count.toString());
  url.searchParams.append("contracts", "contractor");
  url.searchParams.append("publishedSince", "less_than_24_hours");
  url.searchParams.append("searchKeywords", keywords.join(","));

  const res = await fetch(url.toString());
  return await res.json();
}

export async function GET() {
  const results = await getFreeWorkJobs();

  console.debug(
    "Found",
    results["hydra:member"].length,
    "/",
    results["hydra:totalItems"],
    "jobs"
  );

  const { count } = await prisma.offer.createMany({
    skipDuplicates: true,
    data: results["hydra:member"].map((job) => ({
      title: job.title,
      sourceId: job.id.toString(),
      description: job.description,
      minimumSalary: job.minDailySalary,
      maximumSalary: job.maxDailySalary,
      companyId: job.company.id.toString(),
      company: job.company.name,
      url: `https://www.free-work.com/fr/tech-it/${job.job.slug}/job-mission/${job.slug}`,
      publishedAt: job.publishedAt,
      source: "FREEWORK",
      job: job.job.name,
      jobId: job.job.id.toString(),
    })),
  });

  console.info("Created", count, "offers");

  return NextResponse.json({ count });
}
