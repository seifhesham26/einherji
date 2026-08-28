"use client";

import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { useReveal } from "@/hooks/useReveal";
import { cn } from "@/lib/utils";
import { ARE_SIGNUPS_OPEN, SIGNUPS_CLOSED_MESSAGE } from "@/lib/signups";
import { resolvePrimaryAction } from "./primary-action";

/**
 * The close.
 *
 * Off-centre and hard against the grid, like the hero, so the page ends in the
 * same voice it opened in. One action, with the same label it carries in the
 * nav and the hero: a page that calls the same thing three different names is a
 * page that has not decided what it wants.
 */
export default function ConsoleCta() {
  const { ref, isRevealed } = useReveal<HTMLElement>(0.2);
  const { data: session } = useSession();
  const primaryAction = resolvePrimaryAction(Boolean(session));
  // The close is the one place the page should say why the door is shut, rather
  // than quietly changing its button and hoping nobody notices.
  const isClosedToNewAccounts = !session && !ARE_SIGNUPS_OPEN;

  return (
    <section
      ref={ref}
      className={cn(
        "relative border-t border-[var(--console-rule)]",
        isRevealed && "console-revealed",
      )}
    >
      <div className="console-grid pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_100%,rgb(255_95_31/0.09),transparent_55%)]"
        aria-hidden
      />

      <div className="relative mx-auto max-w-[1400px] px-5 py-24 sm:px-8 lg:py-32">
        <div className="max-w-[24ch]">
          <h2 className="console-display text-4xl leading-[0.98] sm:text-5xl lg:text-6xl">
            Point it at your hunt.
          </h2>

          <p className="mt-5 max-w-[42ch] text-sm leading-relaxed text-[var(--console-dim)] sm:text-base">
            {isClosedToNewAccounts
              ? SIGNUPS_CLOSED_MESSAGE
              : "Set your criteria once. The scrape runs on a schedule, the queue is sorted by morning, and the pile stops growing."}
          </p>

          <Link
            href={primaryAction.href}
            className="console-mono mt-9 inline-block whitespace-nowrap border border-[var(--console-signal)] bg-[var(--console-signal)] px-8 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-[#06080c] transition-all hover:bg-transparent hover:text-[var(--console-signal)] active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--console-signal)]"
          >
            {primaryAction.label}
          </Link>
        </div>
      </div>
    </section>
  );
}
