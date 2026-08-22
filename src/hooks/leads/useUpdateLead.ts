"use client";

import { useQueryClient } from "@tanstack/react-query";
import { getQueryKey } from "@trpc/react-query";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc-client";
import type { Lead } from "@/types/lead";

/**
 * Updates one lead, and moves it on screen before the server agrees.
 *
 * Dragging a card between kanban columns had no optimistic write, so it snapped
 * back to the column it came from and arrived in the new one a round trip later.
 * That reads as "the drag didn't take" — and the natural response is to drag it
 * again. The rollback in `onError` is what makes moving first safe.
 */
export function useUpdateLead() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient();

  // Every bucket filter is its own cache entry and the board can be reached
  // under any of them, so the patch goes to all of `leads.getAll` rather than to
  // one exact input.
  const leadsQueryKey = getQueryKey(trpc.leads.getAll, undefined, "query");

  return trpc.leads.update.useMutation({
    onMutate: async (updatedFields) => {
      // Stop an in-flight fetch from landing on top of the optimistic write.
      await queryClient.cancelQueries({ queryKey: leadsQueryKey });

      const previousLists = queryClient.getQueriesData<Lead[]>({ queryKey: leadsQueryKey });

      queryClient.setQueriesData<Lead[]>({ queryKey: leadsQueryKey }, (leads) =>
        leads?.map((lead) =>
          lead.id === updatedFields.id
            ? // Only `status` is patched. The other fields of an update arrive as
              // strings and are stored as dates, and guessing at that conversion
              // to save one round trip is not worth being wrong about.
              { ...lead, status: updatedFields.status ?? lead.status }
            : lead,
        ),
      );

      return { previousLists };
    },

    onError: (error, _updatedFields, context) => {
      for (const [queryKey, data] of context?.previousLists ?? []) {
        queryClient.setQueryData(queryKey, data);
      }
      toast.error(error.message || "Couldn't update that lead.");
    },

    // Runs after success and after a rollback, so the server always gets the
    // last word on what the row actually says.
    onSettled: () => {
      utils.leads.getAll.invalidate();
      utils.leads.getOverdueFollowUps.invalidate();
      utils.leads.getRecentActivity.invalidate();
    },
  });
}
