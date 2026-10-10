import { Suspense } from "react";
import AuthShell from "@/components/auth/auth-shell";
import ResetPasswordForm from "@/components/auth/reset-password-form";

export const metadata = { title: "New password", referrer: "no-referrer" as const };

export default function ResetPasswordPage() {
  return <AuthShell statement="A fresh start." support="Your profile and saved applications remain unchanged.">
    <Suspense fallback={<div className="h-96 w-full max-w-sm" />}><ResetPasswordForm /></Suspense>
  </AuthShell>;
}
