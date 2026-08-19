import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { runDailyDigestForAll } from "@/digest/digest.service";

// Scraping several sources for several accounts needs longer than the default.
// Vercel caps this by plan (60s on Hobby, up to 300s on Pro); the service keeps
// its own deadline below the cap so it stops cleanly instead of being killed.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/**
 * The nightly run, triggered by Vercel Cron (see `vercel.json`).
 *
 * Deliberately fails closed. Without `CRON_SECRET` set this returns 503 rather
 * than running: an unauthenticated endpoint that scrapes on behalf of every
 * account is a way for anyone to burn everyone's quota and get the app's IP
 * blocked. Vercel sends the secret as a bearer token automatically.
 */
export async function GET(request: NextRequest) {
  const expectedSecret = env.CRON_SECRET;

  if (!expectedSecret) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured — refusing to run unauthenticated." },
      { status: 503 },
    );
  }

  if (request.headers.get("authorization") !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await runDailyDigestForAll(db);
    const failures = results.filter((result) => result.error);

    // Per-account failures don't fail the run, which means nobody would ever see
    // them — the response goes to Vercel's cron log and no further. This is the
    // silent-breakage case Sentry exists for.
    for (const failure of failures) {
      Sentry.captureMessage(`Daily digest failed for one account: ${failure.error}`, {
        level: "warning",
        tags: { job: "daily-digest" },
        extra: { userId: failure.userId },
      });
    }

    return NextResponse.json({
      ranAt: new Date().toISOString(),
      accounts: results.length,
      emailsSent: results.filter((result) => result.emailed).length,
      jobsFound: results.reduce((total, result) => total + result.jobsFound, 0),
      // Per-account errors don't fail the run — one broken account shouldn't stop
      // everyone else's digest — but they're reported so a silent breakage is visible.
      errors: failures.map((result) => ({ userId: result.userId, error: result.error })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Digest run failed";
    Sentry.captureException(error, { tags: { job: "daily-digest" } });
    console.error("[cron] daily digest failed:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
