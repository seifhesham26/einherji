/**
 * The bottom rail.
 *
 * A hairline and two readings. A marketing page does not need a sitemap when it
 * has five sections and one action.
 */
export default function ConsoleFooter() {
  return (
    <footer className="border-t border-[var(--console-rule)]">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-3 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span className="console-mono text-[11px] uppercase tracking-[0.22em] text-[var(--console-ink)]">
          Einherji
        </span>
        <span className="console-mono text-[11px] tracking-[0.1em] text-[var(--console-dim)]">
          A job hunt runs on a queue, not a pile.
        </span>
      </div>
    </footer>
  );
}
