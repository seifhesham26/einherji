import { ARE_SIGNUPS_OPEN } from "@/lib/signups";

/**
 * The one action the marketing page offers, wherever it offers it.
 *
 * The nav, the hero and the closing panel all show the same button, so they all
 * ask the same question here. Three copies of this logic is three chances for
 * the page to invite someone to create an account while the next section tells
 * them they cannot.
 *
 * One label per intent, too: a page that says "Start free" at the top and "Get
 * started" at the bottom is a page that has not decided what it wants.
 */
export interface PrimaryAction {
  href: string;
  label: string;
}

export function resolvePrimaryAction(isSignedIn: boolean): PrimaryAction {
  if (isSignedIn) return { href: "/dashboard", label: "Open dashboard" };

  // With signups closed, sending someone to a register page that has no form is
  // a dead end dressed up as a call to action.
  if (!ARE_SIGNUPS_OPEN) return { href: "/login", label: "Sign in" };

  return { href: "/register", label: "Start free" };
}
