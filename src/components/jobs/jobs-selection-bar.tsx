"use client";

import { Check, Loader2, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { JOB_STATUS_LABELS, jobStatusValues, type JobStatus } from "@/jobs/jobs.validators";
import { useGetBuckets } from "@/hooks/buckets/useGetBuckets";

// Base UI Select needs a real string for every option, so "no bucket" gets a
// sentinel rather than the empty string it uses to mean "nothing chosen".
const UNFILED = "__unfiled__";

interface JobsSelectionBarProps {
  selectedCount: number;
  visibleCount: number;
  onSelectAll: (isSelected: boolean) => void;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
  onSetStatus: (status: JobStatus) => void;
  onMoveToBucket: (bucketId: string | null) => void;
  isDeleting: boolean;
  isMoving: boolean;
  isRefiling: boolean;
}

/**
 * The bar that appears once anything is selected.
 *
 * Sticky rather than inline: with a three-column grid the selection you made at
 * the bottom of the page would otherwise have its actions scrolled off the top.
 *
 * Delete used to be the only thing it could do, which made "I've dealt with
 * these" and "these are wrong for me" the same irreversible action. The two are
 * now separate: shortlist and dismiss move rows, delete removes them.
 */
export default function JobsSelectionBar({
  selectedCount,
  visibleCount,
  onSelectAll,
  onClearSelection,
  onDeleteSelected,
  onSetStatus,
  onMoveToBucket,
  isDeleting,
  isMoving,
  isRefiling,
}: JobsSelectionBarProps) {
  const { data: buckets } = useGetBuckets();
  const isAllSelected = visibleCount > 0 && selectedCount === visibleCount;
  const isBusy = isDeleting || isMoving || isRefiling;

  return (
    <div
      className="sticky top-2 z-20 flex flex-wrap items-center gap-3 rounded-xl bg-card/95 p-3 ring-1 ring-foreground/10 shadow-sm supports-backdrop-filter:backdrop-blur-sm"
      role="region"
      aria-label="Selected jobs"
    >
      <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
        <Checkbox
          checked={isAllSelected}
          // The tri-state matters: a plain unchecked box next to "3 selected"
          // reads as a bug.
          indeterminate={selectedCount > 0 && !isAllSelected}
          onCheckedChange={(checked) => onSelectAll(checked === true)}
          aria-label={isAllSelected ? "Deselect all jobs" : "Select all visible jobs"}
        />
        <span aria-live="polite">
          {selectedCount} selected
          <span className="text-muted-foreground font-normal"> of {visibleCount}</span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2 ml-auto">
        {/* The two decisions triage actually makes, as buttons. Everything else
            is a status change and lives in the menu beside them. */}
        <Button
          size="sm"
          onClick={() => onSetStatus("shortlisted")}
          disabled={isBusy}
        >
          {isMoving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3.5 w-3.5" aria-hidden />
          )}
          Shortlist
        </Button>

        <Button
          size="sm"
          variant="outline"
          onClick={() => onSetStatus("dismissed")}
          disabled={isBusy}
        >
          <X className="h-3.5 w-3.5" aria-hidden />
          Dismiss
        </Button>

        <Select
          // Never shows a current value: a multi-selection has no single status,
          // and displaying one would be a claim about rows it doesn't hold.
          value=""
          onValueChange={(status) => onSetStatus(status as JobStatus)}
          disabled={isBusy}
        >
          <SelectTrigger size="sm" className="w-[150px] text-xs" aria-label="Move selected jobs to a status">
            <SelectValue placeholder="Move to…" />
          </SelectTrigger>
          <SelectContent>
            {jobStatusValues.map((status) => (
              <SelectItem key={status} value={status} className="text-xs">
                {JOB_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Refiling a batch into another hunt. A scrape files a job by whichever
            search turned it up first, and that guess is wrong often enough that
            correcting it by hand, one job at a time, was the only option. */}
        <Select
          value=""
          onValueChange={(bucketId) => onMoveToBucket(bucketId === UNFILED ? null : bucketId)}
          disabled={isBusy}
        >
          <SelectTrigger
            size="sm"
            className="w-[150px] text-xs"
            aria-label="Move selected jobs to a bucket"
          >
            <SelectValue placeholder="File under…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNFILED} className="text-xs">
              No bucket
            </SelectItem>
            {buckets?.map((bucket) => (
              <SelectItem key={bucket.id} value={bucket.id} className="text-xs">
                {bucket.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button size="sm" variant="ghost" onClick={onClearSelection} disabled={isBusy}>
          <X className="h-3.5 w-3.5" aria-hidden />
          Clear
        </Button>

        <Button size="sm" variant="destructive" onClick={onDeleteSelected} disabled={isBusy}>
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="h-3.5 w-3.5" aria-hidden />
          )}
          Delete {selectedCount}
        </Button>
      </div>
    </div>
  );
}
