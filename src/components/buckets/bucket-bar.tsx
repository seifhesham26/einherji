"use client";

import { useState } from "react";
import { Briefcase, Loader2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BucketFormDialog, { type BucketListItem } from "./bucket-form-dialog";
import { useGetBuckets } from "@/hooks/buckets/useGetBuckets";
import { useDeleteBucket } from "@/hooks/buckets/useDeleteBucket";
import { BUCKET_KIND_PRESETS, type BucketKind } from "@/buckets/buckets.validators";

interface BucketBarProps {
  selectedBucketId: string | null;
  onSelect: (bucketId: string | null) => void;
  /** What the counts on each bucket refer to on this page. */
  countBy?: "jobs" | "leads";
}

/**
 * Switches between separate hunts.
 *
 * One account runs several unrelated searches — a job hunt, client prospecting,
 * a supplier list — and they can't share a keyword set. Each bucket owns its own
 * keywords, places, sources and pitch, and only shows what it found.
 *
 * Shared by Jobs, Leads and Tracker, so the same selection means the same thing
 * everywhere: filing a supplier under a bucket is pointless if the pages that
 * list contacts can't filter by it.
 */
export default function BucketBar({
  selectedBucketId,
  onSelect,
  countBy = "jobs",
}: BucketBarProps) {
  const { data: buckets = [], isLoading } = useGetBuckets();
  const deleteBucket = useDeleteBucket();

  const [isCreating, setIsCreating] = useState(false);
  const [editing, setEditing] = useState<BucketListItem | null>(null);
  const [pendingDelete, setPendingDelete] = useState<BucketListItem | null>(null);

  if (isLoading) return <div className="h-9 w-full rounded-md bg-muted/40 animate-pulse" />;

  const selected = buckets.find((bucket) => bucket.id === selectedBucketId) ?? null;
  const preset = selected ? BUCKET_KIND_PRESETS[selected.kind as BucketKind] : null;
  const countNoun = countBy === "leads" ? "contact" : "job";

  return (
    <div className="space-y-3">
      {/* One scrolling row rather than a wrapping block. Bucket names are as long
          as the user makes them ("Paper factory — Cairo & Giza"), and four of
          those wrapped to three rows that pushed the page content down. */}
      <div
        role="group"
        aria-label="Filter by bucket"
        className="-mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1 scrollbar-thin"
      >
        <Button
          size="sm"
          variant={selectedBucketId === null ? "default" : "outline"}
          // These are filter states, not commands. Announcing which one is on is
          // the only way the selection exists for a screen reader — the visual
          // cue is a filled background.
          aria-pressed={selectedBucketId === null}
          onClick={() => onSelect(null)}
        >
          All
        </Button>

        {buckets.map((bucket) => {
          const count = countBy === "leads" ? bucket.leadCount : bucket.jobCount;

          return (
            <Button
              key={bucket.id}
              size="sm"
              variant={bucket.id === selectedBucketId ? "default" : "outline"}
              aria-pressed={bucket.id === selectedBucketId}
              onClick={() => onSelect(bucket.id)}
              className="gap-2"
            >
              <span className="max-w-[14rem] truncate">{bucket.name}</span>
              <Badge variant="secondary" className="text-[10px] tabular-nums">
                {count}
                <span className="sr-only">
                  {" "}
                  {countNoun}
                  {count === 1 ? "" : "s"}
                </span>
              </Badge>
            </Button>
          );
        })}

        <Button
          size="sm"
          variant="ghost"
          className="gap-2 shrink-0"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="h-4 w-4" aria-hidden />
          New bucket
        </Button>
      </div>

      {selected && preset && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
          <div className="min-w-0 space-y-1 text-xs text-muted-foreground">
            <p>
              <span className="font-medium text-foreground">{preset.label}</span>
              {selected.keywords.length > 0 && <> · {selected.keywords.join(", ")}</>}
              {selected.locations.length > 0 && <> · {selected.locations.join(", ")}</>}
            </p>

            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center gap-1">
                <Briefcase className="h-3 w-3" />
                {selected.jobCount} job{selected.jobCount === 1 ? "" : "s"}
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {selected.leadCount} contact{selected.leadCount === 1 ? "" : "s"}
              </span>
              <span>
                {selected.sources.length > 0
                  ? `${selected.sources.length} source${selected.sources.length === 1 ? "" : "s"}`
                  : "hand-built list"}
              </span>
            </p>

            {/* The pitch is what every message for this bucket is written from,
                so its absence is worth saying out loud rather than discovering
                at generation time. */}
            {!selected.pitch && (
              <p className="text-amber-600 dark:text-amber-400">
                No pitch yet — messages for this bucket can&apos;t be written until you add one.
              </p>
            )}
            {selected.sources.length === 0 && preset.note && (
              <p className="text-amber-600 dark:text-amber-400">{preset.note}</p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => setEditing(selected)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="gap-2"
              disabled={deleteBucket.isPending}
              onClick={() => setPendingDelete(selected)}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Mounted only while open, so each opening starts from the bucket's
          current values rather than from whatever was last typed. */}
      {isCreating && (
        <BucketFormDialog onClose={() => setIsCreating(false)} onSaved={onSelect} />
      )}

      {editing && <BucketFormDialog bucket={editing} onClose={() => setEditing(null)} />}

      <DeleteBucketDialog
        bucket={pendingDelete}
        isDeleting={deleteBucket.isPending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={(bucketId) => {
          onSelect(null);
          setPendingDelete(null);
          deleteBucket.mutate({ id: bucketId });
        }}
      />
    </div>
  );
}

/**
 * Confirms a delete, and says exactly what goes.
 *
 * Deleting used to fire on a single click with no prompt, while the foreign key
 * cascaded through contacts and their messages — one misclick could take a
 * hand-built list of two hundred suppliers. The cascade is fixed (migration
 * 0011); the confirmation is here because a destructive action still shouldn't be
 * one click away from a filter button.
 */
function DeleteBucketDialog({
  bucket,
  isDeleting,
  onCancel,
  onConfirm,
}: {
  bucket: BucketListItem | null;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: (bucketId: string) => void;
}) {
  return (
    <Dialog open={bucket !== null} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Delete &quot;{bucket?.name}&quot;?</DialogTitle>
          <DialogDescription>This can&apos;t be undone.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2 text-sm text-muted-foreground">
          <p>
            Its {bucket?.jobCount ?? 0} job listing{bucket?.jobCount === 1 ? "" : "s"} will be
            deleted. You can find them again by scraping.
          </p>
          <p>
            Its {bucket?.leadCount ?? 0} contact{bucket?.leadCount === 1 ? "" : "s"} will be kept,
            along with their messages — they move to the unfiled list.
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onCancel} disabled={isDeleting}>
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="gap-2"
            disabled={isDeleting || !bucket}
            onClick={() => bucket && onConfirm(bucket.id)}
          >
            {isDeleting && <Loader2 className="h-4 w-4 animate-spin" />}
            Delete bucket
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
