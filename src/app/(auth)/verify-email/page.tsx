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
    <div className="console relative flex min-h-dvh flex-col items-center justify-center px-6 py-12 overflow-hidden bg-background">
      <div className="console-grid pointer-events-none absolute inset-0 opacity-40 dark:opacity-20" aria-hidden />
      <div
        className="animate-ice-aurora pointer-events-none absolute -top-20 -left-20 h-[450px] w-[500px] rounded-full bg-gradient-to-br from-sky-400/15 via-cyan-300/10 to-transparent blur-3xl"
        aria-hidden
      />
      <div
        className="animate-ice-aurora pointer-events-none absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-gradient-to-tl from-sky-400/12 via-cyan-300/8 to-transparent blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-sky-200/70 dark:border-sky-800/60 bg-card/90 backdrop-blur-md p-8 shadow-[0_8px_32px_rgba(14,165,233,0.08)]">
        <div className="mb-6 flex justify-center">
          <Link
            href="/"
            className="group flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            </span>
            <span className="console-mono text-sm font-bold uppercase tracking-[0.22em] text-slate-900 dark:text-slate-100 transition-colors group-hover:text-sky-600">
              Einherji
            </span>
          </Link>
        </div>

        <VerifyEmailView />
      </div>
    </div>
  );
}
