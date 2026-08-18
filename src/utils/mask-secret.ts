const VISIBLE_SUFFIX_LENGTH = 4;

/**
 * Renders a secret as a preview that confirms which key is saved without
 * disclosing it — "••••4f2a".
 *
 * Enough to tell two accounts apart when you're checking the right one is
 * connected, useless to anyone who intercepts it.
 */
export function maskSecret(value: string): string {
  if (value.length <= VISIBLE_SUFFIX_LENGTH) return "••••";
  return `••••${value.slice(-VISIBLE_SUFFIX_LENGTH)}`;
}
