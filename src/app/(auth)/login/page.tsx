import { Suspense } from "react";
import AuthShell from "@/components/auth/auth-shell";
import LoginForm from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <AuthShell
      statement="Your queue is where you left it."
      support="Overnight scrapes are already sorted. Everything you shortlisted is still shortlisted."
    >
      {/* The form reads the `next` search param, which opts it out of static
          prerendering unless it sits behind a boundary. */}
      <Suspense fallback={<div className="h-96 w-full max-w-sm" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
