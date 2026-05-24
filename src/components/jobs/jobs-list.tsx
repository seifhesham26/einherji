"use client";

import { useState } from "react";
import { Loader2, RefreshCw, Search } from "lucide-react";
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

  return (
    <div className="space-y-4">
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
        <div className="flex gap-2">
          <Button
            variant={unprocessedOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setUnprocessedOnly((v) => !v)}
          >
            Unprocessed only
          </Button>
          <Button
            size="sm"
            onClick={() => scrapeJobs.mutate()}
            disabled={scrapeJobs.isPending}
          >
            {scrapeJobs.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Scrape New Jobs
          </Button>
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-muted-foreground">
        {filtered.length} job{filtered.length !== 1 ? "s" : ""}
        {unprocessedOnly && " · unprocessed only"}
      </p>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-lg" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-2">
          <p className="text-sm">No jobs found.</p>
          {jobs.length === 0 && (
            <p className="text-xs">Click "Scrape New Jobs" to get started.</p>
          )}
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
