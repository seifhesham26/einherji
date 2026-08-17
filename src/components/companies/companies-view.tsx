"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddCompanyForm from "./add-company-form";
import CompaniesTable from "./companies-table";
import { useGetCompanies } from "@/hooks/companies/useGetCompanies";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";

export default function CompaniesView() {
  const { data: companies = [] } = useGetCompanies();
  const scrapeJobs = useScrapeJobs();

  const resolvedCount = companies.filter((company) => company.atsProvider).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Target companies whose job boards we poll directly.
            {resolvedCount > 0 && ` ${resolvedCount} ready to scrape.`}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => scrapeJobs.mutate({})}
          disabled={scrapeJobs.isPending || resolvedCount === 0}
          className="gap-2 shrink-0"
        >
          {scrapeJobs.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {scrapeJobs.isPending ? "Scraping…" : "Scrape now"}
        </Button>
      </div>

      <AddCompanyForm />
      <CompaniesTable />
    </div>
  );
}
