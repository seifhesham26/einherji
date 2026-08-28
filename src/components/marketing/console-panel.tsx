"use client";

import { cn } from "@/lib/utils";
import { useReveal } from "@/hooks/useReveal";

/**
 * A module on the console.
 *
 * Every section of this page is one of these: a hairline box with a rail across
 * the top carrying a monospace label on the left and a reading on the right.
 * The rail is the page's only repeated structural device, and it earns its place
 * by carrying real information every time it appears - what the module is, and
 * one true number about it.
 *
 * It is deliberately not an eyebrow. An eyebrow is a decorative label floating
 * above a headline; this is the frame the headline sits inside, the same way a
 * gauge is inside a bezel.
 */

interface ConsolePanelProps {
  /** What this module is, in the console's own vocabulary. */
  label: string;
  /** One true reading. Right-aligned on the rail, like an instrument's value. */
  reading?: string;
  children: React.ReactNode;
  className?: string;
  id?: string;
}

export default function ConsolePanel({
  label,
  reading,
  children,
  className,
  id,
}: ConsolePanelProps) {
  const { ref, isRevealed } = useReveal<HTMLElement>(0.08);

  return (
    <section
      ref={ref}
      id={id}
      className={cn(
        "border-t border-[var(--console-rule)]",
        isRevealed && "console-revealed",
        className,
      )}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="flex items-baseline justify-between gap-4 border-b border-[var(--console-rule)] py-3">
          <span className="console-mono text-[11px] uppercase tracking-[0.2em] text-[var(--console-dim)]">
            {label}
          </span>
          {reading && (
            <span className="console-mono text-[11px] tracking-[0.1em] text-[var(--console-dim)]">
              {reading}
            </span>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
