import { Suspense } from "react";
import type { Metadata } from "next";
import KanbanBoard from "@/components/tracker/kanban-board";
import PageSkeleton from "@/components/layout/page-skeleton";

export const metadata: Metadata = { title: "Tracker" };

// The view reads its bucket filter from the query string, which Next requires be
// wrapped in a Suspense boundary so the rest of the page can still prerender.
export default function TrackerPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={3} />}>
      <KanbanBoard />
    </Suspense>
  );
}
