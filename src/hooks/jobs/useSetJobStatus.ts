"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";
import { JOB_STATUS_LABELS } from "@/jobs/jobs.validators";

/**
 * Moves one or more jobs along the pipeline.
 *
 * Bulk by default — the same mutation backs a single card's button and the
 * selection bar's action, so there is one code path and one set of invalidations
 * rather than two that drift.
 */
export function useSetJobStatus() {
  const utils = trpc.useUtils();

  return trpc.jobs.setStatus.useMutation({
    onSuccess: ({ updatedCount, status }) => {
      utils.jobs.getAll.invalidate();
      utils.jobs.getStats.invalidate();
      utils.jobs.getStatusCounts.invalidate();
      utils.jobs.getEvents.invalidate();
      // The bucket bar counts jobs, and a status change moves rows in and out of
      // the default "still live" view it counts.
      utils.buckets.getAll.invalidate();

      // Nothing moved because everything selected was already there. Saying
      // "moved 0 jobs" reads as a failure; this is just a no-op worth naming.
      if (updatedCount === 0) {
        toast.info(`Already ${JOB_STATUS_LABELS[status].toLowerCase()}`);
        return;
      }

      toast.success(
        `${updatedCount} job${updatedCount === 1 ? "" : "s"} → ${JOB_STATUS_LABELS[status]}`,
      );
    },
    onError: (error) => toast.error(error.message),
  });
}
