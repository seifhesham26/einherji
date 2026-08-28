"use client";

import { Loader2, ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetExtractionBacklog } from "@/hooks/job-insights/useGetExtractionBacklog";
import { useAnalyseBacklog } from "@/hooks/job-insights/useAnalyseBacklog";
import { MAX_EXTRACTION_BATCH } from "@/job-insights/job-insights.validators";

/**
 * The offer to read what hasn't been read.
 *
 * Only shown when there is a backlog, and it disappears when there isn't — a
 * permanent button for a job that is already done is noise on a page that has
 * enough.
 *
 * Deliberately a batch of ten rather than "analyse everything". Each posting is
 * a completion of several seconds, and the whole run happens inside the request
 * that started it — the same sixty-second ceiling the scrape lives under, and
 * the same eventual fix.
 */
export default function AnalyseBacklogButton({ bucketId }: { bucketId?: string }) {
  const { data: backlog } = useGetExtractionBacklog(bucketId);
  const analyseBacklog = useAnalyseBacklog();

  const remaining = backlog?.remaining ?? 0;
  if (remaining === 0) return null;

  const batchSize = Math.min(remaining, MAX_EXTRACTION_BATCH);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed p-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {remaining} posting{remaining === 1 ? "" : "s"} haven&apos;t been read
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          Reading one pulls out its real seniority, salary and remote policy — which is what
          makes those filters work at all.
        </p>
      </div>

      <Button
        size="sm"
        variant="outline"
        disabled={analyseBacklog.isPending}
        onClick={() => analyseBacklog.mutate({ bucketId, limit: batchSize })}
      >
        {analyseBacklog.isPending ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        ) : (
          <ScanText className="h-3.5 w-3.5" aria-hidden />
        )}
        Analyse {batchSize}
      </Button>
    </div>
  );
}
