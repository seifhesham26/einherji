"use client";

import { useState } from "react";
import { Building2, ExternalLink, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

interface CompanyRow {
  id: string;
  name: string;
}

export default function CompaniesTable() {
  const { data: companies = [], isLoading } = useGetCompanies();
  const removeCompany = useRemoveCompany();
  const resolveAts = useResolveCompanyAts();

  const [pendingRemoval, setPendingRemoval] = useState<CompanyRow | null>(null);

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
    <>
      <div className="rounded-xl border border-border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Company</TableHead>
              <TableHead>Job board</TableHead>
              <TableHead>Last checked</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((company) => {
              const isResolving = resolveAts.isPending && resolveAts.variables?.id === company.id;
              const isRemoving =
                removeCompany.isPending && removeCompany.variables?.id === company.id;

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
                          <ExternalLink className="h-3 w-3" aria-hidden />
                          <span className="sr-only">(opens in a new tab)</span>
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
                      // "Not found" alone read as a dead end; the retry is the
                      // button in this row and nothing said so.
                      <div className="flex flex-col gap-0.5">
                        <Badge variant="outline" className="w-fit text-muted-foreground">
                          Not found
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          Nothing to scrape until this resolves
                        </span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-xs text-muted-foreground">
                    {company.lastCheckedAt ? formatRelativeDate(company.lastCheckedAt) : "—"}
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={
                          company.atsProvider
                            ? `Re-detect the job board for ${company.name}`
                            : `Find the job board for ${company.name}`
                        }
                        title={company.atsProvider ? "Re-detect job board" : "Find job board"}
                        disabled={isResolving}
                        onClick={() => resolveAts.mutate({ id: company.id })}
                      >
                        {isResolving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Remove ${company.name}`}
                        title={`Remove ${company.name}`}
                        disabled={isRemoving}
                        // Was a bare one-click delete sitting next to a refresh
                        // button of the same size and colour. Every other delete
                        // in the app asks first.
                        onClick={() => setPendingRemoval({ id: company.id, name: company.name })}
                      >
                        {isRemoving ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" aria-hidden />
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

      <Dialog
        open={pendingRemoval !== null}
        onOpenChange={(isOpen) => !isOpen && setPendingRemoval(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Remove &quot;{pendingRemoval?.name}&quot;?</DialogTitle>
            <DialogDescription>
              Its job board stops being polled. Jobs already found are kept, and you can add
              the company again at any time.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPendingRemoval(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={removeCompany.isPending}
              onClick={() => {
                if (pendingRemoval) removeCompany.mutate({ id: pendingRemoval.id });
                setPendingRemoval(null);
              }}
            >
              Remove company
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
