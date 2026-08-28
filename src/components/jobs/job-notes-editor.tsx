"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useUpdateJobNotes } from "@/hooks/jobs/useUpdateJobNotes";

interface JobNotesEditorProps {
  jobId: string;
  notes: string | null;
}

/**
 * The one place in the app you can write something down about a job.
 *
 * Explicitly saved rather than saved on blur: the field sits inside a panel that
 * closes on Escape, and an autosave would make every accidental close a silent
 * write.
 *
 * The caller keys this on the job id, so moving to another job remounts it with
 * a fresh draft. That is what replaces the effect that used to reset the draft
 * whenever the id changed — an effect that painted one frame of the previous
 * job's notes before correcting itself.
 */
export default function JobNotesEditor({ jobId, notes }: JobNotesEditorProps) {
  const [draft, setDraft] = useState(notes ?? "");
  const updateNotes = useUpdateJobNotes();

  const hasChanges = draft !== (notes ?? "");

  return (
    <div className="space-y-2">
      <Textarea
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Recruiter's name, the salary they quoted, what to ask about…"
        className="min-h-20 text-xs"
        aria-label="Notes on this job"
      />
      {hasChanges && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setDraft(notes ?? "")}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={updateNotes.isPending}
            onClick={() => updateNotes.mutate({ jobId, notes: draft })}
          >
            {updateNotes.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            )}
            Save note
          </Button>
        </div>
      )}
    </div>
  );
}
