import { and, asc, eq } from "drizzle-orm";
import type { Database } from "@/lib/db";
import { muteRules } from "@/lib/db/schema";
import type { MuteRuleKind } from "./mute-rules.validators";

// Every query takes userId first and filters on it — ownership belongs in the
// WHERE clause, not in a service check that can be forgotten.

export async function getMuteRules(db: Database, userId: string) {
  return db
    .select()
    .from(muteRules)
    .where(eq(muteRules.userId, userId))
    .orderBy(asc(muteRules.kind), asc(muteRules.pattern));
}

export async function insertMuteRule(
  db: Database,
  userId: string,
  rule: { kind: MuteRuleKind; pattern: string },
) {
  const [inserted] = await db
    .insert(muteRules)
    .values({ userId, ...rule })
    // The same rule twice is not an error worth showing — it's already doing
    // what the user just asked for.
    .onConflictDoNothing({
      target: [muteRules.userId, muteRules.kind, muteRules.pattern],
    })
    .returning();

  return inserted ?? null;
}

export async function getMuteRuleByPattern(
  db: Database,
  userId: string,
  kind: MuteRuleKind,
  pattern: string,
) {
  const [rule] = await db
    .select()
    .from(muteRules)
    .where(
      and(
        eq(muteRules.userId, userId),
        eq(muteRules.kind, kind),
        eq(muteRules.pattern, pattern),
      ),
    )
    .limit(1);

  return rule ?? null;
}

export async function deleteMuteRule(db: Database, userId: string, ruleId: string) {
  const [deleted] = await db
    .delete(muteRules)
    .where(and(eq(muteRules.id, ruleId), eq(muteRules.userId, userId)))
    .returning();

  return deleted ?? null;
}
