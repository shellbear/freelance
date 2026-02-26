export interface StatsData {
  totalOffers: number;
  avgMinRate: number;
  avgMaxRate: number;
  medianMinRate: number;
  medianMaxRate: number;
  offersTrend: number;
  rateTrend: number;
  topTechnology: string;
  collectingSince: string | null;
}

export interface OfferData {
  publishedAt: string;
  _count: { _all: number };
  _avg: { minimumSalary: number | null; maximumSalary: number | null };
}

export interface BestOffersData {
  offers: {
    id: number;
    title: string;
    company: string;
    job: string | null;
    minimumSalary: number | null;
    maximumSalary: number | null;
    publishedAt: string;
    url: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TechnologyData {
  job: string;
  count: number;
  avgMinRate: number;
  avgMaxRate: number;
}

export interface CompanyData {
  company: string;
  count: number;
  avgMinRate: number;
  avgMaxRate: number;
}

export interface RateDistributionData {
  bucket: string;
  count: number;
}
