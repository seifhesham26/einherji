"use client";

import { trpc } from "@/lib/trpc-client";
import type { GetJobsInput } from "@/jobs/jobs.validators";

/** Everything the list can filter on, minus the paging the hook manages itself. */
export type JobFilters = Omit<GetJobsInput, "cursor" | "limit" | "sort"> &
  Partial<Pick<GetJobsInput, "sort" | "limit">>;

/**
 * One page of jobs at a time.
 *
 * Was a plain useQuery that fetched every job the account had and filtered the
 * result in the browser. That put the whole table — descriptions included — on
 * the wire on every render of the page, and made ordering by score impossible
 * because the ranking wasn't known until after the rows had already arrived.
 */
export function useGetJobs(filters: JobFilters = {}) {
  return trpc.jobs.getAll.useInfiniteQuery(
    { sort: "score", ...filters },
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      // The list is a working surface — refetching it under the user mid-triage
      // moves the row they were about to click.
      refetchOnWindowFocus: false,
    },
  );
}
