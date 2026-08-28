import Link from "next/link";
import AuthShell from "@/components/auth/auth-shell";
import RegisterForm from "@/components/auth/register-form";
import { ARE_SIGNUPS_OPEN, SIGNUPS_CLOSED_MESSAGE } from "@/lib/signups";

export default function RegisterPage() {
  if (!ARE_SIGNUPS_OPEN) {
    return (
      <AuthShell
        statement="Not taking new accounts right now."
        support="The door is shut on purpose rather than broken. It will open again."
      >
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2">
            <h1 className="console-display text-2xl leading-tight">Signups are closed</h1>
            <p className="text-sm leading-relaxed text-[var(--console-dim)]">
              {SIGNUPS_CLOSED_MESSAGE}
            </p>
          </div>

          {/* Still a real page rather than a 404: this URL is in the wild, and a
              closed door with a sign on it is a better answer than a dead end. */}
          <Link
            href="/login"
            className="console-mono inline-block w-full border border-[var(--console-signal)] bg-[var(--console-signal)] px-6 py-3.5 text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#06080c] transition-all hover:bg-transparent hover:text-[var(--console-signal)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
          >
            Sign in
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      statement="Point it at your hunt."
      support="Set your criteria once. The scrape runs on a schedule and the queue is sorted by morning."
    >
      <RegisterForm />
    </AuthShell>
  );
}
