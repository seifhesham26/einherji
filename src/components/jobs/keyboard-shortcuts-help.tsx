"use client";

import { Keyboard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { TRIAGE_SHORTCUTS } from "@/hooks/jobs/useJobTriageKeyboard";

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * The shortcut list, opened with `?`.
 *
 * Read from the same constant the handler switches on, so a key that stops
 * working stops being advertised at the same moment.
 */
export default function KeyboardShortcutsHelp({ open, onOpenChange }: KeyboardShortcutsHelpProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-4 w-4" aria-hidden />
            Keyboard
          </DialogTitle>
          <DialogDescription>
            The list is built to be cleared without a mouse. These work whenever you are not
            typing in a field.
          </DialogDescription>
        </DialogHeader>

        <dl className="divide-y divide-border text-sm">
          {TRIAGE_SHORTCUTS.map((shortcut) => (
            <div key={shortcut.keys} className="flex items-center justify-between gap-4 py-1.5">
              <dt>
                <kbd className="console-mono inline-flex h-6 min-w-6 items-center justify-center rounded border border-sky-200/90 dark:border-sky-800 bg-white dark:bg-slate-900 px-2 text-xs font-semibold text-slate-700 dark:text-sky-300 shadow-[0_2px_0_#bae6fd] dark:shadow-[0_2px_0_#0284c7]">
                  {shortcut.keys}
                </kbd>
              </dt>
              <dd className="text-right text-xs text-muted-foreground">{shortcut.description}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
