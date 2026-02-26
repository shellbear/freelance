"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";

interface Offer {
  id: number;
  title: string;
  company: string;
  job: string | null;
  minimumSalary: number | null;
  maximumSalary: number | null;
  publishedAt: string;
  url: string;
}

interface BestOffersData {
  offers: Offer[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface BestOffersTableProps {
  data: BestOffersData | null;
  isLoading: boolean;
  onPageChange: (page: number) => void;
}

export function BestOffersTable({
  data,
  isLoading,
  onPageChange,
}: BestOffersTableProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Best Offers</CardTitle>
        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} offers with rates
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Company
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Category
                  </TableHead>
                  <TableHead className="text-right">Rate (€/day)</TableHead>
                  <TableHead className="hidden md:table-cell text-right">
                    Published
                  </TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.offers.map((offer) => (
                  <TableRow key={offer.id}>
                    <TableCell>
                      <div className="font-medium">{offer.title}</div>
                      <div className="text-xs text-muted-foreground md:hidden">
                        {offer.company}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {offer.company}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {offer.job && (
                        <Badge variant="secondary">{offer.job}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="success">
                        {offer.minimumSalary} - {offer.maximumSalary}€
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-right text-sm text-muted-foreground">
                      {new Date(offer.publishedAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <a
                        href={offer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {data.totalPages > 1 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <button
                  onClick={() => onPageChange(data.page - 1)}
                  disabled={data.page <= 1}
                  className="rounded-md p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-muted-foreground">
                  Page {data.page} of {data.totalPages}
                </span>
                <button
                  onClick={() => onPageChange(data.page + 1)}
                  disabled={data.page >= data.totalPages}
                  className="rounded-md p-2 hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
