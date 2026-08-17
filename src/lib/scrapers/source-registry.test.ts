import { describe, expect, it } from "vitest";
import { SOURCE_DEFINITIONS, getSourceDefinition } from "./source-registry";
import { jobSourceNameSchema } from "./job-source.types";
import { ATS_PROVIDERS } from "./ats/fetch-ats-jobs";
import { AGGREGATOR_SOURCE_NAMES } from "./aggregators/fetch-aggregator-jobs";
import { atsProviderValues } from "@/companies/companies.validators";

// The registry, the Zod enum, the database enum and the dispatchers are four
// separate lists that must agree. They drifted once already — the settings
// validator kept its own copy and silently rejected every newly added source.
describe("source registry consistency", () => {
  const registryIds = SOURCE_DEFINITIONS.map((source) => source.id);
  const schemaValues = jobSourceNameSchema.options;

  it("describes every source the schema allows", () => {
    for (const value of schemaValues) {
      expect(getSourceDefinition(value), `no registry entry for "${value}"`).not.toBeNull();
    }
  });

  it("has no registry entry the schema rejects", () => {
    for (const id of registryIds) {
      expect(() => jobSourceNameSchema.parse(id)).not.toThrow();
    }
  });

  it("has no duplicate ids", () => {
    expect(new Set(registryIds).size).toBe(registryIds.length);
  });

  it("can actually run every ATS provider it lists as a company board", () => {
    const companyBoards = SOURCE_DEFINITIONS.filter(
      (source) => source.tier === "company_board",
    ).map((source) => source.id);

    // A board in the registry with no fetcher would look selectable but return
    // nothing at run time.
    expect([...companyBoards].sort()).toEqual([...ATS_PROVIDERS].sort());
  });

  it("keeps the companies validator in step with the ATS fetchers", () => {
    // Otherwise detect-ats resolves a provider that can never be saved.
    expect([...atsProviderValues].sort()).toEqual([...ATS_PROVIDERS].sort());
  });

  it("can actually run every aggregator and marketplace source it lists", () => {
    const searchable = SOURCE_DEFINITIONS.filter(
      (source) => source.tier === "aggregator" || source.tier === "marketplace",
    ).map((source) => source.id);

    for (const id of searchable) {
      // serpapi is declared for lead discovery and has no job fetcher yet.
      if (id === "serpapi") continue;
      expect(AGGREGATOR_SOURCE_NAMES, `"${id}" has no fetcher`).toContain(id);
    }
  });

  it("gives every credentialed source a signup link and a cost note", () => {
    for (const source of SOURCE_DEFINITIONS) {
      if (source.credentialFields.length === 0) continue;
      // Without these the user has no way to know where to get a key or what it costs.
      expect(source.signupUrl, `${source.id} has no signupUrl`).toBeTruthy();
      expect(source.costNote, `${source.id} has no costNote`).toBeTruthy();
    }
  });

  it("marks secret credential fields so they are masked rather than echoed back", () => {
    for (const source of SOURCE_DEFINITIONS) {
      for (const field of source.credentialFields) {
        expect(typeof field.isSecret).toBe("boolean");
        expect(field.label).toBeTruthy();
      }
    }
  });
});
