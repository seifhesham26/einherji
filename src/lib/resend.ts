import { Resend } from "resend";
import { env } from "@/lib/env";

// Optional on purpose: without a key the app still runs and callers fall back to
// logging, which keeps local development working with no third-party account.
export const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export const FROM_EMAIL = env.RESEND_FROM_EMAIL ?? "AI Job Hunter <onboarding@resend.dev>";

export function isEmailConfigured(): boolean {
  return resend !== null;
}
