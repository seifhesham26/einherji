"use client";

import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";
import { JOB_DOCUMENT_LABELS } from "@/job-documents/job-documents.validators";

export function useGenerateJobDocument() {
  const utils = trpc.useUtils();

  return trpc.jobDocuments.generate.useMutation({
    onSuccess: ({ kind }) => {
      utils.jobDocuments.getForJob.invalidate();
      utils.usage.getQuotas.invalidate();

      toast.success(`${JOB_DOCUMENT_LABELS[kind]} written`);
    },
    onError: (error) => toast.error(error.message),
  });
}
