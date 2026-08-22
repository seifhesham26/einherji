"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useCancelScrape } from "@/hooks/scraping/useCancelScrape";
import { useGetLatestScrapeRun } from "@/hooks/scraping/useGetLatestScrapeRun";
import { formatRelativeDate } from "@/utils/format-relative-date";

// What the server gives a run before it kills it. Shown so the countdown to the
// cutoff is visible rather than arriving as a surprise at the end.
const RUN_BUDGET_SECONDS = 60;

interface ScrapeRunPanelProps {
  /** True between clicking Scrape and the run row existing to poll. */
  isStarting: boolean;
}

/**
 * What the scrape is actually doing, while it does it.
 *
 * A run holds the request open for up to a minute, and until now the only
 * feedback was a spinning button — indistinguishable from a hung tab. The run
 * row is written task by task and there is a cancel endpoint; both were built
 * and neither was ever shown. This is the whole of that: progress per source,
 * jobs as they land, and a way out.
 *
 * When nothing is running it collapses to one line about the last run, which is
 * the only thing that survives a page reload — the completion toast does not.
 */
export default function ScrapeRunPanel({ isStarting }: ScrapeRunPanelProps) {
  const { data: run } = useGetLatestScrapeRun();
  const cancelScrape = useCancelScrape();

  const isRunning = run?.status === "running";
  const elapsedSeconds = useElapsedSeconds(isRunning ? run?.startedAt : null);

  if (isStarting && !isRunning) {
    return (
      <PanelFrame>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin shrink-0" />
          Starting the scrape…
        </div>
      </PanelFrame>
    );
  }

  if (isRunning) {
    // tasksTotal is fixed when the run is created, so this can't jump around.
    const percentComplete =
      run.tasksTotal > 0 ? Math.round((run.tasksCompleted / run.tasksTotal) * 100) : 0;
    const secondsLeft = Math.max(0, RUN_BUDGET_SECONDS - elapsedSeconds);

    return (
      <PanelFrame>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Loader2 className="h-4 w-4 animate-spin shrink-0 text-primary" />
            Scraping {run.sources.length} source{run.sources.length === 1 ? "" : "s"}
          </div>

          <Button
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={cancelScrape.isPending}
            onClick={() => cancelScrape.mutate({ runId: run.id })}
          >
            {cancelScrape.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <XCircle className="h-3.5 w-3.5" />
            )}
            Stop
          </Button>
        </div>

        <Progress
          value={percentComplete}
          className="h-1.5"
          aria-label={`Scrape progress: ${run.tasksCompleted} of ${run.tasksTotal} sources checked`}
        />

        <div
          className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground"
          // The bar is decoration for anyone not looking at it; this line is the
          // one a screen reader should hear updating.
          aria-live="polite"
        >
          <span className="tabular-nums">
            {run.tasksCompleted} of {run.tasksTotal} sources checked
          </span>
          <span aria-hidden>·</span>
          <span className="tabular-nums">
            {run.jobsFound} found, {run.jobsInserted} new
          </span>
          {secondsLeft > 0 && (
            <>
              <span aria-hidden>·</span>
              <span className="tabular-nums">{secondsLeft}s until the time limit</span>
            </>
          )}
        </div>
      </PanelFrame>
    );
  }

  if (!run || run.status === "queued") return null;

  return <LastRunSummary run={run} />;
}

function LastRunSummary({ run }: { run: NonNullable<ReturnType<typeof useGetLatestScrapeRun>["data"]> }) {
  const finishedAt = run.finishedAt ?? run.startedAt;

  const tone =
    run.status === "failed"
      ? { icon: XCircle, className: "text-destructive" }
      : run.errorMessage
        ? { icon: AlertTriangle, className: "text-amber-600 dark:text-amber-400" }
        : { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" };
  const ToneIcon = tone.icon;

  return (
    <div className="flex flex-wrap items-start gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <ToneIcon className={`h-3.5 w-3.5 shrink-0 mt-px ${tone.className}`} />
      <span>
        Last scrape {finishedAt ? formatRelativeDate(finishedAt) : "recently"}
        {run.status === "cancelled" && " — stopped"}
        {run.status === "failed" && " — failed"}
        {run.status === "completed" && ` — ${run.jobsInserted} new from ${run.jobsFound} found`}
      </span>
      {run.errorMessage && (
        <span className="w-full text-amber-600 dark:text-amber-400 sm:w-auto">
          {run.errorMessage}
        </span>
      )}
    </div>
  );
}

function PanelFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-2 rounded-xl border border-border bg-card p-3">{children}</div>
  );
}

/**
 * Seconds since a run started, ticking while it runs.
 *
 * Stores the current time rather than the elapsed count, and only ever writes it
 * from the interval callback. Computing the difference during render keeps the
 * effect free of a synchronous setState — which would schedule a second render
 * of this subtree on every mount — and means a changed `startedAt` is reflected
 * immediately instead of after the next tick.
 */
function useElapsedSeconds(startedAt: Date | null | undefined): number {
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    if (!startedAt) return;

    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [startedAt]);

  if (!startedAt || nowMs === null) return 0;

  // Clamped: `nowMs` is up to a second behind a freshly changed `startedAt`, and
  // the server's clock need not agree with the browser's to begin with.
  return Math.max(0, Math.floor((nowMs - new Date(startedAt).getTime()) / 1000));
}
