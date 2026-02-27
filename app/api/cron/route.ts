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
    description: string;
    candidateProfile: number;
    publishedAt: string;
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
    location: {
      label: string;
      shortLabel: string;
      adminLevel1: string | null;
      adminLevel2: string | null;
      country: string | null;
      countryCode: string | null;
      latitude: string | null;
      longitude: string | null;
    } | null;
    remoteMode: string | null;
    skills: { name: string; slug: string }[];
    experienceLevel: string | null;
    durationValue: number | null;
    durationPeriod: string | null;
    renewable: boolean | null;
    startsAt: string | null;
    applicationsCount: number | null;
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
      locationLabel: job.location?.label ?? null,
      locationCity: job.location?.adminLevel2 ?? null,
      locationRegion: job.location?.adminLevel1 ?? null,
      locationCountry: job.location?.country ?? null,
      locationCountryCode: job.location?.countryCode ?? null,
      locationLatitude: job.location?.latitude ?? null,
      locationLongitude: job.location?.longitude ?? null,
      remoteMode: job.remoteMode ?? null,
      skills: job.skills?.map((s) => s.name) ?? [],
      experienceLevel: job.experienceLevel ?? null,
      duration: job.durationValue ?? null,
      durationPeriod: job.durationPeriod ?? null,
      renewable: job.renewable ?? null,
      startsAt: job.startsAt ?? null,
      applicationsCount: job.applicationsCount ?? null,
    })),
  });

  console.info("Created", count, "offers");

  return NextResponse.json({ count });
}
