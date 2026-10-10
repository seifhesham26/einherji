import { neon } from "@neondatabase/serverless";
import { afterEach, describe, expect, it, vi } from "vitest";
import { admitUsage } from "./usage.db";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function boundary() {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("Unexpected unit-test network")));
  const client = neon("postgresql://unit:unit@unit.example.invalid/test");
  const transaction = vi.spyOn(client, "transaction").mockResolvedValue([
    [], [], [{ admitted: true, oldestAt: null }],
  ]);
  return { db: { $client: client }, transaction };
}

describe("atomic quota admission", () => {
  it("admits only after the transaction resolves", async () => {
    const { db, transaction } = boundary();
    let release!: (rows: Record<string, unknown>[][]) => void;
    const gate = new Promise<Record<string, unknown>[][]>((resolve) => { release = resolve; });
    transaction.mockReturnValueOnce(gate);
    let completed = false;
    const pending = admitUsage(db, "account-a", "parse_cv", 20)
      .then((result) => { completed = true; return result; });
    await Promise.resolve();
    expect(completed).toBe(false);
    release([[], [], [{ admitted: true, oldestAt: null }]]);
    await expect(pending).resolves.toEqual({ admitted: true, oldestAt: null });
  });

  it("binds identity and locks before conditional admission", async () => {
    const { db, transaction } = boundary();
    const userId = "account', fake); SELECT 1; --";
    await admitUsage(db, userId, "parse_cv", 20);
    const [queries, options] = transaction.mock.calls[0];
    if (!Array.isArray(queries)) throw new Error("Expected query array");
    const lock = queries[1].queryData;
    const admission = queries[2].queryData;
    if (!("query" in lock) || !("query" in admission)) throw new Error("Expected bound queries");
    expect(lock.params).toEqual([JSON.stringify(["einherji:usage-quota:v1", userId, "parse_cv"])]);
    expect(admission.params.slice(1)).toEqual([userId, "parse_cv", 20, 86_400_000]);
    expect(admission.params[0]).toEqual(expect.any(String));
    expect(lock.query).toContain("pg_advisory_xact_lock");
    expect(lock.query).not.toContain("usage_events");
    expect(admission.query).not.toContain(userId);
    expect(options).toMatchObject({
      isolationLevel: "ReadCommitted", arrayMode: false, fullResults: false,
    });
    expect(options?.fetchOptions?.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])("rejects invalid limit %s", async (limit) => {
    const { db, transaction } = boundary();
    await expect(admitUsage(db, "account-a", "parse_cv", limit)).rejects.toThrow("Invalid quota limit");
    expect(transaction).not.toHaveBeenCalled();
  });

  it("rejects a zero allowance without issuing SQL", async () => {
    const { db, transaction } = boundary();
    await expect(admitUsage(db, "account-a", "parse_cv", 0)).resolves.toEqual({
      admitted: false, oldestAt: null,
    });
    expect(transaction).not.toHaveBeenCalled();
  });

  it("returns exhausted-window metadata", async () => {
    const { db, transaction } = boundary();
    transaction.mockResolvedValueOnce([[], [], [{
      admitted: false, oldestAt: "2026-10-08T14:00:00.000Z",
    }]]);
    await expect(admitUsage(db, "account-a", "parse_cv", 20)).resolves.toEqual({
      admitted: false, oldestAt: new Date("2026-10-08T14:00:00.000Z"),
    });
  });

  it.each([
    { response: [] },
    { response: [[], [], []] },
    { response: [[], [], [{ admitted: "true", oldestAt: null }]] },
    { response: [[], [], [{ admitted: true, oldestAt: "invalid" }]] },
    { response: [[], [], [{ admitted: true }]] },
  ])("fails closed on a malformed response", async ({ response }) => {
    const { db, transaction } = boundary();
    transaction.mockResolvedValueOnce(response);
    await expect(admitUsage(db, "account-a", "parse_cv", 20)).rejects.toThrow();
  });

  it("propagates uncertain transport failure without another admission", async () => {
    const { db, transaction } = boundary();
    const failure = new Error("Commit outcome unknown");
    transaction.mockRejectedValueOnce(failure);
    await expect(admitUsage(db, "account-a", "parse_cv", 20)).rejects.toBe(failure);
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
