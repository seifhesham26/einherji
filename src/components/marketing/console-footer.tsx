/**
 * The bottom rail.
 *
 * A hairline and two readings. A marketing page does not need a sitemap when it
 * has five sections and one action.
 */
export default function ConsoleFooter() {
  return (
    <footer className="border-t border-sky-100/90 bg-white/60 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div className="flex items-center gap-2.5">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-2xs">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
          </span>
          <span className="console-mono text-[11px] font-bold uppercase tracking-[0.22em] text-slate-800">
            Einherji
          </span>
        </div>
        <div className="flex items-center gap-4">
          <span className="console-mono text-[11px] font-medium tracking-[0.08em] text-slate-500">
            A job hunt runs on a queue, not a pile.
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50 px-2.5 py-0.5 text-[10px] font-mono font-medium text-emerald-700">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Engines Active
          </span>
        </div>
      </div>
    </footer>
  );
}
