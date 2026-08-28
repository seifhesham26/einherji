"use client";

import { ExternalLink } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { formatRelativeDate } from "@/utils/format-relative-date";
import { isLikelyClosed } from "@/jobs/is-likely-closed";
import { getJobStatusDisplay } from "./job-status-display";
import { sourceLabel } from "./job-source-labels";
import type { Job } from "@/types/job";

interface JobsTableProps {
  jobs: Job[];
  selectedIds: Set<string>;
  onToggleSelected: (jobId: string, isSelected: boolean) => void;
  onSelectAll: (isSelected: boolean) => void;
  /** The keyboard cursor. Highlighted, not selected — they are different things. */
  cursorJobId: string | null;
  onOpenDetail: (jobId: string) => void;
}

/**
 * The dense view.
 *
 * Cards are for browsing — they carry an avatar, a description toggle and four
 * buttons, and they show nine jobs on a screen. A table shows thirty, which is
 * the difference between scanning a batch and paging through it. The actions
 * live on the keyboard and in the detail panel rather than in every row: a
 * triage surface that needs the mouse isn't dense, it's just small.
 */
export default function JobsTable({
  jobs,
  selectedIds,
  onToggleSelected,
  onSelectAll,
  cursorJobId,
  onOpenDetail,
}: JobsTableProps) {
  const allVisibleSelected = jobs.length > 0 && jobs.every((job) => selectedIds.has(job.id));

  return (
    // The table has a minimum width, so on a narrow screen this is what scrolls
    // rather than the page body.
    <div className="overflow-x-auto rounded-xl border">
      <Table className="min-w-[720px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-10">
              <Checkbox
                checked={allVisibleSelected}
                onCheckedChange={(checked) => onSelectAll(checked === true)}
                aria-label="Select every job on screen"
              />
            </TableHead>
            <TableHead className="w-14 text-right">Score</TableHead>
            <TableHead>Role</TableHead>
            <TableHead className="w-40">Location</TableHead>
            <TableHead className="w-28">Status</TableHead>
            <TableHead className="w-28">Posted</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>

        <TableBody>
          {jobs.map((job) => {
            const statusDisplay = getJobStatusDisplay(job.status);
            const isCursor = job.id === cursorJobId;
            const looksClosed = isLikelyClosed(job.lastSeenAt);

            return (
              <TableRow
                key={job.id}
                data-cursor={isCursor || undefined}
                data-job-id={job.id}
                onClick={() => onOpenDetail(job.id)}
                // The cursor is an inset ring rather than a border: a border
                // would change the row's height and shunt everything below it
                // down by a pixel on every j.
                className={`cursor-pointer data-cursor:bg-primary/5 data-cursor:ring-1 data-cursor:ring-inset data-cursor:ring-primary/40 ${
                  looksClosed ? "opacity-60" : ""
                }`}
              >
                <TableCell onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(job.id)}
                    onCheckedChange={(checked) => onToggleSelected(job.id, checked === true)}
                    aria-label={`Select ${job.title} at ${job.company}`}
                  />
                </TableCell>

                <TableCell className="text-right tabular-nums text-xs font-medium">
                  {job.score ?? "—"}
                </TableCell>

                <TableCell className="max-w-0">
                  <p className="truncate text-xs font-medium">{job.title}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {job.company} · {sourceLabel(job.source)}
                    {job.isRemote && " · Remote"}
                  </p>
                </TableCell>

                <TableCell className="truncate text-xs text-muted-foreground">
                  {job.location ?? "—"}
                </TableCell>

                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium ${statusDisplay.badge}`}
                  >
                    {statusDisplay.label}
                  </Badge>
                </TableCell>

                <TableCell className="text-xs text-muted-foreground">
                  {formatRelativeDate(job.postedAt)}
                </TableCell>

                <TableCell onClick={(event) => event.stopPropagation()}>
                  <a
                    href={job.jobUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open the ${job.title} posting at ${job.company} in a new tab`}
                    className="inline-flex rounded-sm p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                  </a>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
