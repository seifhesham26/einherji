import Link from "next/link";

/**
 * The frame both auth pages sit in.
 *
 * Same surface as the marketing page: the `console` class carries the palette,
 * the drafting grid and the sharp corners, and it also remaps the app's semantic
 * tokens, so the shadcn inputs and buttons inside the form wear the console
 * without any of them being told about it.
 *
 * The two halves used to disagree with each other and with the front page: a
 * black panel with an emerald mark listing features the product no longer has,
 * next to a form on the app's white chrome. Coming in through the front door and
 * coming in through a shared link led to what looked like two products.
 */

interface AuthShellProps {
  /** The one line, in the display face. Short enough to hold at two lines. */
  statement: string;
  /** One sentence under it. */
  support: string;
  /** The form, or whatever stands in for it. */
  children: React.ReactNode;
}

export default function AuthShell({ statement, support, children }: AuthShellProps) {
  return (
    <div className="console min-h-dvh lg:grid lg:grid-cols-[1.1fr_1fr]">
      {/* The brand half. Hidden on small screens, where it would push the form
          below the fold for no gain. */}
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-sky-100/90 bg-gradient-to-b from-sky-50/50 via-white to-sky-50/30 p-12 lg:flex">
        <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="animate-ice-aurora pointer-events-none absolute -top-20 -left-20 h-[450px] w-[500px] rounded-full bg-gradient-to-br from-sky-400/15 via-cyan-300/10 to-transparent blur-3xl"
          aria-hidden
        />

        <Link
          href="/"
          className="group relative flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          </span>
          <span className="console-mono text-sm font-bold uppercase tracking-[0.22em] text-slate-900 transition-colors group-hover:text-sky-600">
            Einherji
          </span>
        </Link>

        <div className="relative max-w-[22ch]">
          <p className="console-display text-4xl leading-[1.02] text-slate-900 xl:text-5xl">
            {statement}
          </p>
          <p className="mt-5 max-w-[38ch] text-sm leading-relaxed text-slate-600">
            {support}
          </p>
        </div>

        <p className="console-mono relative text-[11px] tracking-[0.1em] text-slate-500">
          A job hunt runs on a queue, not a pile.
        </p>
      </div>

      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 lg:min-h-0">
        {/* The wordmark only appears here when the brand half is hidden, so it is
            never on screen twice. */}
        <Link
          href="/"
          className="console-mono mb-10 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.22em] text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)] lg:hidden"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          Einherji
        </Link>

        {children}
      </div>
    </div>
  );
}
