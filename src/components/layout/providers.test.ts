import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const mocks = vi.hoisted(() => ({ link: vi.fn(), env: { NEXT_PUBLIC_APP_URL: "https://einherji.example/" } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/lib/env", () => ({ clientEnv: mocks.env }));
vi.mock("@trpc/client", () => ({ httpBatchLink: mocks.link }));
vi.mock("@/lib/trpc-client", () => ({ trpc: {
  createClient: vi.fn(() => ({})),
  Provider: ({ children }: { children: unknown }) => children,
} }));
vi.mock("next-themes", () => ({ ThemeProvider: ({ children }: { children: unknown }) => children }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));
import Providers from "./providers";

describe("client endpoint configuration", () => {
  it.each(["https://einherji.example/", "https://einherji.example", "http://localhost:3000/"])(
    "uses a single root API path for %s", (base) => {
      mocks.env.NEXT_PUBLIC_APP_URL = base;
      mocks.link.mockClear();
      renderToStaticMarkup(createElement(Providers, null, null));
      expect(mocks.link).toHaveBeenCalledWith(expect.objectContaining({ url: new URL("/api/trpc", base).toString() }));
    },
  );
});
