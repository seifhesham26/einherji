import { describe, expect, it } from "vitest";
import { buildDedupeKey } from "./build-dedupe-key";

describe("buildDedupeKey", () => {
  it("matches the same posting syndicated to two boards", () => {
    const remoteok = buildDedupeKey({
      company: "Acme Inc",
      title: "Senior React Developer (Remote)",
      location: "Cairo, Egypt",
    });
    const arbeitnow = buildDedupeKey({
      company: "Acme",
      title: "Senior React Developer",
      location: "Cairo",
    });

    expect(remoteok).toBe(arbeitnow);
  });

  it("ignores the order the board wrote the title in", () => {
    const one = buildDedupeKey({ company: "Acme", title: "Frontend Developer" });
    const other = buildDedupeKey({ company: "Acme", title: "Developer, Frontend" });

    expect(one).toBe(other);
  });

  it("keeps the same title at two employers apart", () => {
    const acme = buildDedupeKey({ company: "Acme", title: "React Developer" });
    const globex = buildDedupeKey({ company: "Globex", title: "React Developer" });

    expect(acme).not.toBe(globex);
  });

  it("keeps one employer's same title in two cities apart", () => {
    // A large company runs the same req in a dozen places. Folding those into one
    // row would hide eleven real openings, which is worse than a duplicate.
    const cairo = buildDedupeKey({ company: "Acme", title: "SDE", location: "Cairo, Egypt" });
    const berlin = buildDedupeKey({ company: "Acme", title: "SDE", location: "Berlin, Germany" });

    expect(cairo).not.toBe(berlin);
  });

  it("keeps two genuinely different roles apart", () => {
    const frontend = buildDedupeKey({ company: "Acme", title: "Frontend Developer" });
    const backend = buildDedupeKey({ company: "Acme", title: "Backend Developer" });

    expect(frontend).not.toBe(backend);
  });

  it("folds legal suffixes written every which way", () => {
    const keys = [
      "Acme",
      "Acme Inc",
      "Acme, Inc.",
      "Acme Ltd",
      "ACME LIMITED",
    ].map((company) => buildDedupeKey({ company, title: "React Developer" }));

    expect(new Set(keys).size).toBe(1);
  });

  it("survives a company name that is nothing but a legal suffix", () => {
    // Falls back to the folded original rather than returning an empty component
    // that would collide with every other company whose name also vanished.
    const group = buildDedupeKey({ company: "Group", title: "React Developer" });
    const holdings = buildDedupeKey({ company: "Holdings", title: "React Developer" });

    expect(group).not.toBe(holdings);
    expect(group).not.toBe(buildDedupeKey({ company: "", title: "React Developer" }));
  });

  it("treats a missing location as its own value, not a wildcard", () => {
    const unknown = buildDedupeKey({ company: "Acme", title: "React Developer" });
    const cairo = buildDedupeKey({ company: "Acme", title: "React Developer", location: "Cairo" });

    expect(unknown).not.toBe(cairo);
  });

  it("folds Arabic written with different letter forms", () => {
    const one = buildDedupeKey({ company: "شركة الهندسية", title: "مهندس مدني" });
    const other = buildDedupeKey({ company: "شركه الهندسيه", title: "مهندس مدني" });

    expect(one).toBe(other);
  });

  it("ignores remote and hybrid decoration in the title", () => {
    const remote = buildDedupeKey({ company: "Acme", title: "React Developer Remote" });
    const plain = buildDedupeKey({ company: "Acme", title: "React Developer" });

    expect(remote).toBe(plain);
  });
});
