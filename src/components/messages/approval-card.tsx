"use client";

import { useState } from "react";
import { Loader2, Check, RefreshCw, SkipForward, Keyboard } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useApproveMessage } from "@/hooks/messages/useApproveMessage";
import { useGenerateMessage } from "@/hooks/messages/useGenerateMessage";
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

  async function handleApprove() {
    await approveMessage.mutateAsync({
      messageId: item.message.id,
      editedBody: isEdited ? body : undefined,
    });
    onNext();
  }

  async function handleRegenerate() {
    if (!item.lead) return;
    await generateMessage.mutateAsync({
      leadId: item.lead.id,
      template: (item.message.templateUsed as "hiring_manager" | "recruiter" | "referral") ?? "hiring_manager",
    });
    onNext();
  }

  const isBusy = approveMessage.isPending || generateMessage.isPending;

  return (
    <Card className="w-full max-w-2xl rounded-xl shadow-sm">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-semibold text-primary">
                {(item.lead?.firstName?.[0] ?? "?").toUpperCase()}
              </span>
            </div>
            <div>
              <p className="font-semibold text-sm">
                {item.lead?.firstName} {item.lead?.lastName ?? ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {item.lead?.title ?? "—"} · {item.lead?.company}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {item.job && (
              <Badge variant="outline" className="text-xs">{item.job.title}</Badge>
            )}
            <Badge variant="secondary" className="text-xs capitalize">
              {item.message.templateUsed?.replace("_", " ") ?? "hiring manager"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={9}
          className="resize-none font-mono text-sm bg-muted/30"
          placeholder="Message content…"
        />
        {isEdited && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            Edited — will be saved as your version
          </p>
        )}
      </CardContent>

      <CardFooter className="gap-2 flex-wrap border-t border-border pt-3">
        <Button onClick={handleApprove} disabled={isBusy} className="gap-2">
          {approveMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEdited ? "Edit & Approve" : "Approve"}
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
        <div className="ml-auto flex items-center gap-1 text-xs text-muted-foreground hidden sm:flex">
          <Keyboard className="h-3 w-3" />
          <span>Edit directly in the box above</span>
        </div>
      </CardFooter>
    </Card>
  );
}
