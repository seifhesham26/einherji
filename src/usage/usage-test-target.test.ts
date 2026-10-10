import { describe, expect, it } from "vitest";
import { resolveUsageTestTarget } from "./__tests__/usage-test-target";

const personal = "postgresql://owner:secret@ep-owner.region.neon.tech/app";
const target = "postgresql://test:secret@ep-test.region.neon.tech/test";
const configured = {
  SCRAPER_INTEGRATION: "1", USAGE_TEST_ALLOW_WRITES: "1",
  DATABASE_URL: personal, USAGE_TEST_DATABASE_URL: target,
};

describe("disposable quota test target", () => {
  it("skips default runs before parsing any target", () => {
    expect(resolveUsageTestTarget({})).toBeNull();
    expect(resolveUsageTestTarget({ ...configured, SCRAPER_INTEGRATION: "0" })).toBeNull();
  });

  it("requires explicit disposable write acknowledgment", () => {
    expect(() => resolveUsageTestTarget({
      ...configured, USAGE_TEST_ALLOW_WRITES: "0",
    })).toThrow();
  });

  it.each(["DATABASE_URL", "USAGE_TEST_DATABASE_URL"])("requires %s", (key) => {
    expect(() => resolveUsageTestTarget({ ...configured, [key]: undefined })).toThrow();
  });

  it.each([
    personal,
    "postgresql://other:other@ep-owner-pooler.region.neon.tech/app",
    "postgresql://other:other@ep-owner.region.neon.tech/%61pp",
    "postgres://other:other@EP-OWNER.region.neon.tech:5432/app",
  ])("rejects the personal database through aliases", (url) => {
    expect(() => resolveUsageTestTarget({ ...configured, USAGE_TEST_DATABASE_URL: url })).toThrow();
  });

  it.each(["https://example.test/db", "not-a-url", "postgresql://host/"])(
    "rejects an invalid target", (url) => {
      expect(() => resolveUsageTestTarget({ ...configured, USAGE_TEST_DATABASE_URL: url })).toThrow();
    },
  );

  it("returns only the explicitly configured disposable URL", () => {
    expect(resolveUsageTestTarget(configured)).toBe(target);
  });

  it("allows the main target only with explicit main-database permission", () => {
    expect(resolveUsageTestTarget({
      ...configured, USAGE_TEST_DATABASE_URL: personal, USAGE_TEST_ALLOW_MAIN_DATABASE: "1",
    })).toBe(personal);
  });

  it("falls back to the main URL only when explicitly permitted", () => {
    expect(resolveUsageTestTarget({
      ...configured, USAGE_TEST_DATABASE_URL: undefined, USAGE_TEST_ALLOW_MAIN_DATABASE: "1",
    })).toBe(personal);
    expect(() => resolveUsageTestTarget({
      ...configured, USAGE_TEST_DATABASE_URL: undefined, USAGE_TEST_ALLOW_MAIN_DATABASE: "0",
    })).toThrow();
  });

  it("does not let main-database permission bypass write acknowledgment", () => {
    expect(() => resolveUsageTestTarget({
      ...configured, USAGE_TEST_DATABASE_URL: personal,
      USAGE_TEST_ALLOW_MAIN_DATABASE: "1", USAGE_TEST_ALLOW_WRITES: "0",
    })).toThrow();
  });

  it("does not put credentials in its error", () => {
    let failure: unknown;
    try {
      resolveUsageTestTarget({ ...configured, USAGE_TEST_DATABASE_URL: personal });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(Error);
    expect(String(failure)).not.toContain("secret");
    expect(String(failure)).not.toContain(personal);
  });
});
