"use client";

import { useState } from "react";
import { Loader2, Sparkles, Search, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import JobCard from "./job-card";
import { useGetJobs } from "@/hooks/jobs/useGetJobs";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";
import type { Job } from "@/types/job";

export default function JobsList() {
  const [search, setSearch] = useState("");
  const [unprocessedOnly, setUnprocessedOnly] = useState(false);

  const { data: jobs = [] as Job[], isLoading } = useGetJobs();
  const scrapeJobs = useScrapeJobs();

  const filtered = jobs.filter((job) => {
    const matchesSearch =
      !search ||
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = !unprocessedOnly || !job.isProcessed;
    return matchesSearch && matchesFilter;
  });

  const pendingCount = jobs.filter((j) => !j.isProcessed).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Scraped LinkedIn jobs matching your criteria.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => scrapeJobs.mutate()}
          disabled={scrapeJobs.isPending}
          className="gap-2 shrink-0"
        >
          {scrapeJobs.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {scrapeJobs.isPending ? "Scraping…" : "Scrape Jobs"}
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or company…"
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button
          variant={unprocessedOnly ? "default" : "outline"}
          size="sm"
          onClick={() => setUnprocessedOnly((v) => !v)}
          className="gap-2"
        >
          {pendingCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-xs rounded-full">
              {pendingCount}
            </Badge>
          )}
          Pending only
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground -mt-2">
        {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        {unprocessedOnly && " · pending only"}
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-52 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
          <div className="rounded-full bg-muted p-4">
            <Briefcase className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">No jobs found</p>
            {jobs.length === 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Click "Scrape Jobs" to pull matching jobs from LinkedIn.
              </p>
            )}
          </div>
        </div>
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
