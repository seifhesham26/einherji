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
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--console-rule)] p-12 lg:flex">
        <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_10%_0%,rgb(255_95_31/0.08),transparent_55%)]"
          aria-hidden
        />

        <Link
          href="/"
          className="console-mono relative text-sm font-semibold uppercase tracking-[0.22em] text-[var(--console-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
        >
          Einherji
        </Link>

        <div className="relative max-w-[22ch]">
          <p className="console-display text-4xl leading-[1.02] xl:text-5xl">{statement}</p>
          <p className="mt-5 max-w-[38ch] text-sm leading-relaxed text-[var(--console-dim)]">
            {support}
          </p>
        </div>

        <p className="console-mono relative text-[11px] tracking-[0.1em] text-[var(--console-dim)]">
          A job hunt runs on a queue, not a pile.
        </p>
      </div>

      <div className="flex min-h-dvh flex-col items-center justify-center px-6 py-12 lg:min-h-0">
        {/* The wordmark only appears here when the brand half is hidden, so it is
            never on screen twice. */}
        <Link
          href="/"
          className="console-mono mb-10 text-sm font-semibold uppercase tracking-[0.22em] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)] lg:hidden"
        >
          Einherji
        </Link>

        {children}
      </div>
    </div>
  );
}
