import { Skeleton } from "@/components/ui/skeleton";

/**
 * Placeholder for a page that can't render until the URL is readable.
 *
 * Jobs, Leads and Tracker read their bucket filter from the query string, and
 * `useSearchParams` forces the subtree behind a Suspense boundary. This is what
 * that boundary shows — shaped like the page it stands in for, so the layout
 * doesn't jump when the real thing arrives.
 */
export default function PageSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-7 w-16 rounded-lg" />
        <Skeleton className="h-7 w-28 rounded-lg" />
        <Skeleton className="h-7 w-24 rounded-lg" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, index) => (
          <Skeleton key={index} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
