import { createUploadthing, type FileRouter } from "uploadthing/next";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";

const f = createUploadthing();

export const ourFileRouter = {
  cvUploader: f({ pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(async () => {
      const session = await auth.api.getSession({ headers: await headers() });
      if (!session) throw new Error("Unauthorized");
      return { userId: session.user.id };
    })
    .onUploadComplete(async ({ file }) => {
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
