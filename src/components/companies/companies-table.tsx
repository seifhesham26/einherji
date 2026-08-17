"use client";

import { Building2, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useGetCompanies } from "@/hooks/companies/useGetCompanies";
import { useRemoveCompany } from "@/hooks/companies/useRemoveCompany";
import { useResolveCompanyAts } from "@/hooks/companies/useResolveCompanyAts";
import { formatRelativeDate } from "@/utils/format-relative-date";

export default function CompaniesTable() {
  const { data: companies = [], isLoading } = useGetCompanies();
  const removeCompany = useRemoveCompany();
  const resolveAts = useResolveCompanyAts();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <div className="rounded-full bg-muted p-4">
          <Building2 className="h-8 w-8 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium">No target companies yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-sm">
            Add companies you want to work at. We poll their job board directly — it&apos;s
            faster and cleaner than scraping LinkedIn.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Company</TableHead>
            <TableHead>Job board</TableHead>
            <TableHead>Last checked</TableHead>
            <TableHead className="w-[100px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {companies.map((company) => {
            const isResolving = resolveAts.isPending && resolveAts.variables?.id === company.id;
            const isRemoving = removeCompany.isPending && removeCompany.variables?.id === company.id;

            return (
              <TableRow key={company.id}>
                <TableCell>
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{company.name}</span>
                    {company.careersUrl && (
                      <a
                        href={company.careersUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1 w-fit"
                      >
                        Careers page
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </TableCell>

                <TableCell>
                  {company.atsProvider ? (
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize">
                        {company.atsProvider}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">
                        {company.atsSlug}
                      </span>
                    </div>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">
                      Not found
                    </Badge>
                  )}
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  {company.lastCheckedAt ? formatRelativeDate(company.lastCheckedAt) : "—"}
                </TableCell>

                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      title={company.atsProvider ? "Re-detect job board" : "Find job board"}
                      disabled={isResolving}
                      onClick={() => resolveAts.mutate({ id: company.id })}
                    >
                      {isResolving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3.5 w-3.5" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={`Remove ${company.name}`}
                      disabled={isRemoving}
                      onClick={() => removeCompany.mutate({ id: company.id })}
                    >
                      {isRemoving ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
