/**
 * Thrown by an adapter when a source structurally cannot serve the query it was
 * handed — Adzuna has no index for the country, a board covers one region only.
 *
 * This is deliberately not a failure. Nothing is broken and no retry will help;
 * the source and the search simply don't overlap. Reporting it as "1 source
 * failed" on every run trains the user to ignore the summary, which is exactly
 * where real failures show up.
 */
export class SourceNotApplicableError extends Error {
  readonly source: string;
  readonly reason: string;

  constructor(source: string, reason: string) {
    super(`${source} cannot serve this search: ${reason}`);
    this.name = "SourceNotApplicableError";
    this.source = source;
    this.reason = reason;
  }
}
