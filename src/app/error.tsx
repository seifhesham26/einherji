"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";
import * as Sentry from "@sentry/nextjs";
import { Button, buttonVariants } from "@/components/ui/button";

/**
 * What a crash looks like.
 *
 * Without this file Next renders its own bare error page, which in production
 * says "Application error: a client-side exception has occurred" and nothing
 * else — no way back, and no report. Sentry wraps the app but only sees what
 * reaches it, so the boundary reports too.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="rounded-full bg-destructive/10 p-4">
        <AlertTriangle className="h-8 w-8 text-destructive" />
      </div>

      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Something broke on this page</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The error has been reported. Trying again often works — the page may
          have been mid-request when it happened.
        </p>
        {/* The digest is the only handle on this specific crash in the logs. */}
        {error.digest && (
          <p className="pt-1 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button onClick={reset} className="gap-2">
          <RotateCw className="h-4 w-4" />
          Try again
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
