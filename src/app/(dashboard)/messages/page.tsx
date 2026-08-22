import { Suspense } from "react";
import type { Metadata } from "next";
import MessagesView from "@/components/messages/messages-view";
import PageSkeleton from "@/components/layout/page-skeleton";

export const metadata: Metadata = { title: "Messages" };

// The view reads its active tab from the query string, which Next requires be
// wrapped in a Suspense boundary so the rest of the page can still prerender.
export default function MessagesPage() {
  return (
    <Suspense fallback={<PageSkeleton rows={2} />}>
      <MessagesView />
    </Suspense>
  );
}
