"use client";

import { useEffect } from "react";

/**
 * The keyboard layer over the jobs list.
 *
 * Triage is the same three decisions repeated two hundred times, and doing it
 * with a mouse means two hundred round trips across the screen. The keys are
 * borrowed from the places people already have them in muscle memory — j/k from
 * every list Vim ever touched, `/` for search from everywhere, `?` for help.
 *
 * Every handler is optional so the same hook can drive the list and, with a
 * smaller set, the detail panel.
 */

export interface JobTriageHandlers {
  onMoveDown?: () => void;
  onMoveUp?: () => void;
  onShortlist?: () => void;
  onMarkApplied?: () => void;
  onDismiss?: () => void;
  onOpenPosting?: () => void;
  onOpenDetail?: () => void;
  onToggleSelected?: () => void;
  onFocusSearch?: () => void;
  onShowHelp?: () => void;
  onEscape?: () => void;
}

interface UseJobTriageKeyboardOptions extends JobTriageHandlers {
  /** Off while a dialog owns the keyboard, or while the list is empty. */
  isEnabled: boolean;
}

/** What each key does, in the order the help sheet lists them. */
export const TRIAGE_SHORTCUTS: { keys: string; description: string }[] = [
  { keys: "j / ↓", description: "Next job" },
  { keys: "k / ↑", description: "Previous job" },
  { keys: "Enter", description: "Open the detail panel" },
  { keys: "s", description: "Shortlist" },
  { keys: "a", description: "Mark applied" },
  { keys: "x", description: "Dismiss, then a reason or Enter for none" },
  { keys: "o", description: "Open the posting in a new tab" },
  { keys: "Space", description: "Select for a bulk action" },
  { keys: "/", description: "Jump to search" },
  { keys: "?", description: "This list" },
  { keys: "Esc", description: "Close, or clear the selection" },
];

/**
 * Whether the key press belongs to something the user is typing into.
 *
 * Without this, typing "search" into the search box shortlists a job on the "s",
 * marks it applied on the "a", and opens the posting on nothing at all — the
 * single most common way a keyboard layer becomes unusable.
 */
function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  const tagName = target.tagName;
  return (
    tagName === "INPUT" ||
    tagName === "TEXTAREA" ||
    tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function useJobTriageKeyboard({
  isEnabled,
  onMoveDown,
  onMoveUp,
  onShortlist,
  onMarkApplied,
  onDismiss,
  onOpenPosting,
  onOpenDetail,
  onToggleSelected,
  onFocusSearch,
  onShowHelp,
  onEscape,
}: UseJobTriageKeyboardOptions) {
  useEffect(() => {
    if (!isEnabled) return;

    function handleKeyDown(event: KeyboardEvent) {
      // Escape is the way out of a text field, so it is the one key that still
      // works while typing.
      if (event.key === "Escape") {
        if (!onEscape) return;
        onEscape();
        return;
      }

      if (isTypingTarget(event.target)) return;
      // A browser or OS shortcut. Stealing Cmd+R to move down a list would be a
      // genuinely hostile thing to do.
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      const action = resolveAction(event.key);
      if (!action) return;

      const handler = {
        down: onMoveDown,
        up: onMoveUp,
        shortlist: onShortlist,
        applied: onMarkApplied,
        dismiss: onDismiss,
        open: onOpenPosting,
        detail: onOpenDetail,
        select: onToggleSelected,
        search: onFocusSearch,
        help: onShowHelp,
      }[action];

      if (!handler) return;

      // Only once a handler is confirmed: j and k are not the browser's, but
      // Space scrolls and `/` opens quick-find in Firefox, and swallowing those
      // when nothing is listening would break the page for no gain.
      event.preventDefault();
      handler();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isEnabled,
    onMoveDown,
    onMoveUp,
    onShortlist,
    onMarkApplied,
    onDismiss,
    onOpenPosting,
    onOpenDetail,
    onToggleSelected,
    onFocusSearch,
    onShowHelp,
    onEscape,
  ]);
}

type TriageAction =
  | "down"
  | "up"
  | "shortlist"
  | "applied"
  | "dismiss"
  | "open"
  | "detail"
  | "select"
  | "search"
  | "help";

function resolveAction(key: string): TriageAction | null {
  switch (key) {
    case "j":
    case "ArrowDown":
      return "down";
    case "k":
    case "ArrowUp":
      return "up";
    case "s":
      return "shortlist";
    case "a":
      return "applied";
    case "x":
      return "dismiss";
    case "o":
      return "open";
    case "Enter":
      return "detail";
    case " ":
      return "select";
    case "/":
      return "search";
    case "?":
      return "help";
    default:
      return null;
  }
}
