"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  Eraser,
  Keyboard,
  LayoutGrid,
  List,
  Loader2,
  Search,
  SearchX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ConfirmDialog from "@/components/ui/confirm-dialog";
import JobCard from "./job-card";
import JobsTable from "./jobs-table";
import JobsSelectionBar from "./jobs-selection-bar";
import JobStatusFilter from "./job-status-filter";
import JobFiltersBar, {
  countActiveFilters,
  usesExtractedFacts,
  type JobFilterValues,
} from "./job-filters-bar";
import AnalyseBacklogButton from "./analyse-backlog-button";
import JobDetailPanel from "./job-detail-panel";
import DismissReasonDialog from "./dismiss-reason-dialog";
import KeyboardShortcutsHelp from "./keyboard-shortcuts-help";
import SavedViewsBar from "./saved-views-bar";
import BucketBar from "@/components/buckets/bucket-bar";
import ScrapeButton from "@/components/scraping/scrape-button";
import ScrapeRunPanel from "@/components/scraping/scrape-run-panel";
import { useBucketFilter } from "@/hooks/buckets/useBucketFilter";
import { useGetJobs } from "@/hooks/jobs/useGetJobs";
import { useGetJobStatusCounts } from "@/hooks/jobs/useGetJobStatusCounts";
import { useSetJobStatus } from "@/hooks/jobs/useSetJobStatus";
import { useMoveJobsToBucket } from "@/hooks/jobs/useMoveJobsToBucket";
import { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";
import { useDeleteJobs } from "@/hooks/jobs/useDeleteJobs";
import { useClearJobs } from "@/hooks/jobs/useClearJobs";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { usePersistentState } from "@/hooks/usePersistentState";
import { useJobTriageKeyboard } from "@/hooks/jobs/useJobTriageKeyboard";
import {
  TERMINAL_JOB_STATUSES,
  jobSortValues,
  type JobDismissReason,
  type JobSort,
  type JobStatus,
} from "@/jobs/jobs.validators";
import type { SavedViewFilters } from "@/saved-views/saved-views.validators";

type ClearScope = "closed" | "everything";
type ViewMode = "cards" | "table";

/** What `x` is about to dismiss — one job from the list, or the whole selection. */
interface DismissTarget {
  jobIds: string[];
  label: string;
}

const SEARCH_DEBOUNCE_MS = 300;
const VIEW_MODE_STORAGE_KEY = "einherji:jobs-view-mode";

const DEFAULT_JOB_SORT: JobSort = "score";

const SORT_LABELS: Record<JobSort, string> = {
  score: "Best match",
  newest: "Newest first",
  oldest: "Oldest first",
};

function isViewMode(candidate: unknown): candidate is ViewMode {
  return candidate === "cards" || candidate === "table";
}

export default function JobsList() {
  const [search, setSearch] = useState("");
  // Null means "everything still live", which is what the server does with an
  // omitted status. One status at a time is enough here — the chips are a
  // pipeline, and picking two non-adjacent stages isn't a question people ask.
  const [statusFilter, setStatusFilter] = useState<JobStatus | null>(null);
  const [sort, setSort] = useState<JobSort>(DEFAULT_JOB_SORT);
  const [filters, setFilters] = useState<JobFilterValues>({});
  const [activeViewId, setActiveViewId] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Both halves matter. The id is what the cursor follows while the list churns
  // around it; the index is where to land when that row is gone.
  const [cursor, setCursor] = useState<{ id: string; index: number } | null>(null);
  const [detailJobId, setDetailJobId] = useState<string | null>(null);
  const [dismissTarget, setDismissTarget] = useState<DismissTarget | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [clearScope, setClearScope] = useState<ClearScope | null>(null);

  const [viewMode, setViewMode] = usePersistentState<ViewMode>(
    VIEW_MODE_STORAGE_KEY,
    "cards",
    isViewMode,
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const { bucketId, selectBucket } = useBucketFilter();

  // The search is a database query now, so it waits for a pause in typing
  // rather than firing a request per character.
  const debouncedSearch = useDebouncedValue(search.trim(), SEARCH_DEBOUNCE_MS);

  const { data, isLoading, isFetching, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGetJobs({
      bucketId: bucketId ?? undefined,
      statuses: statusFilter ? [statusFilter] : undefined,
      search: debouncedSearch || undefined,
      sort,
      ...filters,
    });

  const { data: statusCounts } = useGetJobStatusCounts(bucketId ?? undefined);

  const scrapeJobs = useScrapeJobs();
  const deleteJobs = useDeleteJobs();
  const clearJobs = useClearJobs();
  const setStatus = useSetJobStatus();
  const moveToBucket = useMoveJobsToBucket();

  // Every page fetched so far, flattened. The server has already filtered and
  // ordered them — nothing here re-sorts or re-filters, which is the whole point
  // of the change.
  const jobs = useMemo(() => data?.pages.flatMap((page) => page.jobs) ?? [], [data]);

  const closedCount = useMemo(
    () =>
      TERMINAL_JOB_STATUSES.reduce((total, status) => total + (statusCounts?.[status] ?? 0), 0),
    [statusCounts],
  );
  const totalCount = useMemo(
    () => Object.values(statusCounts ?? {}).reduce((total, value) => total + value, 0),
    [statusCounts],
  );

  const activeFilterCount = countActiveFilters(filters);
  const hasActiveFilters =
    Boolean(debouncedSearch) || statusFilter !== null || activeFilterCount > 0;
  // A non-default sort is worth saving as a view even on its own — "newest
  // first, everything" is a real way to work — but it isn't a *filter*, so it
  // doesn't belong in the "no jobs match these filters" reckoning above.
  const isWorthSaving = hasActiveFilters || sort !== DEFAULT_JOB_SORT;
  // "Nothing matched what you typed" and "there is nothing here" need different
  // answers — one wants the filters cleared, the other wants a scrape.
  const isFilteredEmpty = jobs.length === 0 && hasActiveFilters;

  // Selection follows what's on screen. A job hidden by a filter is one the user
  // can no longer see, so counting it as selected would make "Delete 12" remove
  // something they never looked at.
  const visibleSelectedIds = useMemo(
    () => jobs.filter((job) => selectedIds.has(job.id)).map((job) => job.id),
    [jobs, selectedIds],
  );

  // ── The keyboard cursor ────────────────────────────────────────────────────
  // Derived, never corrected after the fact. Triage constantly removes the row
  // under the cursor — dismissing one drops it out of the default view — so the
  // id is followed while it exists and the remembered index takes over the
  // moment it doesn't. Landing on whatever now occupies that position is what
  // makes `x` feel like a queue rather than a list that jumps.
  const matchedIndex = cursor ? jobs.findIndex((job) => job.id === cursor.id) : -1;
  const cursorIndex =
    matchedIndex >= 0 ? matchedIndex : Math.min(cursor?.index ?? 0, jobs.length - 1);
  const cursorJob = cursorIndex >= 0 ? (jobs[cursorIndex] ?? null) : null;
  const cursorJobId = cursorJob?.id ?? null;

  useEffect(() => {
    if (!cursorJobId) return;
    // Ids are cuid2 — lowercase alphanumeric — so they need no escaping in a
    // selector. "nearest" scrolls only when the row is actually off screen,
    // which keeps holding j from jumping the page around.
    document
      .querySelector(`[data-job-id="${cursorJobId}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursorJobId]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const placeCursor = useCallback(
    (index: number) => {
      const job = jobs[index];
      if (job) setCursor({ id: job.id, index });
    },
    [jobs],
  );

  const moveCursor = useCallback(
    (delta: number) => {
      if (jobs.length === 0) return;

      const nextIndex = Math.max(0, Math.min(cursorIndex + delta, jobs.length - 1));
      placeCursor(nextIndex);

      // Reaching the end while more exist loads the next page rather than
      // stopping — triage shouldn't have to notice that the list is paginated.
      if (delta > 0 && nextIndex === jobs.length - 1 && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [jobs, cursorIndex, placeCursor, hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  const moveCursorJobTo = useCallback(
    (status: JobStatus) => {
      if (!cursorJob) return;

      setStatus.mutate({ jobIds: [cursorJob.id], status });
      // Advance now, before the refetch. Shortlisting leaves the row in place,
      // so nothing would move the cursor on its own — and stopping on a job you
      // have already dealt with is how a queue stalls.
      placeCursor(cursorIndex + 1);
    },
    [cursorJob, cursorIndex, placeCursor, setStatus],
  );

  const requestDismiss = useCallback((jobIds: string[], label: string) => {
    setDismissTarget({ jobIds, label });
  }, []);

  function confirmDismiss(reason?: JobDismissReason) {
    if (!dismissTarget) return;

    setStatus.mutate(
      { jobIds: dismissTarget.jobIds, status: "dismissed", dismissReason: reason },
      {
        onSuccess: () => {
          setDismissTarget(null);
          // A bulk dismiss empties the selection; a single one leaves it alone,
          // because the user may still be building a batch around it.
          if (dismissTarget.jobIds.length > 1) setSelectedIds(new Set());
        },
      },
    );
  }

  const toggleCursorSelected = useCallback(() => {
    if (!cursorJob) return;
    const jobId = cursorJob.id;

    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(jobId)) next.delete(jobId);
      else next.add(jobId);
      return next;
    });
  }, [cursorJob]);

  const isDialogOpen = dismissTarget !== null || isHelpOpen || clearScope !== null;
  const isDetailOpen = detailJobId !== null;

  useJobTriageKeyboard({
    // The detail panel deliberately stays keyboard-driven — it is a reading
    // pane, and j/k should page through jobs while it's open. The modal dialogs
    // are different: they own the keyboard until answered.
    isEnabled: !isDialogOpen && jobs.length > 0,
    onMoveDown: () => moveCursor(1),
    onMoveUp: () => moveCursor(-1),
    onShortlist: () => moveCursorJobTo("shortlisted"),
    onMarkApplied: () => moveCursorJobTo("applied"),
    onDismiss: cursorJob
      ? () => requestDismiss([cursorJob.id], `${cursorJob.title} at ${cursorJob.company}`)
      : undefined,
    onOpenPosting: cursorJob
      ? () => window.open(cursorJob.jobUrl, "_blank", "noopener,noreferrer")
      : undefined,
    // Enter, Space and `/` are handed back to the browser while the panel is
    // open: they belong to whatever button or field has focus inside it, and
    // stealing them would break the dialog's own controls.
    onOpenDetail: isDetailOpen ? undefined : () => setDetailJobId(cursorJobId),
    onToggleSelected: isDetailOpen ? undefined : toggleCursorSelected,
    onFocusSearch: isDetailOpen ? undefined : () => searchInputRef.current?.focus(),
    onShowHelp: () => setIsHelpOpen(true),
    onEscape: () => {
      if (isDetailOpen) setDetailJobId(null);
      else if (selectedIds.size > 0) setSelectedIds(new Set());
    },
  });

  // ── Filters and views ──────────────────────────────────────────────────────

  /** What "save this view" would store: everything narrowing the list, bucket aside. */
  const currentFilters: SavedViewFilters = useMemo(() => {
    const saved: SavedViewFilters = { sort, ...filters };
    if (statusFilter) saved.statuses = [statusFilter];
    if (debouncedSearch) saved.search = debouncedSearch;
    return saved;
  }, [sort, filters, statusFilter, debouncedSearch]);

  function applySavedView(viewId: string | null, savedFilters: SavedViewFilters) {
    setActiveViewId(viewId);
    setStatusFilter(savedFilters.statuses?.[0] ?? null);
    setSort(savedFilters.sort ?? DEFAULT_JOB_SORT);
    setSearch(savedFilters.search ?? "");
    setFilters({
      isRemote: savedFilters.isRemote,
      minScore: savedFilters.minScore,
      postedWithinDays: savedFilters.postedWithinDays,
      workTypes: savedFilters.workTypes,
      seniorities: savedFilters.seniorities,
      remotePolicies: savedFilters.remotePolicies,
      minAnnualSalary: savedFilters.minAnnualSalary,
    });
    setSelectedIds(new Set());
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter(null);
    setFilters({});
    setActiveViewId(null);
  }

  // ── Selection ──────────────────────────────────────────────────────────────

  function toggleJobSelected(jobId: string, isSelected: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (isSelected) next.add(jobId);
      else next.delete(jobId);
      return next;
    });
  }

  function selectAllVisible(isSelected: boolean) {
    setSelectedIds(isSelected ? new Set(jobs.map((job) => job.id)) : new Set());
  }

  function deleteSelected() {
    if (visibleSelectedIds.length === 0) return;
    deleteJobs.mutate(
      { jobIds: visibleSelectedIds },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  }

  function moveSelectedTo(status: JobStatus) {
    if (visibleSelectedIds.length === 0) return;

    // Dismissing in bulk goes through the same reason prompt a single dismiss
    // does. One answer covering twelve jobs is more useful than none.
    if (status === "dismissed") {
      requestDismiss(visibleSelectedIds, `${visibleSelectedIds.length} jobs`);
      return;
    }

    setStatus.mutate(
      { jobIds: visibleSelectedIds, status },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  }

  function refileSelected(targetBucketId: string | null) {
    if (visibleSelectedIds.length === 0) return;
    moveToBucket.mutate(
      { jobIds: visibleSelectedIds, bucketId: targetBucketId },
      { onSuccess: () => setSelectedIds(new Set()) },
    );
  }

  function confirmClear() {
    if (!clearScope) return;
    clearJobs.mutate(
      { bucketId: bucketId ?? undefined, onlyClosed: clearScope === "closed" },
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
    <div className="space-y-5">
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

      <AnalyseBacklogButton bucketId={bucketId ?? undefined} />

      <SavedViewsBar
        activeViewId={activeViewId}
        onSelect={applySavedView}
        currentFilters={currentFilters}
        isWorthSaving={isWorthSaving}
      />

      <JobStatusFilter
        selected={statusFilter}
        counts={statusCounts}
        onSelect={(status) => {
          setStatusFilter(status);
          setActiveViewId(null);
        }}
      />

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none"
              aria-hidden
            />
            <Input
              ref={searchInputRef}
              type="search"
              aria-label="Search jobs by title or company"
              placeholder="Search by title or company…    /"
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
            <Select value={sort} onValueChange={(value) => setSort(value as JobSort)}>
              <SelectTrigger size="sm" className="w-[150px]" aria-label="Sort jobs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {jobSortValues.map((value) => (
                  <SelectItem key={value} value={value}>
                    {SORT_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Cards browse, the table triages. Remembered per browser, because
                which one you want is a working style, not a per-visit decision. */}
            <div className="flex rounded-lg border p-0.5">
              <ViewModeButton
                isActive={viewMode === "cards"}
                onClick={() => setViewMode("cards")}
                label="Card view"
                icon={<LayoutGrid className="h-3.5 w-3.5" aria-hidden />}
              />
              <ViewModeButton
                isActive={viewMode === "table"}
                onClick={() => setViewMode("table")}
                label="Dense list view"
                icon={<List className="h-3.5 w-3.5" aria-hidden />}
              />
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsHelpOpen(true)}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
            >
              <Keyboard className="h-3.5 w-3.5" aria-hidden />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1.5">
            <JobFiltersBar
              values={filters}
              onChange={(next) => {
                setFilters(next);
                // The view no longer describes what's on screen, so nothing should
                // be lit as though it does.
                setActiveViewId(null);
              }}
            />

            {/* Said out loud, because otherwise a seniority filter that returns
                four jobs out of six hundred reads as a broken filter rather than
                as six hundred postings nobody has read yet. */}
            {usesExtractedFacts(filters) && (
              <p className="text-[11px] text-muted-foreground">
                Seniority, arrangement and salary come from analysing a posting — unanalysed
                jobs can&apos;t match them.
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Two separate clears. "Tidy up what I've finished with" is a routine
                action; "start over" is not, and merging them would put the routine
                one behind a confirmation nobody reads. */}
            {closedCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setClearScope("closed")}
                disabled={clearJobs.isPending}
              >
                <Eraser className="h-3.5 w-3.5" aria-hidden />
                Clear closed
                <Badge
                  variant="secondary"
                  className="h-5 min-w-5 px-1 flex items-center justify-center text-xs rounded-full tabular-nums"
                >
                  {closedCount}
                </Badge>
              </Button>
            )}
            {totalCount > 0 && (
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
      </div>

      {visibleSelectedIds.length > 0 ? (
        <JobsSelectionBar
          selectedCount={visibleSelectedIds.length}
          visibleCount={jobs.length}
          onSelectAll={selectAllVisible}
          onClearSelection={() => setSelectedIds(new Set())}
          onDeleteSelected={deleteSelected}
          onSetStatus={moveSelectedTo}
          onMoveToBucket={refileSelected}
          isDeleting={deleteJobs.isPending}
          isMoving={setStatus.isPending}
          isRefiling={moveToBucket.isPending}
        />
      ) : (
        <p className="text-sm text-muted-foreground -mt-1" aria-live="polite">
          Showing {jobs.length} job{jobs.length !== 1 ? "s" : ""}
          {hasNextPage && " so far"}
          {debouncedSearch && ` · matching “${debouncedSearch}”`}
          {/* The search is debounced, so without this the list sits on stale
              results for a beat with nothing to say it's working. */}
          {isFetching && !isFetchingNextPage && " · updating…"}
        </p>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-72 rounded-xl" />
          ))}
        </div>
      ) : isFilteredEmpty ? (
        <EmptyState
          icon={<SearchX className="h-8 w-8 text-muted-foreground" />}
          title="No jobs match these filters"
          description="Nothing in this view matches your search, the status you picked, or the filters above."
          action={
            <Button size="sm" variant="outline" onClick={clearFilters}>
              Clear filters
            </Button>
          }
        />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<Briefcase className="h-8 w-8 text-muted-foreground" />}
          title={bucketId ? "Nothing in this bucket yet" : "No jobs yet"}
          description="Run a scrape to pull matching roles from your enabled sources."
          action={<ScrapeButton scrape={scrapeJobs} bucketId={bucketId} />}
        />
      ) : (
        <>
          {viewMode === "table" ? (
            <JobsTable
              jobs={jobs}
              selectedIds={selectedIds}
              onToggleSelected={toggleJobSelected}
              onSelectAll={selectAllVisible}
              cursorJobId={cursorJobId}
              onOpenDetail={(jobId) => {
                placeCursor(jobs.findIndex((entry) => entry.id === jobId));
                setDetailJobId(jobId);
              }}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  isSelected={selectedIds.has(job.id)}
                  isCursor={job.id === cursorJobId}
                  onSelectedChange={(isSelected) => toggleJobSelected(job.id, isSelected)}
                  onOpenDetail={() => {
                    placeCursor(jobs.indexOf(job));
                    setDetailJobId(job.id);
                  }}
                  onRequestDismiss={() =>
                    requestDismiss([job.id], `${job.title} at ${job.company}`)
                  }
                />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                )}
                Load more
              </Button>
            </div>
          )}
        </>
      )}

      <JobDetailPanel
        jobId={detailJobId}
        onOpenChange={(open) => !open && setDetailJobId(null)}
        onRequestDismiss={(jobId, label) => requestDismiss([jobId], label)}
      />

      <DismissReasonDialog
        open={dismissTarget !== null}
        onOpenChange={(open) => !open && setDismissTarget(null)}
        target={dismissTarget?.label ?? ""}
        onDismiss={confirmDismiss}
        isPending={setStatus.isPending}
      />

      <KeyboardShortcutsHelp open={isHelpOpen} onOpenChange={setIsHelpOpen} />

      <ConfirmDialog
        open={clearScope !== null}
        onOpenChange={(open) => !open && setClearScope(null)}
        title={clearScope === "closed" ? "Clear closed jobs?" : "Clear all jobs?"}
        description={
          clearScope === "closed" ? (
            <>
              This removes the {closedCount} dismissed, rejected and unanswered job
              {closedCount === 1 ? "" : "s"} in {clearTargetLabel}. Hiring managers you already
              found are kept — they live in Leads.
            </>
          ) : (
            <>
              This removes all {totalCount} job{totalCount === 1 ? "" : "s"} in {clearTargetLabel},
              including ones you have applied to and their history. Hiring managers you already
              found are kept in Leads, and a new scrape will pull the still-open roles back.
            </>
          )
        }
        confirmLabel={clearScope === "closed" ? `Clear ${closedCount}` : `Clear ${totalCount}`}
        // Only the irreversible one asks you to type. Guarding both would teach
        // the reflex that gets the dangerous one confirmed without reading.
        confirmPhrase={clearScope === "everything" ? "clear" : undefined}
        onConfirm={confirmClear}
        isPending={clearJobs.isPending}
      />
    </div>
  );
}

function ViewModeButton({
  isActive,
  onClick,
  label,
  icon,
}: {
  isActive: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isActive}
      aria-label={label}
      title={label}
      className={`rounded-md px-2 py-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
    </button>
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
