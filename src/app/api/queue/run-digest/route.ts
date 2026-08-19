import { NextRequest, NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { qstashReceiver } from "@/lib/qstash";
import { runDigestForUserId } from "@/digest/digest.service";

// One account per invocation, so each gets the full platform budget instead of
// sharing one with everybody else.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const payloadSchema = z.object({ userId: z.string().min(1) });

/**
 * Runs one account's daily digest. Called by QStash, never by a person.
 *
 * Fails closed exactly like the cron endpoint: without signing keys this returns
 * 503 rather than accepting anonymous work. An open endpoint here would let
 * anyone burn any account's scrape quota.
 */
export async function POST(request: NextRequest) {
  if (!qstashReceiver) {
    return NextResponse.json(
      { error: "QStash signing keys are not configured — refusing to run unauthenticated." },
      { status: 503 },
    );
  }

  // The raw body is what was signed, so it has to be read as text and parsed
  // after verification rather than before.
  const body = await request.text();
  const signature = request.headers.get("upstash-signature") ?? "";

  const isValid = await qstashReceiver
    .verify({ signature, body })
    .catch(() => false);

  if (!isValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(JSON.parse(body || "{}"));
  if (!parsed.success) {
    // A malformed payload will never succeed, so 400 tells QStash to stop
    // retrying rather than redelivering it forever.
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  try {
    const result = await runDigestForUserId(db, parsed.data.userId);
    return NextResponse.json(result ?? { skipped: true });
  } catch (error) {
    Sentry.captureException(error, {
      tags: { job: "daily-digest", transport: "qstash" },
      extra: { userId: parsed.data.userId },
    });
    const message = error instanceof Error ? error.message : "Digest failed";
    // 500 lets QStash retry — a transient database or provider blip is worth
    // another attempt.
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
