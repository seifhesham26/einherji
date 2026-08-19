import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/lib/env";

/**
 * Optional work queue.
 *
 * Without it the daily run does every account inside one HTTP request, sharing a
 * single platform timeout — fine for one account, broken for ten. With it the
 * cron only fans out, and each account gets its own invocation and its own full
 * budget. QStash also retries a failed delivery, which the inline path can't.
 *
 * Everything here is optional so the app runs unchanged for anyone without an
 * Upstash account.
 */

export const qstash = env.QSTASH_TOKEN ? new Client({ token: env.QSTASH_TOKEN }) : null;

export function isQueueConfigured(): boolean {
  return qstash !== null;
}

/**
 * Verifies a callback really came from QStash.
 *
 * Two keys because Upstash rotates them: the current one and the next one are
 * both valid during a rotation window, and checking only one would drop work.
 */
export const qstashReceiver =
  env.QSTASH_CURRENT_SIGNING_KEY && env.QSTASH_NEXT_SIGNING_KEY
    ? new Receiver({
        currentSigningKey: env.QSTASH_CURRENT_SIGNING_KEY,
        nextSigningKey: env.QSTASH_NEXT_SIGNING_KEY,
      })
    : null;

export function queueCallbackUrl(path: string): string {
  return new URL(path, env.NEXT_PUBLIC_APP_URL).toString();
}
