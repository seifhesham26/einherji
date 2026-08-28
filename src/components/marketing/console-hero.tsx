"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import TriageDemo from "./triage-demo";
import { resolvePrimaryAction } from "./primary-action";

/**
 * The thesis, and the proof of it, side by side.
 *
 * The old hero centred a gradient headline over floating orbs and claimed the
 * product scraped LinkedIn and found hiring managers. Both halves of that were
 * wrong: the scraping is the easy part, and the hiring-manager lookup has been
 * blocked since LinkedIn closed the door on it.
 *
 * So the headline says the true thing instead, and the right-hand column proves
 * it rather than illustrating it.
 */
export default function ConsoleHero() {
  const { data: session } = useSession();
  const primaryAction = resolvePrimaryAction(Boolean(session));

  return (
    <section className="relative border-b border-[var(--console-rule)]">
      {/* The drafting grid, fixed behind the content rather than scrolling with
          it, and never on a scrolling container - a repainting filter across a
          scroll surface is how a page loses its frame rate on a phone. */}
      <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgb(255_95_31/0.07),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto grid max-w-[1400px] items-center gap-10 px-5 pb-20 pt-28 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-28 lg:pt-28">
        <div>
          <h1 className="console-display text-[2.6rem] leading-[0.95] sm:text-6xl lg:text-[4.5rem]">
            Scraping was never
            <br />
            the hard part.
          </h1>

          <p className="mt-6 max-w-[46ch] text-base leading-relaxed text-[var(--console-dim)] sm:text-lg">
            Einherji ranks every posting it finds, then hands you a queue you can clear with four
            keys.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href={primaryAction.href}
              className="console-mono whitespace-nowrap border border-[var(--console-signal)] bg-[var(--console-signal)] px-6 py-3.5 text-xs font-semibold uppercase tracking-[0.16em] text-[#06080c] transition-all hover:bg-transparent hover:text-[var(--console-signal)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
            >
              {primaryAction.label}
            </Link>

            <a
              href="#instruments"
              className="console-mono whitespace-nowrap border border-[var(--console-rule)] px-6 py-3.5 text-xs uppercase tracking-[0.16em] text-[var(--console-dim)] transition-colors hover:border-[var(--console-dim)] hover:text-[var(--console-ink)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
            >
              What it does
            </a>
          </div>
        </div>

        <div className="lg:pl-4">
          <TriageDemo />
          {/* Said once, plainly, rather than left for someone to wonder about. */}
          <p className="console-mono mt-3 text-[10px] uppercase tracking-[0.16em] text-[var(--console-dim)]/70">
            Sample queue
          </p>
        </div>
      </div>
    </section>
  );
}
