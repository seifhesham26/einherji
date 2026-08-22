import { Suspense } from "react";
import type { Metadata } from "next";
import LeadsTable from "@/components/leads/leads-table";
import PageSkeleton from "@/components/layout/page-skeleton";

export const metadata: Metadata = { title: "Leads" };

// The view reads its bucket filter from the query string, which Next requires be
// wrapped in a Suspense boundary so the rest of the page can still prerender.
export default function LeadsPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={5} />}>
      <LeadsTable />
    </Suspense>
  );
}
