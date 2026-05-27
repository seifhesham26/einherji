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
          <div className="rounded-full bg-emerald-500/10 p-4">
            <MailCheck className="h-8 w-8 text-emerald-500" />
          </div>
        </div>
        <div>
          <h2 className="text-xl font-semibold">Email already verified</h2>
          <p className="text-sm text-muted-foreground mt-1">Your email address has been verified.</p>
        </div>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <div className="flex items-center justify-center">
        <div className="rounded-full bg-primary/10 p-4">
          <MailCheck className="h-8 w-8 text-primary" />
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-semibold">Check your inbox</h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto">
          We sent a verification link to{" "}
          {email ? (
            <span className="font-medium text-foreground">{email}</span>
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
          className="gap-2 w-full max-w-[240px]"
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Resend email
        </Button>

        <div>
          <Link
            href="/dashboard"
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          >
            Skip for now →
          </Link>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Wrong email?{" "}
        <Link href="/login" className="underline-offset-4 hover:underline">
          Sign in with a different account
        </Link>
      </p>
    </div>
  );
}
