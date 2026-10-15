"use client";

import { useState } from "react";
import Link from "next/link";
import { MailCheck, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useSession, sendVerificationEmail } from "@/lib/auth-client";

export default function VerifyEmailView() {
  const { data: session } = useSession();
  const [isSending, setIsSending] = useState(false);

  const email = session?.user.email;
  const isAlreadyVerified = session?.user.emailVerified;

  async function handleResend() {
    if (!email) return;
    setIsSending(true);
    const { error } = await sendVerificationEmail({
      email,
      callbackURL: "/dashboard",
    });
    setIsSending(false);

    if (error) {
      toast.error(error.message ?? "Failed to send verification email.");
    } else {
      toast.success("Verification email sent! Check your inbox.");
    }
  }

  if (isAlreadyVerified) {
    return (
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 p-4 ring-1 ring-emerald-300/70 dark:ring-emerald-700/60 shadow-[0_0_16px_rgba(16,185,129,0.2)]">
            <MailCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Email already verified</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Your email address has been verified.</p>
        </div>
        <Link
          href="/dashboard"
          className="ice-shimmer inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-600 to-cyan-600 px-5 py-2.5 text-sm font-medium text-white shadow-[0_4px_16px_rgba(14,165,233,0.35)] hover:from-sky-500 hover:to-cyan-500 transition-all"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/50 p-4 ring-1 ring-sky-300/80 dark:ring-sky-700/70 shadow-[0_0_20px_rgba(14,165,233,0.2)]">
          <MailCheck className="h-8 w-8 text-sky-600 dark:text-sky-400" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Check your inbox</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto leading-relaxed">
          We sent a verification link to{" "}
          {email ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100">{email}</span>
          ) : (
            "your email address"
          )}
          . Click it to activate your account.
        </p>
      </div>

      <div className="space-y-3">
        <Button
          variant="outline"
          onClick={handleResend}
          disabled={isSending}
          className="gap-2 w-full max-w-[240px] rounded-xl border-sky-200/80 dark:border-sky-800/80 bg-card/60 hover:bg-sky-50/80 dark:hover:bg-sky-950/40 shadow-xs"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin text-sky-500" />
          ) : (
            <RefreshCw className="h-4 w-4 text-sky-500" />
          )}
          Resend email
        </Button>

        <div>
          <Link
            href="/dashboard"
            className="text-xs font-medium text-slate-500 hover:text-sky-600 transition-colors"
          >
            Skip for now →
          </Link>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Wrong email?{" "}
        <Link href="/login" className="font-medium text-sky-600 dark:text-sky-400 underline-offset-4 hover:underline">
          Sign in with a different account
        </Link>
      </p>
    </div>
  );
}
