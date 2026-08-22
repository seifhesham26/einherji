"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, RefreshCw, SkipForward } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApproveMessage } from "@/hooks/messages/useApproveMessage";
import { useGenerateMessage } from "@/hooks/messages/useGenerateMessage";
import { TEMPLATE_LABELS, type MessageTemplate } from "@/messages/messages.validators";
import type { MessageWithContext } from "@/types/message";

interface ApprovalCardProps {
  item: MessageWithContext;
  onNext: () => void;
}

export default function ApprovalCard({ item, onNext }: ApprovalCardProps) {
  const [body, setBody] = useState(item.message.body);
  const approveMessage = useApproveMessage();
  const generateMessage = useGenerateMessage();

  const isEdited = body !== item.message.body;
  const isBusy = approveMessage.isPending || generateMessage.isPending;

  // Written before the two business templates existed, or by a build that didn't
  // know them — fall back to the raw value rather than rendering "undefined".
  const templateUsed = (item.message.templateUsed ?? null) as MessageTemplate | null;
  const templateLabel = templateUsed
    ? (TEMPLATE_LABELS[templateUsed] ?? templateUsed.replace(/_/g, " "))
    : "Hiring manager";

  async function handleApprove() {
    try {
      await approveMessage.mutateAsync({
        messageId: item.message.id,
        editedBody: isEdited ? body : undefined,
      });
      onNext();
    } catch {
      // The mutation toasts; staying on the card lets the user retry rather than
      // advancing past a draft that was never actually approved.
    }
  }

  async function handleRegenerate() {
    if (!item.lead) return;
    // Reuse whatever this draft was written as. Passing nothing would let the
    // server re-derive it from the bucket, which is right for a first draft but
    // would silently switch template under someone regenerating a deliberate one.
    try {
      await generateMessage.mutateAsync({
        leadId: item.lead.id,
        template: templateUsed ?? undefined,
      });
      onNext();
    } catch {
      // Same reasoning as approve: don't advance past work that didn't happen.
    }
  }

  // Reviewing a queue is a repetitive two-second decision per card, and reaching
  // for the mouse each time is most of the cost. The footer already advertised
  // shortcuts with a keyboard icon; there were none. Held off while focus is in
  // the textarea, where every letter is text the user is typing.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (isBusy || event.metaKey || event.ctrlKey || event.altKey) return;

      const target = event.target as HTMLElement | null;
      if (target?.tagName === "TEXTAREA" || target?.tagName === "INPUT") return;

      if (event.key === "a" || event.key === "A") {
        event.preventDefault();
        void handleApprove();
      } else if (event.key === "r" || event.key === "R") {
        event.preventDefault();
        void handleRegenerate();
      } else if (event.key === "s" || event.key === "S") {
        event.preventDefault();
        onNext();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  return (
    <Card className="w-full max-w-2xl rounded-xl shadow-sm">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary" aria-hidden>
                {(item.lead?.firstName?.[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">
                {item.lead?.firstName} {item.lead?.lastName ?? ""}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {item.lead?.title ?? "—"} · {item.lead?.company}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {item.job && (
              <Badge variant="outline" className="text-xs max-w-[14rem] truncate">
                {item.job.title}
              </Badge>
            )}
            <Badge variant="secondary" className="text-xs">
              {templateLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <label htmlFor="message-body" className="sr-only">
          Message to {item.lead?.firstName ?? "this contact"}
        </label>
        <Textarea
          id="message-body"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          rows={9}
          className="resize-y font-mono text-sm bg-muted/30"
          placeholder="Message content…"
        />
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {isEdited ? (
            <p className="text-xs text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" aria-hidden />
              Edited — will be saved as your version
            </p>
          ) : (
            <span />
          )}
          <p className="text-xs text-muted-foreground tabular-nums">
            {body.length} characters
          </p>
        </div>
      </CardContent>

      <CardFooter className="gap-2 flex-wrap border-t border-border pt-3">
        <Button onClick={handleApprove} disabled={isBusy} className="gap-2">
          {approveMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {isEdited ? "Edit & approve" : "Approve"}
        </Button>
        <Button variant="outline" onClick={handleRegenerate} disabled={isBusy} className="gap-2">
          {generateMessage.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          Regenerate
        </Button>
        <Button variant="ghost" onClick={onNext} disabled={isBusy} className="gap-2">
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>

        {/* Was `hidden sm:flex` alongside `flex` — two display utilities in one
            class list, resolved by stylesheet order rather than intent. */}
        <div className="ml-auto hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
          <Shortcut keyLabel="A" action="approve" />
          <Shortcut keyLabel="R" action="regenerate" />
          <Shortcut keyLabel="S" action="skip" />
        </div>
      </CardFooter>
    </Card>
  );
}

function Shortcut({ keyLabel, action }: { keyLabel: string; action: string }) {
  return (
    <span className="flex items-center gap-1">
      <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium">
        {keyLabel}
      </kbd>
      {action}
    </span>
  );
}
