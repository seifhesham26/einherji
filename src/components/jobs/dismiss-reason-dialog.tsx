"use client";

import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  JOB_DISMISS_REASON_LABELS,
  OFFERED_DISMISS_REASONS,
  type JobDismissReason,
} from "@/jobs/jobs.validators";

interface DismissReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** What is being dismissed — one job's title, or "12 jobs". */
  target: string;
  onDismiss: (reason?: JobDismissReason) => void;
  isPending?: boolean;
}

/**
 * Asks why, without slowing the answer down.
 *
 * The reason is worth having — it is the only signal the matcher will ever get
 * about what it ranked wrongly — but a dialog that adds a step to the most
 * repeated action on the page would just teach people to stop using `x`.
 *
 * So both paths cost exactly one more key press: a digit picks a reason, Enter
 * dismisses without one. Nobody is made to explain themselves, and the people
 * who will are one keystroke away.
 */
export default function DismissReasonDialog({
  open,
  onOpenChange,
  target,
  onDismiss,
  isPending = false,
}: DismissReasonDialogProps) {
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const index = Number.parseInt(event.key, 10) - 1;
      const reason = OFFERED_DISMISS_REASONS[index];
      if (!reason) return;

      event.preventDefault();
      onDismiss(reason);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onDismiss]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Why dismiss this?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{target}</span> — the answer is kept so
            the ranking can learn what it keeps getting wrong. Skipping is fine.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {OFFERED_DISMISS_REASONS.map((reason, index) => (
            <Button
              key={reason}
              variant="outline"
              size="sm"
              disabled={isPending}
              onClick={() => onDismiss(reason)}
              className="justify-start gap-2"
            >
              <kbd className="rounded border bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                {index + 1}
              </kbd>
              {JOB_DISMISS_REASON_LABELS[reason]}
            </Button>
          ))}
        </div>

        {/* Autofocused, so Enter — the key already under the user's finger —
            takes the no-reason path without a second decision. */}
        <Button
          size="sm"
          autoFocus
          disabled={isPending}
          onClick={() => onDismiss(undefined)}
          className="w-full"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
          Dismiss without a reason
          <kbd className="ml-auto rounded border border-primary-foreground/30 px-1 text-[10px] font-medium">
            Enter
          </kbd>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
