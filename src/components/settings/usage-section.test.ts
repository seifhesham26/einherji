import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ usage: vi.fn(), shared: vi.fn() }));
vi.mock("@/hooks/usage/useGetUsage", () => ({ useGetUsage: mocks.usage, useGetSharedAiCapacity: mocks.shared }));
import UsageSection from "./usage-section";

const query = (data: unknown) => ({ data, isLoading: false, isFetching: false, isError: false, refetch: vi.fn() });
const render = () => renderToStaticMarkup(createElement(UsageSection));

describe("allowance display", () => {
  beforeEach(() => {
    mocks.usage.mockReturnValue(query([
      { action: "parse_cv", label: "CV parses", used: 1, remaining: 0, limit: 1 },
      { action: "find_managers", label: "hiring-manager searches", used: 0, remaining: 0, limit: 0 },
    ]));
    mocks.shared.mockReturnValue(query({ used: 2, remaining: 48, limit: 50, paused: false }));
  });

  it("shows personal allowances separately from shared capacity and platform spending", () => {
    const html = render();
    expect(html).toContain("CV parses");
    expect(html).toContain("0 / 1");
    expect(html).toContain("48 remaining / 50");
    expect(html).toContain("$0 / month");
    expect(html).toContain("Paused");
    expect(html).toContain('scope="row"');
  });

  it("shows shared exhaustion while preserving saved-data availability", () => {
    mocks.shared.mockReturnValue(query({ used: 50, remaining: 0, limit: 50, paused: false }));
    expect(render()).toContain("New AI work is unavailable. Saved data remains accessible.");
  });

  it("offers an accessible refresh button on errors", () => {
    mocks.usage.mockReturnValue({ ...query(null), isError: true });
    const html = render();
    expect(html).toContain('role="alert"');
    expect(html).toContain('aria-label="Refresh allowances"');
    expect(html).not.toContain("remaining / 50");
  });

  it("does not present missing loading data as zero remaining", () => {
    mocks.usage.mockReturnValue({ ...query(undefined), isLoading: true, isFetching: true });
    const html = render();
    expect(html).not.toContain("New AI work is unavailable");
    expect(html).toContain("disabled");
  });
});
