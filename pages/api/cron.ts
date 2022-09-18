import { PrismaClient } from "@prisma/client";
import type { NextApiHandler } from "next";

const prisma = new PrismaClient();

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

export const getFreeWorkJobs = async (
  count = 9999
): Promise<FreeWorkResponse> => {
  const url = new URL(FREE_WORK_API_BASE_URL + "/job_postings");
  url.searchParams.append("itemsPerPage", count.toString());
  url.searchParams.append("contracts", "contractor");
  //url.searchParams.append("page", "1");
  url.searchParams.append("publishedSince", "less_than_24_hours");
  url.searchParams.append(
    "searchKeywords",
    "développeur,devops,backend,frontend,full-stack"
  );

  const res = await fetch(url.toString());
  return await res.json();
};

const handler: NextApiHandler = async (req, res) => {
  const results = await getFreeWorkJobs(1000);

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
      url: job.oldUrl,
      publishedAt: job.publishedAt,
      source: "FREEWORK",
    })),
  });

  console.info("Created", count, "offers");

  res.status(200).json({ count });
};

export default handler;
