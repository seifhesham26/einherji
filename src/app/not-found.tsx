import Link from "next/link";
import { Compass } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <Compass className="h-8 w-8 text-muted-foreground" />
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-semibold">There&apos;s nothing at this address</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The link may be out of date, or the page may have moved.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Link href="/dashboard" className={buttonVariants()}>
          Go to dashboard
        </Link>
        <Link href="/jobs" className={buttonVariants({ variant: "outline" })}>
          Browse jobs
        </Link>
      </div>
    </div>
  );
}
