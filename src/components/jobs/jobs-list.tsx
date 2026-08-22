"use client";

import { useMemo, useState } from "react";
import { Briefcase, CheckCheck, Eraser, Search, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import JobCard from "./job-card";
import JobsSelectionBar from "./jobs-selection-bar";
import BucketBar from "@/components/buckets/bucket-bar";
import ScrapeButton from "@/components/scraping/scrape-button";
import ScrapeRunPanel from "@/components/scraping/scrape-run-panel";
import { useBucketFilter } from "@/hooks/buckets/useBucketFilter";
import { useGetJobs } from "@/hooks/jobs/useGetJobs";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";
import { useDeleteJobs } from "@/hooks/jobs/useDeleteJobs";
import { useClearJobs } from "@/hooks/jobs/useClearJobs";
import type { Job } from "@/types/job";

type ClearScope = "processed" | "everything";

export default function JobsList() {
  const [search, setSearch] = useState("");
  const [unprocessedOnly, setUnprocessedOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [clearScope, setClearScope] = useState<ClearScope | null>(null);
  const { bucketId, selectBucket } = useBucketFilter();

  const { data: jobs = [] as Job[], isLoading } = useGetJobs({
    bucketId: bucketId ?? undefined,
  });
  const scrapeJobs = useScrapeJobs();
  const deleteJobs = useDeleteJobs();
  const clearJobs = useClearJobs();

  const normalizedSearch = search.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      jobs.filter((job) => {
        const matchesSearch =
          !normalizedSearch ||
          job.title.toLowerCase().includes(normalizedSearch) ||
          job.company.toLowerCase().includes(normalizedSearch);
        const matchesFilter = !unprocessedOnly || !job.isProcessed;
        return matchesSearch && matchesFilter;
      }),
    [jobs, normalizedSearch, unprocessedOnly],
  );

  const pendingCount = jobs.filter((job) => !job.isProcessed).length;
  const processedCount = jobs.length - pendingCount;
  // "Nothing matched what you typed" and "there is nothing here" need different
  // answers — one wants the filters cleared, the other wants a scrape.
  const isFilteredEmpty = jobs.length > 0 && filtered.length === 0;

  // Selection follows what's on screen. A job hidden by the search filter is one
  // the user can no longer see, so counting it as selected would make "Delete 12"
  // remove something they never looked at.
  const visibleSelectedIds = useMemo(
    () => filtered.filter((job) => selectedIds.has(job.id)).map((job) => job.id),
    [filtered, selectedIds],
  );

  function clearFilters() {
    setSearch("");
    setUnprocessedOnly(false);
  }

  function toggleJobSelected(jobId: string, isSelected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (isSelected) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }

  function selectAllVisible(isSelected: boolean) {
    setSelectedIds(isSelected ? new Set(filtered.map((job) => job.id)) : new Set());
  }

  function deleteSelected() {
    if (visibleSelectedIds.length === 0) return;
    deleteJobs.mutate(
      { jobIds: visibleSelectedIds },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  }

  function confirmClear() {
    if (!clearScope) return;
    clearJobs.mutate(
      {
        bucketId: bucketId ?? undefined,
        onlyProcessed: clearScope === "processed",
      },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setClearScope(null);
        },
      },
    );
  }

  const clearTargetLabel = bucketId ? "this bucket" : "every bucket";

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

        <div className="flex items-center gap-2">
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

          {/* Two separate clears. "Tidy up what I've dealt with" is a routine
              action; "start over" is not, and merging them would put the routine
              one behind a confirmation nobody reads. */}
          {processedCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearScope("processed")}
              disabled={clearJobs.isPending}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden />
              Clear done
              <Badge
                variant="secondary"
                className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full tabular-nums"
              >
                {processedCount}
              </Badge>
            </Button>
          )}
          {jobs.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setClearScope("everything")}
              disabled={clearJobs.isPending}
              className="text-destructive hover:text-destructive"
            >
              <Eraser className="h-3.5 w-3.5" aria-hidden />
              Clear all
            </Button>
          )}
        </div>
      </div>

      {visibleSelectedIds.length > 0 ? (
        <JobsSelectionBar
          selectedCount={visibleSelectedIds.length}
          visibleCount={filtered.length}
          onSelectAll={selectAllVisible}
          onClearSelection={() => setSelectedIds(new Set())}
          onDeleteSelected={deleteSelected}
          isDeleting={deleteJobs.isPending}
        />
      ) : (
        <p className="text-sm text-muted-foreground -mt-2" aria-live="polite">
          {filtered.length} job{filtered.length !== 1 ? "s" : ""}
          {unprocessedOnly && " · pending only"}
          {normalizedSearch && ` · matching “${search.trim()}”`}
        </p>
      )}

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
            <JobCard
              key={job.id}
              job={job}
              isSelected={selectedIds.has(job.id)}
              onSelectedChange={(isSelected) => toggleJobSelected(job.id, isSelected)}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={clearScope !== null}
        onOpenChange={(open) => !open && setClearScope(null)}
        title={clearScope === "processed" ? "Clear jobs marked done?" : "Clear all jobs?"}
        description={
          clearScope === "processed" ? (
            <>
              This removes the {processedCount} job{processedCount === 1 ? "" : "s"} already marked
              done in {clearTargetLabel}. Hiring managers you already found are kept — they live in
              Leads.
            </>
          ) : (
            <>
              This removes all {jobs.length} job{jobs.length === 1 ? "" : "s"} in {clearTargetLabel}
              , done and pending alike. Hiring managers you already found are kept in Leads, and a
              new scrape will pull the still-open roles back.
            </>
          )
        }
        confirmLabel={clearScope === "processed" ? `Clear ${processedCount}` : `Clear ${jobs.length}`}
        // Only the irreversible one asks you to type. Guarding both would teach
        // the reflex that gets the dangerous one confirmed without reading.
        confirmPhrase={clearScope === "everything" ? "clear" : undefined}
        onConfirm={confirmClear}
        isPending={clearJobs.isPending}
      />
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
