// Thrown by the scraper HTTP layer. Carries the upstream status so callers can
// tell "this host is blocking us" apart from "this company isn't on this ATS".
export class ScrapeError extends Error {
  readonly status: number;
  readonly url: string;

  constructor(message: string, status: number, url: string) {
    super(message);
    this.name = "ScrapeError";
    this.status = status;
    this.url = url;
  }

  // A 404 from an ATS board just means the company isn't there — that's an
  // expected outcome during slug probing, not a failure worth reporting.
  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

// Raised when a host rate-limits us repeatedly. The run should stop rather than
// keep hammering a host that has clearly asked us to back off.
export class CircuitOpenError extends Error {
  readonly host: string;

  constructor(host: string) {
    super(`Stopped scraping ${host} after repeated rate limiting. Try again later.`);
    this.name = "CircuitOpenError";
    this.host = host;
  }
}
