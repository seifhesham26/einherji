"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TagInput } from "@/components/ui/tag-input";
import BucketSourcePicker from "./bucket-source-picker";
import { useCreateBucket } from "@/hooks/buckets/useCreateBucket";
import { useUpdateBucket } from "@/hooks/buckets/useUpdateBucket";
import {
  BUCKET_KIND_PRESETS,
  bucketKindValues,
  type BucketKind,
} from "@/buckets/buckets.validators";
import type { JobSourceName } from "@/lib/scrapers/job-source.types";
import type { RouterOutputs } from "@/lib/trpc-client";

export type BucketListItem = RouterOutputs["buckets"]["getAll"][number];

interface BucketFormDialogProps {
  onClose: () => void;
  /** Present means edit; absent means create. */
  bucket?: BucketListItem | null;
  onSaved?: (bucketId: string) => void;
}

interface BucketFormState {
  name: string;
  kind: BucketKind;
  keywords: string[];
  locations: string[];
  sources: JobSourceName[];
  pitch: string;
}

function initialForm(bucket: BucketListItem | null | undefined): BucketFormState {
  if (!bucket) {
    return {
      name: "",
      kind: "jobs",
      keywords: [],
      locations: [],
      sources: BUCKET_KIND_PRESETS.jobs.sources as JobSourceName[],
      pitch: "",
    };
  }

  return {
    name: bucket.name,
    kind: bucket.kind as BucketKind,
    keywords: [...bucket.keywords],
    locations: [...bucket.locations],
    sources: bucket.sources as JobSourceName[],
    pitch: bucket.pitch ?? "",
  };
}

/**
 * Creates or edits one hunt.
 *
 * One dialog for both because they're the same eight fields — and because a
 * bucket you can create but never change is a bucket whose sources and pitch are
 * frozen at the moment you first guessed at them. Editing was the missing half:
 * the router and service have always supported it, nothing called them.
 *
 * The caller mounts this only while it's open, so the form seeds itself from
 * `bucket` once and needs no reset effect — a half-typed create can't survive a
 * cancel, and the previous bucket's values can't flash before an effect corrects
 * them.
 */
export default function BucketFormDialog({ onClose, bucket, onSaved }: BucketFormDialogProps) {
  const createBucket = useCreateBucket();
  const updateBucket = useUpdateBucket();
  const isEditing = Boolean(bucket);

  const [form, setForm] = useState<BucketFormState>(() => initialForm(bucket));

  function update<K extends keyof BucketFormState>(key: K, value: BucketFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  /**
   * Changing the kind on a *new* bucket loads that kind's suggested sources.
   * On an existing one it doesn't: silently replacing a source list somebody
   * tuned by hand, because they relabelled the bucket, would be destructive.
   */
  function selectKind(kind: BucketKind) {
    setForm((current) => ({
      ...current,
      kind,
      sources: isEditing
        ? current.sources
        : (BUCKET_KIND_PRESETS[kind].sources as JobSourceName[]),
    }));
  }

  async function handleSave() {
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      keywords: form.keywords,
      locations: form.locations,
      sources: form.sources,
      // "" rather than undefined so clearing the box actually clears the pitch —
      // the service turns a blank one back into null.
      pitch: form.pitch.trim(),
    };

    const saved = bucket
      ? await updateBucket.mutateAsync({ id: bucket.id, ...payload }).catch(() => null)
      : await createBucket.mutateAsync(payload).catch(() => null);

    // The hook toasts the reason — a duplicate name, most often. Keep the dialog
    // open so what was typed isn't lost.
    if (!saved) return;

    onSaved?.(saved.id);
    onClose();
  }

  const isSaving = createBucket.isPending || updateBucket.isPending;
  const preset = BUCKET_KIND_PRESETS[form.kind];

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit "${bucket?.name}"` : "New bucket"}</DialogTitle>
          <DialogDescription>
            A separate hunt with its own keywords, places, sources and pitch.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bucketName">Name</Label>
            <Input
              id="bucketName"
              placeholder="Dad's paper factory"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>What is it for?</Label>
            <div className="grid gap-2">
              {bucketKindValues.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => selectKind(value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    form.kind === value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/40"
                  }`}
                >
                  <p className="text-sm font-medium">{BUCKET_KIND_PRESETS[value].label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {BUCKET_KIND_PRESETS[value].description}
                  </p>
                  {BUCKET_KIND_PRESETS[value].note && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {BUCKET_KIND_PRESETS[value].note}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucketKeywords">Keywords</Label>
            <TagInput
              value={form.keywords}
              onChange={(keywords) => update("keywords", keywords)}
              placeholder="react developer, طباعة هندسية"
            />
            <p className="text-xs text-muted-foreground">
              Enter or comma to add. Arabic works — searches are matched in both scripts.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucketLocations">Locations</Label>
            <TagInput
              value={form.locations}
              onChange={(locations) => update("locations", locations)}
              placeholder="Remote, Cairo"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Sources</Label>
            <BucketSourcePicker
              value={form.sources}
              onChange={(sources) => update("sources", sources)}
            />
            <p className="text-xs text-muted-foreground">
              {form.sources.length === 0
                ? preset.note
                  ? preset.note
                  : "None selected — this bucket is a hand-built list. Add contacts with Find businesses or Import list."
                : `${form.sources.length} selected. Scraping this bucket uses these, not your account defaults.`}
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bucketPitch">What you&apos;re offering</Label>
            <Textarea
              id="bucketPitch"
              rows={3}
              className="resize-none"
              placeholder="Imported 80gsm engineering drawing rolls, delivered across Egypt."
              value={form.pitch}
              onChange={(event) => update("pitch", event.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              This is the sender&apos;s side of every message generated for this bucket. A
              supplier enquiry from a paper factory and a job application read nothing alike,
              so write it in the voice this hunt needs.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!form.name.trim() || isSaving} className="gap-2">
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Create bucket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
