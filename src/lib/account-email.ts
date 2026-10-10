import { Resend } from "resend";
import { env } from "@/lib/env";

type AccountEmail = {
  kind: "verification" | "recovery";
  user: { name: string; email: string };
  url: string;
};

export function isAccountMailReady(): boolean {
  return process.env.NODE_ENV !== "production" || Boolean(
    env.RESEND_API_KEY?.trim() && env.RESEND_FROM_EMAIL?.trim() && !env.RESEND_FROM_EMAIL.includes("yourdomain.com"),
  );
}

function escapeHtml(text: string): string {
  const entities: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  return text.replace(/[&<>"']/g, (char) => entities[char]);
}

export async function sendAccountEmail({ kind, user, url }: AccountEmail): Promise<void> {
  if (!isAccountMailReady()) throw new Error("Account email delivery is not configured.");
  const link = new URL(url);
  if (!["http:", "https:"].includes(link.protocol) || link.origin !== new URL(env.BETTER_AUTH_URL).origin) {
    throw new Error("Invalid account email link.");
  }
  if (!env.RESEND_API_KEY?.trim()) {
    // Local development only; production never logs account tokens or email addresses.
    console.log(`[DEV] ${kind} email for ${user.email}: ${url}`);
    return;
  }
  const subject = kind === "recovery" ? "Reset your Einherji password" : "Verify your Einherji email";
  const action = kind === "recovery" ? "Reset password" : "Verify email";
  const response = await new Resend(env.RESEND_API_KEY.trim()).emails.send({
    from: env.RESEND_FROM_EMAIL ?? "Einherji <noreply@yourdomain.com>",
    to: user.email,
    subject,
    text: `${subject}\n\nHello ${user.name.replace(/[\r\n]/g, " ")},\n\n${url}\n\nIf you did not request this, ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>${action}</h2><p>Hello ${escapeHtml(user.name)},</p>
      <p><a href="${escapeHtml(url)}">${action}</a></p>
      <p>If you did not request this, ignore this email.</p></div>`,
  });
  if (response.error || !response.data?.id) throw new Error("Account email delivery failed.");
}
