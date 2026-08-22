"use client";

import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetLatestScrapeRun } from "@/hooks/scraping/useGetLatestScrapeRun";
import type { useScrapeJobs } from "@/hooks/jobs/useScrapeJobs";

interface ScrapeButtonProps {
  /** Owned by the page, so it can also drive the progress panel. */
  scrape: ReturnType<typeof useScrapeJobs>;
  /** Run one bucket's search. Omitted or null runs the account-level criteria. */
  bucketId?: string | null;
  label?: string;
  /** A page-specific reason to refuse, e.g. no companies to poll yet. */
  disabledReason?: string;
}

/**
 * The one button that starts a scrape.
 *
 * Three pages had their own copy of this — same spinner, same wording, drifting
 * independently. It also knows something none of them did: the server allows one
 * run at a time and rejects a second with a CONFLICT. Reading the live run means
 * the button is simply unavailable while one is going, instead of inviting a
 * click that can only produce an error toast.
 */
export default function ScrapeButton({
  scrape,
  bucketId,
  label = "Scrape jobs",
  disabledReason,
}: ScrapeButtonProps) {
  const { data: latestRun } = useGetLatestScrapeRun();

  const isRunning = latestRun?.status === "running";
  const isBusy = scrape.isPending || isRunning;
  const title = disabledReason ?? (isRunning ? "A scrape is already running" : undefined);

  return (
    <Button
      size="sm"
      className="gap-2 shrink-0"
      disabled={isBusy || Boolean(disabledReason)}
      title={title}
      onClick={() => scrape.mutate(bucketId ? { bucketId } : {})}
    >
      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
      {isBusy ? "Scraping…" : label}
    </Button>
  );
}
