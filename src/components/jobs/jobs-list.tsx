"use client";

import { useState } from "react";
import { Briefcase, Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import JobCard from "./job-card";
import BucketBar from "@/components/buckets/bucket-bar";
import ScrapeButton from "@/components/scraping/scrape-button";
import ScrapeRunPanel from "@/components/scraping/scrape-run-panel";
import { useBucketFilter } from "@/hooks/buckets/useBucketFilter";
import { useGetJobs } from "@/hooks/jobs/useGetJobs";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";
import type { Job } from "@/types/job";

export default function JobsList() {
  const [search, setSearch] = useState("");
  const [unprocessedOnly, setUnprocessedOnly] = useState(false);
  const { bucketId, selectBucket } = useBucketFilter();

  const { data: jobs = [] as Job[], isLoading } = useGetJobs({
    bucketId: bucketId ?? undefined,
  });
  const scrapeJobs = useScrapeJobs();

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = jobs.filter((job) => {
    const matchesSearch =
      !normalizedSearch ||
      job.title.toLowerCase().includes(normalizedSearch) ||
      job.company.toLowerCase().includes(normalizedSearch);
    const matchesFilter = !unprocessedOnly || !job.isProcessed;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = jobs.filter((job) => !job.isProcessed).length;
  // "Nothing matched what you typed" and "there is nothing here" need different
  // answers — one wants the filters cleared, the other wants a scrape.
  const isFilteredEmpty = jobs.length > 0 && filtered.length === 0;

  function clearFilters() {
    setSearch("");
    setUnprocessedOnly(false);
  }

  return (
    <div className="space-y-6">
      {/* Page header first: the bucket bar used to sit above the title, so the
          page opened on a row of unlabelled buttons. */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {bucketId
              ? "Results for this bucket."
              : "Everything found across all your buckets."}
          </p>
        </div>
        <ScrapeButton scrape={scrapeJobs} bucketId={bucketId} />
      </div>

      <BucketBar selectedBucketId={bucketId} onSelect={selectBucket} countBy="jobs" />

      <ScrapeRunPanel isStarting={scrapeJobs.isPending} />

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
            aria-hidden
          />
          <Input
            type="search"
            aria-label="Search jobs by title or company"
            placeholder="Search by title or company…"
            className="pl-9 pr-9"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Button
          variant={unprocessedOnly ? "default" : "outline"}
          size="sm"
          // It's a toggle, not a command. Without this a screen reader gives no
          // hint that the filter is currently on.
          aria-pressed={unprocessedOnly}
          onClick={() => setUnprocessedOnly((isOn) => !isOn)}
          className="gap-2"
        >
          {pendingCount > 0 && (
            <Badge
              variant="secondary"
              className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full tabular-nums"
            >
              {pendingCount}
            </Badge>
          )}
          Pending only
        </Button>
      </div>

      <p className="text-sm text-muted-foreground -mt-2" aria-live="polite">
        {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        {unprocessedOnly && " · pending only"}
        {normalizedSearch && ` · matching “${search.trim()}”`}
      </p>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-60 rounded-xl" />
          ))}
        </div>
      ) : isFilteredEmpty ? (
        <EmptyState
          icon={<SearchX className="h-8 w-8 text-muted-foreground" />}
          title="No jobs match these filters"
          description={`${jobs.length} job${jobs.length === 1 ? "" : "s"} in this view are hidden by your search or the pending filter.`}
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8 text-muted-foreground" />}
          title={bucketId ? "Nothing in this bucket yet" : "No jobs yet"}
          description="Run a scrape to pull matching roles from your enabled sources."
          action={<ScrapeButton scrape={scrapeJobs} bucketId={bucketId} />}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
      <div className="rounded-full bg-muted p-4">{icon}</div>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{description}</p>
      </div>
      {action}
    </div>
  );
}
