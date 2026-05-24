"use client";

import { useState } from "react";
import { Loader2, Check, RefreshCw, SkipForward } from "lucide-react";
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
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">
              {item.lead?.firstName} {item.lead?.lastName ?? ""}
            </p>
            <p className="text-sm text-muted-foreground">
              {item.lead?.title ?? "—"} · {item.lead?.company}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            {item.job && (
              <Badge variant="outline" className="text-xs">{item.job.title}</Badge>
            )}
            <Badge variant="secondary" className="text-xs capitalize">
              {item.message.templateUsed?.replace("_", " ") ?? "hiring manager"}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={8}
          className="resize-none font-mono text-sm"
        />
        {isEdited && (
          <p className="text-xs text-muted-foreground mt-1.5">Edited — will be saved as edited version</p>
        )}
      </CardContent>

      <CardFooter className="gap-2 flex-wrap">
        <Button onClick={handleApprove} disabled={isBusy} className="gap-2">
          {approveMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          {isEdited ? "Edit & Approve" : "Approve"}
        </Button>
        <Button variant="outline" onClick={handleRegenerate} disabled={isBusy} className="gap-2">
          {generateMessage.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Regenerate
        </Button>
        <Button variant="ghost" onClick={onNext} disabled={isBusy} className="gap-2">
          <SkipForward className="h-4 w-4" />
          Skip
        </Button>
      </CardFooter>
    </Card>
  );
}
