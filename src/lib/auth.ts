import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { users, sessions, accounts, verifications } from "@/lib/db/schema";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM_EMAIL = env.RESEND_FROM_EMAIL ?? "AI Job Hunter <noreply@yourdomain.com>";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: users,
      session: sessions,
      account: accounts,
      verification: verifications,
    },
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
  emailAndPassword: {
    enabled: true,
    // Allow login before verification — users see a banner prompt instead of being blocked
    requireEmailVerification: false,
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      if (!resend) {
        // Dev fallback — paste this URL in the browser to verify
        console.log(`[DEV] Verify email for ${user.email}: ${url}`);
        return;
      }
      await resend.emails.send({
        from: FROM_EMAIL,
        to: user.email,
        subject: "Verify your AI Job Hunter email",
        html: `
          <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;background:#fff;">
            <h2 style="margin:0 0 8px;font-size:20px;font-weight:600;color:#111;">Verify your email</h2>
            <p style="margin:0 0 24px;color:#555;font-size:15px;">Hi ${user.name}, click the button below to activate your account.</p>
            <a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">Verify Email</a>
            <p style="margin:24px 0 0;color:#999;font-size:13px;">If you didn't sign up, you can safely ignore this.</p>
          </div>
        `,
      });
    },
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
});

export type Session = typeof auth.$Infer.Session;
