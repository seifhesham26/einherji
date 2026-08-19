import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// This endpoint runs a scrape on an account's behalf, so it must never accept
// unsigned work — the same reasoning as the cron endpoint.

const runDigestForUserId = vi.fn();
const verify = vi.fn();
let receiver: { verify: typeof verify } | null = { verify };

vi.mock("@/digest/digest.service", () => ({
  runDigestForUserId: (...args: unknown[]) => runDigestForUserId(...args),
}));
vi.mock("@/lib/db", () => ({ db: {} }));
vi.mock("@/lib/qstash", () => ({
  get qstashReceiver() {
    return receiver;
  },
}));

function request(body: unknown, signature = "sig") {
  return new NextRequest("https://example.com/api/queue/run-digest", {
    method: "POST",
    headers: { "upstash-signature": signature },
    body: JSON.stringify(body),
  });
}

describe("queue run-digest endpoint", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    receiver = { verify };
    verify.mockResolvedValue(true);
    runDigestForUserId.mockResolvedValue({ userId: "u1", jobsFound: 3, emailed: true });
  });

  // Fails closed: missing keys must not mean "no verification required".
  it("refuses to run when signing keys are not configured", async () => {
    receiver = null;
    const { POST } = await import("./route");

    const response = await POST(request({ userId: "u1" }));
    expect(response.status).toBe(503);
    expect(runDigestForUserId).not.toHaveBeenCalled();
  });

  it("rejects an unsigned or forged request", async () => {
    verify.mockResolvedValue(false);
    const { POST } = await import("./route");

    const response = await POST(request({ userId: "u1" }));
    expect(response.status).toBe(401);
    expect(runDigestForUserId).not.toHaveBeenCalled();
  });

  it("rejects when verification throws rather than treating it as valid", async () => {
    verify.mockRejectedValue(new Error("bad signature"));
    const { POST } = await import("./route");

    expect((await POST(request({ userId: "u1" }))).status).toBe(401);
  });

  it("runs the account named in a properly signed message", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ userId: "u1" }));
    expect(response.status).toBe(200);
    expect(runDigestForUserId).toHaveBeenCalledWith({}, "u1");
  });

  // 400 rather than 500: a malformed payload will never succeed, so QStash
  // should stop redelivering it instead of retrying forever.
  it("returns 400 for a payload that can never work", async () => {
    const { POST } = await import("./route");

    const response = await POST(request({ notAUserId: true }));
    expect(response.status).toBe(400);
    expect(runDigestForUserId).not.toHaveBeenCalled();
  });

  // 500 asks QStash to retry — a database or provider blip deserves another go.
  it("returns 500 so a transient failure is retried", async () => {
    runDigestForUserId.mockRejectedValue(new Error("connection reset"));
    const { POST } = await import("./route");

    const response = await POST(request({ userId: "u1" }));
    expect(response.status).toBe(500);
  });

  it("succeeds quietly when the account turned the digest off in the meantime", async () => {
    runDigestForUserId.mockResolvedValue(null);
    const { POST } = await import("./route");

    const response = await POST(request({ userId: "u1" }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ skipped: true });
  });
});
