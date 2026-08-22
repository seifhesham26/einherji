"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  isPending?: boolean;
  /**
   * Requires the user to type this word before the confirm button unlocks.
   *
   * Reserved for actions with no undo and no natural ceiling — clearing every
   * job on the account is one. A second click is not a decision; typing is.
   */
  confirmPhrase?: string;
}

export default function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending = false,
  confirmPhrase,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        {/* The typed phrase lives in the body, which unmounts with the dialog —
            so it resets on close without an effect reaching in to clear it. */}
        <ConfirmDialogBody
          title={title}
          description={description}
          confirmLabel={confirmLabel}
          onConfirm={onConfirm}
          isPending={isPending}
          confirmPhrase={confirmPhrase}
        />
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialogBody({
  title,
  description,
  confirmLabel,
  onConfirm,
  isPending,
  confirmPhrase,
}: Omit<ConfirmDialogProps, "open" | "onOpenChange">) {
  const [typedPhrase, setTypedPhrase] = React.useState("");

  const isUnlocked =
    !confirmPhrase || typedPhrase.trim().toLowerCase() === confirmPhrase.toLowerCase();

  return (
    <>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {confirmPhrase && (
        <div className="space-y-2">
          <Label htmlFor="confirm-phrase" className="text-xs font-normal text-muted-foreground">
            Type <span className="font-medium text-foreground">{confirmPhrase}</span> to confirm
          </Label>
          <Input
            id="confirm-phrase"
            value={typedPhrase}
            onChange={(event) => setTypedPhrase(event.target.value)}
            placeholder={confirmPhrase}
            autoComplete="off"
            // Enter is the natural reflex in a single-field form, and here it
            // would fire the irreversible action.
            onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
          />
        </div>
      )}

      <DialogFooter>
        <DialogClose render={<Button variant="outline" disabled={isPending} />}>Cancel</DialogClose>
        <Button variant="destructive" onClick={onConfirm} disabled={isPending || !isUnlocked}>
          {isPending && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          {confirmLabel}
        </Button>
      </DialogFooter>
    </>
  );
}
