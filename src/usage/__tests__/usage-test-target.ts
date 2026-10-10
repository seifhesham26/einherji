export function resolveUsageTestTarget(values: Record<string, string | undefined>): string | null {
  if (values.SCRAPER_INTEGRATION !== "1") return null;
  if (values.USAGE_TEST_ALLOW_WRITES !== "1") throw new Error("Usage-test writes require acknowledgment");
  const allowMain = values.USAGE_TEST_ALLOW_MAIN_DATABASE === "1";
  const target = values.USAGE_TEST_DATABASE_URL || (allowMain ? values.DATABASE_URL : undefined);
  function identity(raw: string | undefined, name: string): string {
    try {
      if (!raw) throw new Error();
      const url = new URL(raw);
      if (!["postgres:", "postgresql:"].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === "/") {
        throw new Error();
      }
      return JSON.stringify([
        url.hostname.toLowerCase().replace(/-pooler(?=\.)/, ""),
        url.port || "5432", decodeURIComponent(url.pathname.slice(1)),
      ]);
    } catch {
      throw new Error(`Valid ${name} is required for usage tests`);
    }
  }
  const personal = identity(values.DATABASE_URL, "DATABASE_URL");
  const testIdentity = identity(target, "USAGE_TEST_DATABASE_URL");
  if (personal === testIdentity && !allowMain) throw new Error("Usage tests cannot write to the personal database");
  return target!;
}
