# 04 — API Routes Reference

## Quick Reference

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/criteria` | Get active criteria |
| POST | `/api/criteria` | Save/update criteria |
| POST | `/api/apify/scrape-jobs` | Trigger LinkedIn job scrape |
| POST | `/api/apify/find-managers` | Find hiring managers for a job |
| GET | `/api/jobs` | List all scraped jobs |
| GET | `/api/leads` | List all leads (with filters) |
| PATCH | `/api/leads/[id]` | Update lead status |
| POST | `/api/messages/generate` | Generate AI message for a lead |
| POST | `/api/messages/approve` | Approve (and optionally edit) a message |
| GET | `/api/messages` | List messages (filter by status) |

---

## GET `/api/jobs`

```ts
// src/app/api/jobs/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { jobs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const processed = searchParams.get("processed");

  let query = db.select().from(jobs).orderBy(desc(jobs.postedAt));

  if (processed === "false") {
    query = query.where(eq(jobs.isProcessed, false)) as typeof query;
  } else if (processed === "true") {
    query = query.where(eq(jobs.isProcessed, true)) as typeof query;
  }

  const result = await query;
  return NextResponse.json(result);
}
```

---

## GET `/api/leads`

```ts
// src/app/api/leads/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as typeof leads.$inferSelect.status | null;

  let query = db.select().from(leads);
  if (status) {
    query = query.where(eq(leads.status, status)) as typeof query;
  }

  const result = await query;
  return NextResponse.json(result);
}
```

---

## PATCH `/api/leads/[id]`

```ts
// src/app/api/leads/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { leads } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const body = await req.json();
  const { status, notes, nextActionAt } = body;

  const [updated] = await db
    .update(leads)
    .set({
      ...(status && { status }),
      ...(notes !== undefined && { notes }),
      ...(nextActionAt && { nextActionAt: new Date(nextActionAt) }),
      updatedAt: new Date(),
    })
    .where(eq(leads.id, params.id))
    .returning();

  return NextResponse.json(updated);
}
```

---

## GET `/api/messages`

```ts
// src/app/api/messages/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { messages, leads, jobs } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") ?? "draft";

  const result = await db
    .select({
      message: messages,
      lead: leads,
      job: jobs,
    })
    .from(messages)
    .leftJoin(leads, eq(messages.leadId, leads.id))
    .leftJoin(jobs, eq(messages.jobId, jobs.id))
    .where(eq(messages.status, status as "draft" | "approved" | "sent" | "edited"));

  return NextResponse.json(result);
}
```

---

## POST `/api/criteria`

```ts
// src/app/api/criteria/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { criteria } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const [active] = await db
    .select()
    .from(criteria)
    .where(eq(criteria.isActive, true))
    .limit(1);
  return NextResponse.json(active ?? null);
}

export async function POST(req: Request) {
  const body = await req.json();

  // Deactivate existing
  await db.update(criteria).set({ isActive: false });

  // Insert new
  const [saved] = await db
    .insert(criteria)
    .values({ ...body, userId: "user_1", isActive: true })
    .returning();

  return NextResponse.json(saved);
}
```
