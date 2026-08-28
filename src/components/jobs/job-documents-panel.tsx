"use client";

import { useState } from "react";
import { Copy, FileText, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGetJobDocuments } from "@/hooks/job-documents/useGetJobDocuments";
import { useGenerateJobDocument } from "@/hooks/job-documents/useGenerateJobDocument";
import { useDeleteJobDocument } from "@/hooks/job-documents/useDeleteJobDocument";
import { formatRelativeDate } from "@/utils/format-relative-date";
import {
  JOB_DOCUMENT_DESCRIPTIONS,
  JOB_DOCUMENT_LABELS,
  KINDS_NEEDING_A_PROMPT,
  jobDocumentKindValues,
  type JobDocumentKind,
} from "@/job-documents/job-documents.validators";

/**
 * The four things you'd otherwise write by hand for every application.
 *
 * Each is one button. The answer is stored rather than shown and thrown away,
 * because the value of a cover letter is that it's there tomorrow when you
 * finally sit down to send the application.
 */
export default function JobDocumentsPanel({ jobId }: { jobId: string }) {
  const [openKind, setOpenKind] = useState<JobDocumentKind | null>(null);
  const [question, setQuestion] = useState("");

  const { data: documents, isLoading } = useGetJobDocuments(jobId);
  const generateDocument = useGenerateJobDocument();
  const deleteDocument = useDeleteJobDocument();

  function generate(kind: JobDocumentKind) {
    // The one kind that needs something from the user first. Opening the field
    // rather than generating is what stops the model answering a blank question.
    if (KINDS_NEEDING_A_PROMPT.includes(kind) && openKind !== kind) {
      setOpenKind(kind);
      return;
    }

    generateDocument.mutate(
      { jobId, kind, prompt: question.trim() || undefined },
      {
        onSuccess: () => {
          setOpenKind(null);
          setQuestion("");
        },
      },
    );
  }

  const pendingKind = generateDocument.isPending ? generateDocument.variables?.kind : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {jobDocumentKindValues.map((kind) => (
          <Button
            key={kind}
            size="sm"
            variant="outline"
            disabled={generateDocument.isPending}
            onClick={() => generate(kind)}
            title={JOB_DOCUMENT_DESCRIPTIONS[kind]}
          >
            {pendingKind === kind ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FileText className="h-3.5 w-3.5" aria-hidden />
            )}
            {JOB_DOCUMENT_LABELS[kind]}
          </Button>
        ))}
      </div>

      {openKind && (
        <div className="space-y-2 rounded-lg border p-3">
          <label htmlFor="application-question" className="text-xs font-medium">
            Paste the question from the application form
          </label>
          <Textarea
            id="application-question"
            value={question}
            autoFocus
            placeholder="Why do you want to work here?"
            className="min-h-16 text-xs"
            onChange={(event) => setQuestion(event.target.value)}
          />
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOpenKind(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={generateDocument.isPending || question.trim().length === 0}
              onClick={() => generate(openKind)}
            >
              {generateDocument.isPending && (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              )}
              Write it
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <Skeleton className="h-20 w-full rounded-lg" />
      ) : documents && documents.length > 0 ? (
        <ul className="space-y-2">
          {documents.map((document) => (
            <li key={document.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-[10px] font-normal">
                  {JOB_DOCUMENT_LABELS[document.kind]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">
                  {formatRelativeDate(document.createdAt)}
                </span>

                <div className="ml-auto flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => copyToClipboard(document.body)}
                    aria-label="Copy this document"
                    title="Copy"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={deleteDocument.isPending}
                    onClick={() => deleteDocument.mutate({ id: document.id })}
                    aria-label="Delete this document"
                    title="Delete"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden />
                  </Button>
                </div>
              </div>

              {/* The question, when there was one — an answer with the question
                  scrolled away is an answer you can't check. */}
              {document.prompt && (
                <p className="text-[11px] italic text-muted-foreground">{document.prompt}</p>
              )}

              <p className="max-h-64 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed">
                {document.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted-foreground">
          Nothing written yet. A fit report first makes the letter better — it works out which
          parts of your CV answer this posting, and the letter leads with them.
        </p>
      )}
    </div>
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied");
  } catch {
    // Blocked without a secure context or a user gesture the browser trusts.
    // Saying so beats a button that silently does nothing.
    toast.error("Your browser blocked the copy — select the text and copy it manually.");
  }
}
