"use client";

import { cn } from "@/lib/utils";
import {
  OPEN_JOB_STATUSES,
  TERMINAL_JOB_STATUSES,
  type JobStatus,
} from "@/jobs/jobs.validators";
import { JOB_STATUS_DISPLAY } from "./job-status-display";

interface JobStatusFilterProps {
  selected: JobStatus | null;
  counts: Record<JobStatus, number> | undefined;
  onSelect: (status: JobStatus | null) => void;
}

/**
 * The pipeline, as a row of filters.
 *
 * Laid out in stage order rather than by size, so the row itself shows the shape
 * of the hunt — a big number under "New" and nothing under "Applied" is the
 * diagnosis, and no chart is needed to read it.
 *
 * Counts come from their own query and deliberately don't change when a filter
 * is applied: they are what tells you what clicking would do.
 */
export default function JobStatusFilter({ selected, counts, onSelect }: JobStatusFilterProps) {
  const openTotal = OPEN_JOB_STATUSES.reduce((total, status) => total + (counts?.[status] ?? 0), 0);

  return (
    <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter by status">
      <Chip
        label="All open"
        count={openTotal}
        isSelected={selected === null}
        onClick={() => onSelect(null)}
      />

      <span className="mx-1 h-4 w-px bg-border" aria-hidden />

      {OPEN_JOB_STATUSES.map((status) => (
        <Chip
          key={status}
          label={JOB_STATUS_DISPLAY[status].label}
          dot={JOB_STATUS_DISPLAY[status].dot}
          count={counts?.[status] ?? 0}
          isSelected={selected === status}
          onClick={() => onSelect(selected === status ? null : status)}
        />
      ))}

      <span className="mx-1 h-4 w-px bg-border" aria-hidden />

      {/* Closed states are reachable but not in the flow — they're where you go
          to check something, not where you work. */}
      {TERMINAL_JOB_STATUSES.map((status) => (
        <Chip
          key={status}
          label={JOB_STATUS_DISPLAY[status].label}
          dot={JOB_STATUS_DISPLAY[status].dot}
          count={counts?.[status] ?? 0}
          isSelected={selected === status}
          isMuted
          onClick={() => onSelect(selected === status ? null : status)}
        />
      ))}
    </div>
  );
}

interface ChipProps {
  label: string;
  count: number;
  isSelected: boolean;
  onClick: () => void;
  dot?: string;
  isMuted?: boolean;
}

function Chip({ label, count, isSelected, onClick, dot, isMuted }: ChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={isSelected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isSelected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card hover:bg-accent",
        // An empty stage stays clickable but stops competing for attention.
        !isSelected && (isMuted || count === 0) && "text-muted-foreground",
      )}
    >
      {dot && (
        <span
          className={cn("h-1.5 w-1.5 rounded-full", isSelected ? "bg-primary-foreground" : dot)}
          aria-hidden
        />
      )}
      {label}
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
