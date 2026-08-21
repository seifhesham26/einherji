"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
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
import { useCreateLead } from "@/hooks/leads/useCreateLead";
import BucketSelect from "@/components/buckets/bucket-select";
import { createLeadSchema, type CreateLeadInput } from "@/leads/leads.validators";

/**
 * Adds a hiring manager by hand.
 *
 * This is the working route to a lead — automated discovery needs a logged-in
 * LinkedIn session, which this app deliberately doesn't use. A lead added here
 * behaves identically downstream: generate a message, approve it, send it.
 *
 * Only a name and company are required. The optional fields all feed the message
 * prompt, so filling them in produces a noticeably better draft.
 */
interface AddLeadDialogProps {
  /** The bucket in view, pre-selected so a new contact lands where you're looking. */
  defaultBucketId?: string | null;
}

export default function AddLeadDialog({ defaultBucketId }: AddLeadDialogProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [bucketId, setBucketId] = useState<string>(defaultBucketId ?? "");
  const createLead = useCreateLead();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      title: "",
      company: "",
      linkedinUrl: "",
      headline: "",
      about: "",
    },
  });

  async function onSubmit(leadData: CreateLeadInput) {
    try {
      await createLead.mutateAsync({ ...leadData, bucketId: bucketId || undefined });
      reset();
      setIsOpen(false);
    } catch {
      // The hook toasts the reason — most often a duplicate. Keep the dialog open
      // so the entered details aren't lost.
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        size="sm"
        className="gap-2"
        onClick={() => {
          setBucketId(defaultBucketId ?? "");
          setIsOpen(true);
        }}
      >
        <Plus className="h-4 w-4" />
        Add lead
      </Button>

      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add a lead</DialogTitle>
          <DialogDescription>
            A hiring manager or contact to reach out to. Only a name and company are
            required — the rest sharpens the generated message.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name *</Label>
              <Input id="firstName" placeholder="Ada" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" placeholder="Lovelace" {...register("lastName")} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company">Company *</Label>
            <Input id="company" placeholder="Analytical Engines" {...register("company")} />
            {errors.company && (
              <p className="text-xs text-destructive">{errors.company.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Job title</Label>
            <Input id="title" placeholder="VP Engineering" {...register("title")} />
          </div>

          <BucketSelect
            id="addLeadBucket"
            value={bucketId}
            onChange={setBucketId}
            hint="Decides how messages to this contact are written — a client bucket pitches, a supplier bucket enquires."
          />

          <div className="space-y-1.5">
            <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
            <Input
              id="linkedinUrl"
              placeholder="https://linkedin.com/in/…"
              {...register("linkedinUrl")}
            />
            {errors.linkedinUrl && (
              <p className="text-xs text-destructive">{errors.linkedinUrl.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="headline">Headline</Label>
            <Input
              id="headline"
              placeholder="Building payments infrastructure"
              {...register("headline")}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="about">About / notes</Label>
            <Textarea
              id="about"
              rows={3}
              placeholder="Anything worth referencing in the message — recent work, shared interests, why you're reaching out."
              className="resize-none"
              {...register("about")}
            />
            <p className="text-xs text-muted-foreground">
              This goes into the message prompt, so specifics here make the draft less generic.
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              disabled={createLead.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createLead.isPending} className="gap-2">
              {createLead.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Add lead
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
