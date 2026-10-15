"use client";

import { Droppable } from "@hello-pangea/dnd";
import LeadKanbanCard from "./lead-kanban-card";
import { getLeadStatusDisplay } from "@/components/leads/lead-status-display";
import type { Lead } from "@/types/lead";

interface KanbanColumnProps {
  columnId: string;
  title: string;
  leads: Lead[];
}

export default function KanbanColumn({ columnId, title, leads }: KanbanColumnProps) {
  const status = getLeadStatusDisplay(columnId);

  return (
    <div className="flex flex-col gap-2 min-w-[220px] w-[220px]">
      {/* Sticky, because the board scrolls vertically inside a page that also
          scrolls — past the first few cards you could no longer tell which
          column you were looking at. */}
      <div className="sticky top-0 z-10 flex items-center gap-2 rounded-lg bg-card/85 border border-sky-100/80 dark:border-sky-900/40 px-2.5 py-1.5 backdrop-blur-md shadow-2xs">
        <span className={`h-2 w-2 rounded-full shrink-0 ${status.dot}`} aria-hidden />
        <h2 className={`text-sm font-semibold truncate flex-1 text-slate-900 dark:text-slate-100`}>{title}</h2>
        <span className="console-mono text-[11px] text-sky-700 dark:text-sky-300 font-bold tabular-nums ml-auto shrink-0 bg-sky-50 dark:bg-sky-950/80 border border-sky-200/80 dark:border-sky-800/80 rounded-full px-2 py-0.5 shadow-2xs">
          {leads.length}
        </span>
      </div>

      <Droppable droppableId={columnId}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex flex-col gap-2.5 rounded-xl p-2 min-h-[160px] border border-sky-100/60 dark:border-sky-900/30 transition-colors ${
              snapshot.isDraggingOver ? "bg-sky-50/80 dark:bg-sky-950/60 ring-2 ring-sky-400/80 shadow-[0_0_12px_rgba(14,165,233,0.2)]" : "bg-sky-50/20 dark:bg-sky-950/20"
            }`}
          >
            {leads.map((lead, index) => (
              <LeadKanbanCard key={lead.id} lead={lead} index={index} />
            ))}
            {provided.placeholder}

            {/* An empty column was a blank grey rectangle with no hint that it
                was a drop target. */}
            {leads.length === 0 && !snapshot.isDraggingOver && (
              <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                Drop a contact here
              </p>
            )}
          </div>
        )}
      </Droppable>
    </div>
  );
}
