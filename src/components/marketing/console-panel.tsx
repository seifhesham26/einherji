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
        "relative border-t border-sky-100/90",
        isRevealed && "console-revealed",
        className,
      )}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8">
        <div className="flex items-center justify-between gap-4 border-b border-sky-100/90 py-3.5">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shadow-[0_0_6px_#38bdf8]" />
            <span className="console-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-800">
              {label}
            </span>
          </div>
          {reading && (
            <span className="console-mono rounded-full border border-sky-200/70 bg-sky-50/80 px-2.5 py-0.5 text-[11px] font-medium tracking-[0.08em] text-sky-700">
              {reading}
            </span>
          )}
        </div>

        {children}
      </div>
    </section>
  );
}
