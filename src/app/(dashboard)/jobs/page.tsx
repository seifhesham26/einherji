import { Suspense } from "react";
import type { Metadata } from "next";
import JobsList from "@/components/jobs/jobs-list";
import PageSkeleton from "@/components/layout/page-skeleton";

export const metadata: Metadata = { title: "Jobs" };

// The view reads its bucket filter from the query string, which Next requires be
// wrapped in a Suspense boundary so the rest of the page can still prerender.
export default function JobsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={6} />}>
      <JobsList />
    </Suspense>
  );
}
