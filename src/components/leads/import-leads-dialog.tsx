"use client";

import { useMemo, useState } from "react";
import { ClipboardPaste, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc-client";
import { useGetBuckets } from "@/hooks/buckets/useGetBuckets";
import { dedupeParsedLeads, parseLeadList } from "@/leads/parse-lead-list";

const MAX_PER_IMPORT = 200;
const PREVIEW_ROWS = 8;

/**
 * Bulk-adds businesses from a pasted list.
 *
 * Building a prospect list by hand is the working route — no free API has usable
 * coverage for Egyptian trades, and the ones that do prohibit automated
 * collection. So the bottleneck isn't finding businesses, it's typing them in
 * one at a time. This takes whatever was copied out of a map or a directory.
 *
 * The preview matters: pasted data is messy, and seeing how 60 rows parsed
 * *before* importing is what stops a bad separator turning into 60 bad contacts.
 */
export default function ImportLeadsDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [text, setText] = useState("");
  const [bucketId, setBucketId] = useState<string>("");

  const { data: buckets = [] } = useGetBuckets();
  const utils = trpc.useUtils();

  const importLeads = trpc.leads.createMany.useMutation({
    onSuccess: (result) => {
      utils.leads.getAll.invalidate();

      const parts = [`Added ${result.created}`];
      if (result.duplicates.length) parts.push(`${result.duplicates.length} already there`);
      if (result.failed.length) parts.push(`${result.failed.length} failed`);
      toast.success(parts.join(" · "));

      if (result.failed.length === 0) {
        setText("");
        setIsOpen(false);
      }
    },
    onError: (error) => toast.error(error.message ?? "Import failed."),
  });

  // Re-parsed as they type, so the preview always matches what would be imported.
  const parsed = useMemo(() => {
    const { leads, problems } = parseLeadList(text);
    return { leads: dedupeParsedLeads(leads), problems };
  }, [text]);

  const tooMany = parsed.leads.length > MAX_PER_IMPORT;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button size="sm" variant="outline" className="gap-2" onClick={() => setIsOpen(true)}>
        <ClipboardPaste className="h-4 w-4" />
        Import list
      </Button>

      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import a list of businesses</DialogTitle>
          <DialogDescription>
            Paste one business per line. Names and phone numbers are picked out
            automatically, whatever separator you used.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="importText">Paste here</Label>
          <Textarea
            id="importText"
            rows={8}
            className="font-mono text-sm resize-none"
            placeholder={"مكتبة بكير — 0225211040\nDelta Repro, 0235699066\nNile Drawing Supplies"}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </div>

        {buckets.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="importBucket">Add to bucket</Label>
            <select
              id="importBucket"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
              value={bucketId}
              onChange={(event) => setBucketId(event.target.value)}
            >
              <option value="">No bucket</option>
              {buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Keeps these separate from your other contacts.
            </p>
          </div>
        )}

        {parsed.leads.length > 0 && (
          <div className="rounded-lg border border-border p-3 space-y-2">
            <p className="text-sm font-medium">
              {parsed.leads.length} business{parsed.leads.length === 1 ? "" : "es"} ready
              {parsed.leads.filter((lead) => lead.phone).length > 0 && (
                <span className="text-muted-foreground font-normal">
                  {" "}· {parsed.leads.filter((lead) => lead.phone).length} with a phone number
                </span>
              )}
            </p>

            <div className="max-h-40 overflow-y-auto text-xs">
              {parsed.leads.slice(0, PREVIEW_ROWS).map((lead) => (
                <div key={lead.line} className="flex justify-between gap-3 py-0.5">
                  <span className="truncate">{lead.name}</span>
                  <span className="text-muted-foreground shrink-0 font-mono">
                    {lead.phone ?? "—"}
                  </span>
                </div>
              ))}
              {parsed.leads.length > PREVIEW_ROWS && (
                <p className="text-muted-foreground pt-1">
                  …and {parsed.leads.length - PREVIEW_ROWS} more
                </p>
              )}
            </div>
          </div>
        )}

        {parsed.problems.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
              {parsed.problems.length} line{parsed.problems.length === 1 ? "" : "s"} skipped
            </p>
            <ul className="mt-1 text-xs text-muted-foreground space-y-0.5">
              {parsed.problems.slice(0, 4).map((problem) => (
                <li key={problem.line}>
                  Line {problem.line}: {problem.reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {tooMany && (
          <p className="text-xs text-destructive">
            That&apos;s {parsed.leads.length} businesses — import at most {MAX_PER_IMPORT} at a
            time.
          </p>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setIsOpen(false)} disabled={importLeads.isPending}>
            Cancel
          </Button>
          <Button
            className="gap-2"
            disabled={parsed.leads.length === 0 || tooMany || importLeads.isPending}
            onClick={() =>
              importLeads.mutate({
                bucketId: bucketId || undefined,
                leads: parsed.leads.map((lead) => ({
                  name: lead.name,
                  phone: lead.phone ?? undefined,
                  notes: lead.notes ?? undefined,
                })),
              })
            }
          >
            {importLeads.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Import {parsed.leads.length > 0 ? parsed.leads.length : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
