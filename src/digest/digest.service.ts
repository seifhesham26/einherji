import type { Database } from "@/lib/db";
import { env } from "@/lib/env";
import { FROM_EMAIL, isEmailConfigured, resend } from "@/lib/resend";
import { getActiveCriteria } from "@/criteria/criteria.db";
import { rankJobs } from "@/jobs/score-job";
import { startScrape } from "@/scraping/scraping.service";
import { getDigestSubscribers, getJobsSince, markDigestSent } from "./digest.db";
import { sendTelegramMessage } from "@/lib/telegram";
import {
  buildSubject,
  renderDigestHtml,
  renderDigestText,
  renderDigestTelegram,
  type DigestContent,
} from "./render-digest-email";

// Enough to act on over a coffee. A longer list gets skimmed and then ignored.
const TOP_JOBS_IN_DIGEST = 5;
// First run for an account has no previous digest to measure from.
const FIRST_RUN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
// The cron's own ceiling. Vercel kills the function at its platform limit, so
// this stops mid-user rather than being cut off mid-write.
const MAX_CRON_DURATION_MS = 4 * 60 * 1000;

export interface DigestRunResult {
  userId: string;
  jobsFound: number;
  emailed: boolean;
  error?: string;
}

/**
 * The nightly run: scrape, then tell the user what turned up.
 *
 * Scraping without the email is only half of it — the app can't be "on autopilot"
 * if you still have to open it to discover anything happened.
 */
export async function runDailyDigestForAll(db: Database): Promise<DigestRunResult[]> {
  const subscribers = await getDigestSubscribers(db);
  const results: DigestRunResult[] = [];
  const deadline = Date.now() + MAX_CRON_DURATION_MS;

  for (const subscriber of subscribers) {
    // Stop cleanly rather than being killed part-way through a user's run.
    if (Date.now() > deadline) break;

    results.push(await runDailyDigestForUser(db, subscriber));
  }

  return results;
}

export interface DigestSubscriber {
  userId: string;
  email: string;
  name: string;
  lastDigestSentAt: Date | null;
  digestChannels: string[];
  telegramBotToken: string | null;
  telegramChatId: string | null;
}

export async function runDailyDigestForUser(
  db: Database,
  subscriber: DigestSubscriber,
): Promise<DigestRunResult> {
  // lastDigestSentAt is written by the database, so this compares like with like.
  // The first-run fallback is only a lookback window, where small skew is harmless.
  const since = subscriber.lastDigestSentAt ?? new Date(Date.now() - FIRST_RUN_LOOKBACK_MS);

  try {
    // Uses the account's own sources, criteria and quota — the cron is just
    // pressing the button on their behalf, with the same guards.
    await startScrape(db, subscriber.userId, {});
  } catch (error) {
    // A skipped scrape is not a reason to skip the email: jobs found since the
    // last digest are still worth reporting. Quota exhaustion and "already
    // running" both land here and are both benign.
    const message = error instanceof Error ? error.message : "Scrape failed";
    const emailed = await sendDigestIfAnything(db, subscriber, since);
    return { userId: subscriber.userId, jobsFound: 0, emailed, error: message };
  }

  const newJobs = await getJobsSince(db, subscriber.userId, since);
  const emailed = await sendDigestIfAnything(db, subscriber, since);

  return { userId: subscriber.userId, jobsFound: newJobs.length, emailed };
}

async function sendDigestIfAnything(
  db: Database,
  subscriber: DigestSubscriber,
  since: Date,
): Promise<boolean> {
  const newJobs = await getJobsSince(db, subscriber.userId, since);

  // Nothing new is not worth an email — a daily message that says "nothing" is
  // how a digest gets filtered to spam. The window still advances so tomorrow
  // reports from today.
  if (newJobs.length === 0) {
    await markDigestSent(db, subscriber.userId);
    return false;
  }

  const criteria = await getActiveCriteria(db, subscriber.userId);
  const ranked = rankJobs(newJobs, {
    titles: criteria?.titles ?? [],
    locations: criteria?.locations ?? [],
  });

  const content: DigestContent = {
    name: subscriber.name.split(" ")[0] || subscriber.name,
    totalNewJobs: newJobs.length,
    topJobs: ranked.slice(0, TOP_JOBS_IN_DIGEST).map((job) => ({
      title: job.title,
      company: job.company,
      jobUrl: job.jobUrl,
      location: job.location,
      salary: job.salary,
      score: job.score,
      reasons: job.reasons,
    })),
    appUrl: env.NEXT_PUBLIC_APP_URL,
  };

  const delivered = await deliver(subscriber, content);

  // Only advanced once something actually went out, so a provider outage
  // re-reports tomorrow rather than silently swallowing a day's jobs.
  if (delivered) await markDigestSent(db, subscriber.userId);
  return delivered;
}

/**
 * Sends the digest on every channel the account selected.
 *
 * One channel failing doesn't stop the other — if Telegram is down you should
 * still get the email. Delivery counts as success if *any* channel worked.
 */
async function deliver(
  subscriber: DigestSubscriber,
  content: DigestContent,
): Promise<boolean> {
  const channels = subscriber.digestChannels ?? ["email"];
  let anyDelivered = false;

  if (channels.includes("email")) {
    if (isEmailConfigured()) {
      try {
        await resend!.emails.send({
          from: FROM_EMAIL,
          to: subscriber.email,
          subject: buildSubject(content),
          html: renderDigestHtml(content),
          text: renderDigestText(content),
        });
        anyDelivered = true;
      } catch (error) {
        console.error("[digest] email failed:", error);
      }
    } else {
      // Same fallback as email verification: without a key development still works.
      console.log(`[digest] ${subscriber.email}: ${buildSubject(content)}`);
    }
  }

  if (channels.includes("telegram") && subscriber.telegramBotToken && subscriber.telegramChatId) {
    try {
      await sendTelegramMessage(
        { botToken: subscriber.telegramBotToken, chatId: subscriber.telegramChatId },
        renderDigestTelegram(content),
      );
      anyDelivered = true;
    } catch (error) {
      console.error("[digest] telegram failed:", error);
    }
  }

  return anyDelivered;
}
