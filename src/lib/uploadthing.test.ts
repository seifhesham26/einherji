import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRouteHandler } from "uploadthing/next";
import { NextRequest } from "next/server";

const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock("@/lib/auth", () => ({ auth: { api: { getSession } } }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

import { ourFileRouter } from "./uploadthing";

const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
  config: {
    token: Buffer.from(JSON.stringify({ apiKey: "sk_test", appId: "test", regions: ["iad1"] })).toString("base64"),
    logLevel: "None",
  },
});

describe("UploadThing dependency compatibility", () => {
  beforeEach(() => { vi.resetAllMocks(); });

  it("exposes the existing one-PDF upload configuration", async () => {
    const response = await GET(new NextRequest("http://localhost/api/uploadthing"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: "cvUploader", config: expect.objectContaining({
        pdf: expect.objectContaining({ maxFileSize: "8MB", maxFileCount: 1 }),
      }) }),
    ]));
  });

  it("still runs authentication before making an outbound upload request", async () => {
    getSession.mockResolvedValue(null);
    const fetch = vi.fn(() => { throw new Error("Unexpected outbound upload request"); });
    vi.stubGlobal("fetch", fetch);
    try {
      const response = await POST(new NextRequest("http://localhost/api/uploadthing?slug=cvUploader&actionType=upload", {
        method: "POST",
        headers: { "content-type": "application/json", "x-uploadthing-package": "@uploadthing/react" },
        body: JSON.stringify({ files: [{ name: "cv.pdf", size: 100, type: "application/pdf" }], input: null }),
      }));
      expect(response.ok).toBe(false);
      expect(getSession).toHaveBeenCalledOnce();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
