/**
 * True for a Postgres unique-index violation (SQLSTATE 23505).
 *
 * The code is not on the error Drizzle throws — it wraps the driver error in a
 * DrizzleQueryError and hangs the real NeonDbError off `cause`, so this has to
 * walk the chain. Checking only the top-level error silently never matches, and
 * the caller then leaks a 500 carrying the full SQL statement.
 */
export function isUniqueViolation(error: unknown): boolean {
  const MAX_CAUSE_DEPTH = 5;
  let current: unknown = error;

  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current; depth++) {
    if (typeof current === "object" && "code" in current && current.code === "23505") return true;
    current = typeof current === "object" && "cause" in current ? current.cause : null;
  }

  return false;
}
