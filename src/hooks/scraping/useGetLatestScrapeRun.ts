"use client";

import { trpc } from "@/lib/trpc-client";

// Fast enough that the bar visibly moves as boards come back, slow enough that a
// full 60-second run costs about thirty small requests rather than hundreds.
const POLL_INTERVAL_MS = 2000;

/**
 * The account's most recent scrape, refreshed while one is in flight.
 *
 * A run executes inside the request that starts it and can take the full minute,
 * so the mutation alone tells you nothing until it's over. The run row is
 * updated task by task as it goes, which is the only thing that can answer "is
 * it stuck, or is it on board four of nine?".
 */
export function useGetLatestScrapeRun({ enabled = true }: { enabled?: boolean } = {}) {
  return trpc.scraping.getLatestRun.useQuery(undefined, {
    enabled,
    // Progress is worthless if it's twenty minutes old — this one query opts out
    // of the app-wide staleTime.
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data?.status === "running" ? POLL_INTERVAL_MS : false,
  });
}
