import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { after } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { users, sessions, accounts, verifications } from "@/lib/db/schema";
import { ARE_SIGNUPS_OPEN } from "@/lib/signups";
import { isAccountMailReady, sendAccountEmail } from "./account-email";

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
  advanced: { disableOriginCheck: false },
  emailAndPassword: {
    enabled: true,
    // Where signups are actually closed. The register page stops rendering a form
    // and the landing page stops offering one, but sign-up is a public HTTP route
    // — anyone can POST to it directly, so the refusal has to live here.
    disableSignUp: !ARE_SIGNUPS_OPEN,
    // Allow login before verification — users see a banner prompt instead of being blocked
    requireEmailVerification: false,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => {
      // Provider latency must not distinguish known accounts in the HTTP response.
      after(async () => {
        await sendAccountEmail({ kind: "recovery", user, url }).catch(() => {
          console.error("Password recovery email delivery failed.");
        });
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendAccountEmail({ kind: "verification", user, url });
    },
    autoSignInAfterVerification: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (["/request-password-reset", "/send-verification-email"].includes(ctx.path) && !isAccountMailReady()) {
        throw new APIError("SERVICE_UNAVAILABLE", { message: "Account email delivery is unavailable. Try again later." });
      }
    }),
  },
});

export type Session = typeof auth.$Infer.Session;
