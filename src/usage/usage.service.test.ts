import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as schema from "@/lib/db/schema";
import { DAILY_QUOTAS } from "./usage.validators";
import { consumeQuota, fetchQuotaStatus, fetchSharedAiQuotaStatus } from "./usage.service";

const { admitUsage, getUsageInWindow, getSharedAiUsage } = vi.hoisted(() => ({
  admitUsage: vi.fn(), getUsageInWindow: vi.fn(), getSharedAiUsage: vi.fn(),
}));
vi.mock("./usage.db", () => ({ admitUsage, getUsageInWindow, getSharedAiUsage }));
const db = drizzle(neon("postgresql://unit:unit@unit.example.invalid/test"), { schema });

beforeEach(() => {
  vi.stubEnv("SAAS_PILOT_MODE", undefined);
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-09T12:00:00.000Z"));
  admitUsage.mockResolvedValue({ admitted: true, oldestAt: null });
  getUsageInWindow.mockResolvedValue({ used: 0, oldestAt: null });
  getSharedAiUsage.mockResolvedValue(51);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("quota service", () => {
  it("reports shared capacity as unavailable without promising personal capacity", async () => {
    await expect(fetchSharedAiQuotaStatus(db, 50)).resolves.toEqual({ used: 51, limit: 50, remaining: 0, paused: false });
    await expect(fetchSharedAiQuotaStatus(db, 0)).resolves.toEqual({ used: 51, limit: 0, remaining: 0, paused: true });
  });
  it("uses the same pilot limits in atomic admission and displayed status", async () => {
    vi.stubEnv("SAAS_PILOT_MODE", "1");
    await consumeQuota(db, "account-a", "parse_cv");
    expect(admitUsage).toHaveBeenCalledWith(db, "account-a", "parse_cv", 1);
    expect((await fetchQuotaStatus(db, "account-a")).find((row) => row.action === "parse_cv"))
      .toMatchObject({ limit: 1, remaining: 1 });
  });
  it("explains shared exhaustion without claiming the user's own quota is exhausted", async () => {
    admitUsage.mockResolvedValue({ admitted: false, oldestAt: null, sharedExhausted: true });
    await expect(consumeQuota(db, "account-a", "parse_cv", { sharedAiLimit: 50 })).rejects.toThrow("Shared AI capacity");
    expect(admitUsage).toHaveBeenCalledWith(db, "account-a", "parse_cv", 20, { sharedAiLimit: 50 });
  });
  it("uses server-selected limits through atomic admission", async () => {
    await expect(consumeQuota(db, "account-a", "parse_cv")).resolves.toBeUndefined();
    expect(admitUsage).toHaveBeenCalledWith(db, "account-a", "parse_cv", DAILY_QUOTAS.parse_cv);
  });

  it("rejects exhaustion before provider work with the existing reset information", async () => {
    admitUsage.mockResolvedValue({
      admitted: false, oldestAt: new Date("2026-10-08T14:00:00.000Z"),
    });
    const provider = vi.fn();
    const request = async () => {
      await consumeQuota(db, "account-a", "parse_cv");
      return provider();
    };
    await expect(request()).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    await expect(consumeQuota(db, "account-a", "parse_cv")).rejects.toThrow("2 hour(s)");
    expect(provider).not.toHaveBeenCalled();
  });

  it("propagates database failure without starting the provider", async () => {
    const failure = new Error("Commit outcome unknown");
    admitUsage.mockRejectedValue(failure);
    const provider = vi.fn();
    const request = async () => {
      await consumeQuota(db, "account-a", "parse_cv");
      return provider();
    };
    await expect(request()).rejects.toBe(failure);
    expect(provider).not.toHaveBeenCalled();
  });

  it("retains quota-status fields and clamps remaining capacity", async () => {
    getUsageInWindow.mockResolvedValue({ used: 21, oldestAt: null });
    const status = await fetchQuotaStatus(db, "account-a");
    expect(status.find((entry) => entry.action === "parse_cv")).toEqual({
      action: "parse_cv", label: "CV parses", used: 21, limit: 20, remaining: 0,
    });
  });
});
