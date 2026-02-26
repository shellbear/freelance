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

interface CompanyData {
  company: string;
  count: number;
  avgMinRate: number;
  avgMaxRate: number;
}

interface CompaniesTableProps {
  data: CompanyData[] | null;
  isLoading: boolean;
}

export function CompaniesTable({ data, isLoading }: CompaniesTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Companies</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading || !data ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Offers</TableHead>
                <TableHead className="text-right">Avg Min Rate</TableHead>
                <TableHead className="text-right">Avg Max Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((company) => (
                <TableRow key={company.company}>
                  <TableCell className="font-medium">
                    {company.company}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{company.count}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {company.avgMinRate > 0 ? `${company.avgMinRate}€` : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    {company.avgMaxRate > 0 ? `${company.avgMaxRate}€` : "N/A"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
