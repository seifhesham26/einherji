import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// An endpoint that scrapes on behalf of every account is the last place to be
// relaxed about auth: unprotected, anyone could burn everyone's quota and get
// the app's IP blocked by the boards.

const runDailyDigestForAll = vi.fn();
const envValues: Record<string, string | undefined> = {};

vi.mock("@/digest/digest.service", () => ({
  runDailyDigestForAll: (...args: unknown[]) => runDailyDigestForAll(...args),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/env", () => ({ env: new Proxy({}, { get: (_t, key: string) => envValues[key] }) }));

function request(headers: Record<string, string> = {}) {
  return new NextRequest("https://example.com/api/cron/daily-digest", { headers });
}

describe("daily digest cron endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(envValues)) delete envValues[key];
    runDailyDigestForAll.mockResolvedValue([]);
  });

  // Fails closed: a missing secret must not mean "no auth required".
  it("refuses to run when no secret is configured", async () => {
    const { GET } = await import("./route");
    const response = await GET(request());

    expect(response.status).toBe(503);
    expect(runDailyDigestForAll).not.toHaveBeenCalled();
  });

  it("rejects a request with no token", async () => {
    envValues.CRON_SECRET = "s3cret";
    const { GET } = await import("./route");

    expect((await GET(request())).status).toBe(401);
    expect(runDailyDigestForAll).not.toHaveBeenCalled();
  });

  it("rejects a request with the wrong token", async () => {
    envValues.CRON_SECRET = "s3cret";
    const { GET } = await import("./route");

    const response = await GET(request({ authorization: "Bearer wrong" }));
    expect(response.status).toBe(401);
    expect(runDailyDigestForAll).not.toHaveBeenCalled();
  });

  it("runs for a correctly signed request", async () => {
    envValues.CRON_SECRET = "s3cret";
    runDailyDigestForAll.mockResolvedValue([
      { userId: "u1", jobsFound: 4, emailed: true },
      { userId: "u2", jobsFound: 0, emailed: false },
    ]);
    const { GET } = await import("./route");

    const response = await GET(request({ authorization: "Bearer s3cret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.accounts).toBe(2);
    expect(body.emailsSent).toBe(1);
    expect(body.jobsFound).toBe(4);
  });

  // One broken account shouldn't cost everyone else their digest, but the
  // failure has to be visible or it's just a silent breakage.
  it("reports per-account failures without failing the run", async () => {
    envValues.CRON_SECRET = "s3cret";
    runDailyDigestForAll.mockResolvedValue([
      { userId: "u1", jobsFound: 2, emailed: true },
      { userId: "u2", jobsFound: 0, emailed: false, error: "Daily limit reached" },
    ]);
    const { GET } = await import("./route");

    const response = await GET(request({ authorization: "Bearer s3cret" }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.errors).toEqual([{ userId: "u2", error: "Daily limit reached" }]);
  });
});
