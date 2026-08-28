/**
 * Whether anyone new can create an account.
 *
 * One boolean, read by the auth server and by every surface that offers a way
 * in, so the door and the sign on the door can never disagree. Flip it back to
 * `true` to reopen; nothing else has to change.
 *
 * A constant rather than an environment variable on purpose: this is a product
 * decision that belongs in the diff, where it is reviewable and greppable, not a
 * setting someone finds a year later in a dashboard and cannot explain.
 *
 * The enforcement is `emailAndPassword.disableSignUp` in lib/auth.ts. Hiding the
 * link is a courtesy; the sign-up endpoint is a public HTTP route, and a page
 * that merely stops linking to it is still wide open to anyone who types the URL
 * or replays the request.
 */
export const ARE_SIGNUPS_OPEN = false;

/** What the closed pages say. One sentence, kept in one place so it stays one sentence. */
export const SIGNUPS_CLOSED_MESSAGE =
  "New accounts are closed for now. If you already have one, sign in.";
