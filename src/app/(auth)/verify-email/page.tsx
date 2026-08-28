import Link from "next/link";
import VerifyEmailView from "@/components/auth/verify-email-view";

/**
 * The third auth surface, on the same ground as the other two.
 *
 * Centred rather than split: there is one thing to do here and no argument to
 * make alongside it. `console` carries the palette and remaps the app's tokens,
 * so the view inside it wears the surface without being changed.
 */
export default function VerifyEmailPage() {
  return (
    <div className="console relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />

      <Link
        href="/"
        className="console-mono relative mb-10 text-sm font-semibold uppercase tracking-[0.22em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
      >
        Einherji
      </Link>

      <div className="relative w-full max-w-sm">
        <VerifyEmailView />
      </div>
    </div>
  );
}
