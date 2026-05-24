# CLAUDE.md — Seif's Dev Standards

This file defines how code should be written, structured, and named in this codebase. Follow these rules in every suggestion, generation, and edit.

---

## Stack

**Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand (only when TanStack Query isn't enough), Zod

**Backend / API:** tRPC + Next.js Route Handlers (mix depending on the use case), Drizzle ORM or Prisma, Neon (PostgreSQL), Supabase (when applicable)

**Auth:** Better Auth

**Infra / Tooling:** Sentry, PostHog, Upstash, Resend, Stripe, Vitest, Husky, lint-staged, commitlint

---

## Project Structure

### Frontend — `components/`

Components are **always organized by domain**. There are no loose `.tsx` files sitting directly in `components/`. Every file lives under a domain subfolder.

```
components/
  ui/               # shadcn/ui primitives and shared base components
    button.tsx
    input.tsx
  auth/
    login-form.tsx
    signup-form.tsx
  dashboard/
    stats-card.tsx
    recent-activity.tsx
  admin/
    dashboard/
      users-table.tsx
    settings/
      role-editor.tsx
  leads/
    lead-card.tsx
    lead-filters.tsx
```

### Pages — `app/`

`page.tsx` files are **empty shells**. They import and render one root component. All real UI lives inside `components/`.

```tsx
// app/dashboard/page.tsx
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default function DashboardPage() {
  return <DashboardView />;
}
```

### Backend — domain-first onion architecture

Backend code is organized by **domain first**, then by layer inside that domain.

```
src/
  auth/
    auth.router.ts       # tRPC router
    auth.service.ts      # business logic
    auth.db.ts           # DB queries
    auth.helpers.ts      # pure utility functions for this domain
    auth.validators.ts   # Zod schemas
  leads/
    leads.router.ts
    leads.service.ts
    leads.db.ts
    leads.helpers.ts
    leads.validators.ts
  appointments/
    ...
```

### Types — `types/`

Types are **co-located by domain**, not dumped into one file.

```
types/
  lead.ts
  auth.ts
  appointment.ts
  shared.ts        # only for truly cross-domain shared types
```

### Utilities & Lib

```
lib/       # third-party wrappers and client initializations (stripe.ts, resend.ts, supabase.ts)
utils/     # pure helper functions with no side effects
```

### Hooks — `hooks/`

Custom hooks live here, organized by domain if needed:

```
hooks/
  auth/
    useGetCurrentUser.ts
    useLogout.ts
  leads/
    useGetLeads.ts
    useCreateLead.ts
```

---

## Naming Rules

### Variables & Parameters

**Never use abbreviations.** Names must describe exactly what the value is.

```ts
// ❌ Wrong
const p = req.params;
const u = await getUser(id);
const d = new Date();
const fn = (e: Event) => {};

// ✅ Correct
const routeParams = req.params;
const currentUser = await getUserById(userId);
const createdAt = new Date();
const handleSubmit = (event: Event) => {};
```

When a parameter is clearly a param bag, name it after what it contains:

```ts
// ❌
function createLead(p: CreateLeadInput) {}

// ✅
function createLead(leadData: CreateLeadInput) {}
function updateAppointment(appointmentUpdate: UpdateAppointmentInput) {}
```

### Files

File names must describe what the file **does or contains**, not just a generic category.

```
// ❌
utils.ts
helpers.ts
misc.ts

// ✅
format-currency.ts
parse-phone-number.ts
calculate-lead-score.ts
```

### Hooks

Use verb-first naming that describes the action:

```ts
useGetLeads()        // fetching a list
useGetLeadById()     // fetching a single item
useCreateLead()      // mutation — create
usePatchLead()       // mutation — partial update
useDeleteLead()      // mutation — delete
```

### Components

PascalCase, named after what they render:

```
LeadCard.tsx
AppointmentTable.tsx
StatsOverviewHeader.tsx
```

---

## Exports

- **Pages & components** → `default export`
- **Utils, hooks, services, types** → `named export`
- **Next.js `page.tsx` and `layout.tsx`** → always `default export` (required by Next.js)

---

## Data Fetching

**Primary pattern:** tRPC procedures consumed via TanStack Query on the client.

```ts
// hooks/leads/useGetLeads.ts
export function useGetLeads(filters: LeadFilters) {
  return trpc.leads.getAll.useQuery(filters);
}
```

Use `.then()` for non-blocking, non-critical reads where parallel loading improves perceived performance:

```ts
// Loading supplementary info in parallel — no need to block
Promise.all([
  getLeadStats(leadId).then(setStats),
  getLeadTimeline(leadId).then(setTimeline),
]);
```

Use `async/await` for flows where order matters or errors must be handled explicitly:

```ts
// Auth, mutations, anything with dependencies
async function handleLogin(credentials: LoginCredentials) {
  const session = await signIn(credentials);
  await redirectToOnboarding(session.userId);
}
```

---

## Forms

Choose based on complexity:

- **Simple form with no pre-filled data or remote options** → React Hook Form + Zod
- **Form with pre-filled data from server** → fetch first, then pass as `defaultValues` to React Hook Form
- **Form with async select/combobox options** → TanStack Query for options + React Hook Form for the form state
- **Server Actions** → only when it genuinely simplifies the flow (e.g. simple one-field update without client-side validation feedback needed)

---

## State Management

- **Server state** → TanStack Query. This is the default. Don't reach for Zustand for anything that can be a query.
- **Global UI state** → Zustand, only when truly global (e.g. sidebar open/close, active modal, user preferences)
- **Local UI state** → `useState` / `useReducer` inside the component

---

## Error Handling (tRPC)

Mix based on the situation:

- **Expected, user-facing errors** → `throw new TRPCError({ code: "BAD_REQUEST", message: "..." })` inside the procedure
- **Auth/permission errors** → middleware-level, not repeated in every procedure
- **Unexpected server errors** → let them bubble, Sentry will catch them

---

## Single Responsibility

Every file has **one job**. If a file is doing two different things, it needs to be split.

- A service file handles business logic — not DB calls, not HTTP concerns
- A DB file handles queries — not validation, not business rules
- A component renders UI — it delegates data fetching to hooks, not inline in the JSX

**Line count is a signal, not a rule.** A 300-line file that does one complex thing well is fine. A 100-line file doing two unrelated things is not.

Exception: microservice-style Route Handlers where routing + a quick guard check in the same file is acceptable, as long as the actual logic delegates to a service.

```ts
// app/api/webhooks/stripe/route.ts
// ✅ Routing + header verification together is fine — it's one micro-concern
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  // actual logic lives in the service
  return handleStripeWebhook(request, signature);
}
```

---

## Comments

Comments explain **why** something is done or walk through **steps in complex logic**. They should read like a human wrote them, not like generated documentation.

```ts
// ❌ Obvious, useless
// Get the user
const currentUser = await getUserById(userId);

// ✅ Explains the why
// We fetch the user here instead of pulling from session because
// we need the latest role — session data can be stale after a role update
const currentUser = await getUserById(userId);
```

For multi-step complex functions, comment the steps:

```ts
async function processLeadAssignment(leadId: string, agentId: string) {
  // 1. Make sure the agent has capacity before doing anything
  const agentCapacity = await getAgentCapacity(agentId);
  if (agentCapacity.isFull) throw new TRPCError({ code: "BAD_REQUEST", message: "Agent is at capacity" });

  // 2. Assign and log — both need to happen together or not at all
  await db.transaction(async (tx) => {
    await assignLeadToAgent(tx, leadId, agentId);
    await logLeadActivity(tx, leadId, "assigned", { agentId });
  });

  // 3. Notify the agent — fire-and-forget, don't block the response
  sendAssignmentNotification(agentId, leadId).catch((error) => {
    // non-critical, log and move on
    logger.warn("Failed to send assignment notification", { agentId, leadId, error });
  });
}
```

No JSDoc on every function. Only add JSDoc where a function is truly reusable and non-obvious (e.g. shared lib utilities).

---

## TypeScript

- Prefer `interface` for object shapes, `type` for unions and computed types
- No `any`. Use `unknown` and narrow it.
- Zod schemas are the source of truth for runtime validation — infer TS types from them:

```ts
// validators/lead.ts
export const createLeadSchema = z.object({
  name: z.string().min(1),
  phone: z.string(),
  source: z.enum(["whatsapp", "website", "referral"]),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
```

---

## General Rules

- No magic numbers. Extract them as named constants.
- No commented-out code left in PRs.
- Env variables accessed through a typed `env.ts` wrapper, never `process.env.SOMETHING` directly in application code.
- Import order: external packages → internal aliases (`@/`) → relative imports.
