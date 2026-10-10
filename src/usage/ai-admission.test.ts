import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Database } from "@/lib/db";

const mocks = vi.hoisted(() => ({ funding: vi.fn(), verified: vi.fn(), quota: vi.fn() }));
vi.mock("@/lib/ai/resolve-ai-client", () => ({ resolveAiFundingSource: mocks.funding }));
vi.mock("./usage.db", () => ({ isAccountVerified: mocks.verified }));
vi.mock("./usage.service", () => ({ consumeQuota: mocks.quota }));
vi.mock("@/lib/env", () => ({ env: { AI_SHARED_DAILY_REQUEST_LIMIT: 50 } }));
import { admitAiAction } from "./ai-admission";

const db = {} as Database;
const invoke = () => admitAiAction(db, "account-a", "generate_fit_report", "test", { openrouterApiKey: "personal" });

describe("AI funding admission", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.funding.mockReturnValue("platform");
    mocks.verified.mockResolvedValue(true);
    mocks.quota.mockResolvedValue(undefined);
  });

  it("rejects unsupported funding before consuming an allowance", async () => {
    const error = new Error("Model funding unavailable");
    mocks.funding.mockImplementation(() => { throw error; });
    await expect(invoke()).rejects.toBe(error);
    expect(mocks.verified).not.toHaveBeenCalled();
    expect(mocks.quota).not.toHaveBeenCalled();
  });

  it.each([false, undefined, null])("requires verified platform callers (%s)", async (verified) => {
    mocks.verified.mockResolvedValue(verified);
    await expect(invoke()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(mocks.quota).not.toHaveBeenCalled();
  });

  it("checks the database account before quota admission", async () => {
    await invoke();
    expect(mocks.verified).toHaveBeenCalledWith(db, "account-a");
    expect(mocks.quota).toHaveBeenCalledWith(db, "account-a", "generate_fit_report", { sharedAiLimit: 50 });
    expect(mocks.verified.mock.invocationCallOrder[0]).toBeLessThan(mocks.quota.mock.invocationCallOrder[0]);
  });

  it("allows compatible personal funding but still charges the workload quota", async () => {
    mocks.funding.mockReturnValue("personal");
    await invoke();
    expect(mocks.funding).toHaveBeenCalledWith("test", { openrouterApiKey: "personal" });
    expect(mocks.verified).not.toHaveBeenCalled();
    expect(mocks.quota).toHaveBeenCalledOnce();
  });

  it("fails closed when verification cannot be read", async () => {
    const error = new Error("Database offline");
    mocks.verified.mockRejectedValue(error);
    await expect(invoke()).rejects.toBe(error);
    expect(mocks.quota).not.toHaveBeenCalled();
  });

  it("does not authorize a provider when quota admission fails", async () => {
    const provider = vi.fn();
    mocks.quota.mockRejectedValue(new Error("Quota unavailable"));
    await expect(invoke().then(provider)).rejects.toThrow("Quota unavailable");
    expect(provider).not.toHaveBeenCalled();
  });
});
