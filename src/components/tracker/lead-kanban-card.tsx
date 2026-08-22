"use client";

import { useRouter } from "next/navigation";
import { Draggable } from "@hello-pangea/dnd";
import { Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  not_contacted: "Send message",
  message_sent: "Mark reply",
  reply_received: "Schedule call",
  call_scheduled: "Mark interview",
  interview: "Mark offer",
};

function getInitials(firstName: string, lastName?: string | null) {
  return `${firstName[0] ?? ""}${lastName?.[0] ?? ""}`.toUpperCase();
}

export default function LeadKanbanCard({ lead, index }: LeadKanbanCardProps) {
  const router = useRouter();
  const updateLead = useUpdateLead();

  const status = lead.status ?? "not_contacted";
  const actionLabel = QUICK_ACTION_LABEL[status];
  const nextStatus = NEXT_STATUS[status];
  const leadName = `${lead.firstName} ${lead.lastName ?? ""}`.trim();

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
          // The drag handle is the whole card, and it's focusable — so it needs
          // to say what it is and what dragging it will do.
          aria-label={`${leadName}, ${lead.company}. Drag to change status.`}
        >
          <Card
            className={`cursor-grab active:cursor-grabbing transition-all rounded-lg ${
              snapshot.isDragging ? "shadow-lg ring-1 ring-primary/30 rotate-1" : "hover:shadow-sm"
            }`}
          >
            <CardContent className="p-3 space-y-2.5">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-xs font-semibold text-primary" aria-hidden>
                    {getInitials(lead.firstName, lead.lastName)}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm leading-snug truncate">{leadName}</p>
                  <p className="text-xs text-muted-foreground truncate">{lead.company}</p>
                </div>
              </div>

              {/* Their role was already on the lead and never shown here — it's
                  most of what tells two contacts at one company apart. */}
              {lead.title && (
                <p className="text-xs text-muted-foreground truncate">{lead.title}</p>
              )}

              {lead.lastContactedAt && (
                <p className="text-xs text-muted-foreground">
                  Last contact {formatRelativeDate(lead.lastContactedAt)}
                </p>
              )}

              {actionLabel && (
                <Button
                  size="sm"
                  variant="outline"
                  className="w-full h-7 text-xs font-medium"
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
