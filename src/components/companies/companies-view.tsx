"use client";

import AddCompanyForm from "./add-company-form";
import CompaniesTable from "./companies-table";
import ScrapeButton from "@/components/scraping/scrape-button";
import ScrapeRunPanel from "@/components/scraping/scrape-run-panel";
import { useGetCompanies } from "@/hooks/companies/useGetCompanies";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";

export default function CompaniesView() {
  const { data: companies, isLoading } = useGetCompanies();
  const scrapeJobs = useScrapeJobs();

  const resolvedCount = companies?.filter((company) => company.atsProvider).length ?? 0;
  const hasBoardsToPoll = resolvedCount > 0;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Companies</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Target companies whose job boards we poll directly.
            {!isLoading && hasBoardsToPoll && ` ${resolvedCount} ready to scrape.`}
          </p>
        </div>
        <ScrapeButton
          scrape={scrapeJobs}
          label="Scrape now"
          // The button was simply disabled with nothing to explain it, which
          // looks like a broken page rather than a missing prerequisite.
          disabledReason={
            isLoading || hasBoardsToPoll
              ? undefined
              : "No company job board has been detected yet — add a company, or re-detect one below"
          }
        />
      </div>

      <ScrapeRunPanel isStarting={scrapeJobs.isPending} />

      <AddCompanyForm />
      <CompaniesTable />
    </div>
  );
}
