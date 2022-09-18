import type { NextApiHandler } from "next";

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
    description: number;
    candidateProfile: number;
    publishedAt: string;
    experienceLevel: "intermediate" | "senior";
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

export const getFreeWorkJobs = async (): Promise<FreeWorkResponse> => {
  const url = new URL(FREE_WORK_API_BASE_URL + "/job_postings");
  url.searchParams.append("itemsPerPage", "9999");
  url.searchParams.append("contracts", "contractor");
  url.searchParams.append("publishedSince", "less_than_24_hours");
  url.searchParams.append(
    "searchKeywords",
    "développeur,devops,backend,frontend,full-stack"
  );

  const res = await fetch(url.toString());
  return await res.json();
};

const handler: NextApiHandler<FreeWorkResponse> = async (req, res) => {
  const results = await getFreeWorkJobs();

  res.status(200).json(results);
};

export default handler;
