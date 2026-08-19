import { describe, expect, it } from "vitest";
import { dedupeParsedLeads, parseLeadList } from "./parse-lead-list";

describe("parseLeadList", () => {
  it("reads the common 'name — phone' shape", () => {
    const { leads } = parseLeadList("Cairo Engineering Co — +20 2 2620 3507");

    expect(leads[0].name).toBe("Cairo Engineering Co");
    expect(leads[0].phone).toBe("+20 2 2620 3507");
  });

  it.each([
    ["Acme Prints, 01112124913", "Acme Prints", "01112124913"],
    ["Acme Prints | 01112124913", "Acme Prints", "01112124913"],
    ["Acme Prints: 0235699066", "Acme Prints", "0235699066"],
    ["01112124913 Acme Prints", "Acme Prints", "01112124913"],
  ])("handles %s", (input, name, phone) => {
    const { leads } = parseLeadList(input);
    expect(leads[0].name).toBe(name);
    expect(leads[0].phone).toBe(phone);
  });

  it("reads Arabic business names", () => {
    const { leads } = parseLeadList("مكتبة بكير للطباعة الهندسية - 0225211040");

    expect(leads[0].name).toBe("مكتبة بكير للطباعة الهندسية");
    expect(leads[0].phone).toBe("0225211040");
  });

  it("keeps a business that has no phone number", () => {
    const { leads, problems } = parseLeadList("Nile Consulting Engineers");

    expect(leads[0]).toMatchObject({ name: "Nile Consulting Engineers", phone: null });
    expect(problems).toHaveLength(0);
  });

  // A name containing a number must not be eaten as a phone number.
  it.each(["3M Egypt", "Group 4 Contracting", "Studio 11"])("does not mistake %s for a phone", (name) => {
    const { leads } = parseLeadList(name);
    expect(leads[0].name).toBe(name);
    expect(leads[0].phone).toBeNull();
  });

  it("splits spreadsheet columns on tabs", () => {
    const { leads } = parseLeadList("Delta Repro\t0235699066\t12 Nile St, Giza");

    expect(leads[0].name).toBe("Delta Repro");
    expect(leads[0].phone).toBe("0235699066");
    expect(leads[0].notes).toBe("12 Nile St, Giza");
  });

  it("ignores blank lines rather than calling them mistakes", () => {
    const { leads, problems } = parseLeadList("Acme\n\n\nBeta\n   \n");

    expect(leads).toHaveLength(2);
    expect(problems).toHaveLength(0);
  });

  // One unreadable line out of sixty must not cost the other fifty-nine.
  it("reports a bad line and keeps the rest", () => {
    const { leads, problems } = parseLeadList("Good Co — 0225211040\n0111\nAnother Co");

    expect(leads.map((lead) => lead.name)).toEqual(["Good Co", "0111", "Another Co"]);
    expect(problems).toHaveLength(0);
  });

  it("flags a line that is only a phone number", () => {
    const { leads, problems } = parseLeadList("+20 2 2620 3507");

    expect(leads).toHaveLength(0);
    expect(problems[0]).toMatchObject({ line: 1, reason: "a phone number with no business name" });
  });

  it("keeps the line number so a problem can be found in the paste", () => {
    const { problems } = parseLeadList("Acme — 0225211040\n\n+20 2 2620 3507");
    expect(problems[0].line).toBe(3);
  });

  it("reads a realistic paste end to end", () => {
    const { leads, problems } = parseLeadList(
      [
        "مكتبة بكير | +20 225211040",
        "AMECO - Arab Medical Equipment Co. — +20 2 26203507",
        "Delta Repro\t0235699066\tGiza",
        "Nile Drawing Supplies",
        "",
      ].join("\n"),
    );

    expect(leads).toHaveLength(4);
    expect(problems).toHaveLength(0);
    expect(leads[3]).toMatchObject({ name: "Nile Drawing Supplies", phone: null });
  });
});

describe("dedupeParsedLeads", () => {
  // Copying from a map easily catches the same listing twice.
  it("keeps the first of a repeated business", () => {
    const { leads } = parseLeadList("Acme — 0225211040\nAcme — 0225211040\nBeta — 0111111111");

    expect(dedupeParsedLeads(leads)).toHaveLength(2);
  });

  it("ignores case and spacing when comparing", () => {
    const { leads } = parseLeadList("Acme  Prints — 0225211040\nacme prints — 0225211040");

    expect(dedupeParsedLeads(leads)).toHaveLength(1);
  });

  it("treats the same name with different numbers as two businesses", () => {
    const { leads } = parseLeadList("Acme — 0225211040\nAcme — 0235699066");

    expect(dedupeParsedLeads(leads)).toHaveLength(2);
  });
});
