"use client";

import { useRouter } from "next/navigation";
import { Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateLead } from "@/hooks/leads/useUpdateLead";
import { formatRelativeDate } from "@/utils/format-relative-date";
import type { Lead } from "@/types/lead";
import type { LeadStatus } from "@/leads/leads.validators";

interface LeadKanbanCardProps {
  lead: Lead;
  index: number;
}

const NEXT_STATUS: Partial<Record<LeadStatus, LeadStatus>> = {
  message_sent: "reply_received",
  reply_received: "call_scheduled",
  call_scheduled: "interview",
  interview: "offer",
};

const QUICK_ACTION_LABEL: Partial<Record<LeadStatus, string>> = {
  not_contacted: "Send Message",
  message_sent: "Mark Reply",
  reply_received: "Schedule Call",
  call_scheduled: "Mark Interview",
  interview: "Mark Offer",
};

export default function LeadKanbanCard({ lead, index }: LeadKanbanCardProps) {
  const router = useRouter();
  const updateLead = useUpdateLead();

  const status = lead.status ?? "not_contacted";
  const actionLabel = QUICK_ACTION_LABEL[status];
  const nextStatus = NEXT_STATUS[status];

  function handleQuickAction() {
    if (status === "not_contacted") {
      router.push("/messages");
      return;
    }
    if (nextStatus) {
      updateLead.mutate({ id: lead.id, status: nextStatus });
    }
  }

  const isUpdating = updateLead.isPending && updateLead.variables?.id === lead.id;

  return (
    <Draggable draggableId={lead.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          <Card
            className={`cursor-grab active:cursor-grabbing transition-shadow ${
              snapshot.isDragging ? "shadow-lg ring-1 ring-primary/20" : ""
            }`}
          >
            <CardContent className="p-3 space-y-2">
              <div>
                <p className="font-medium text-sm leading-snug">
                  {lead.firstName} {lead.lastName ?? ""}
                </p>
                <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
              </div>

              <p className="text-xs text-muted-foreground">
                {formatRelativeDate(lead.lastContactedAt)}
              </p>

              {actionLabel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs"
                  onClick={handleQuickAction}
                  disabled={isUpdating}
                >
                  {isUpdating ? <Loader2 className="h-3 w-3 animate-spin" /> : actionLabel}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </Draggable>
  );
}
