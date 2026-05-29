# 07 — Full Build Prompt

Use this prompt with **Cursor**, **Claude Code**, or any AI coding assistant to build the entire system from scratch.

Paste it as your initial prompt, then follow up with the individual page prompts from `05-ui-pages.md`.

---

## Master Project Initialization Prompt

```
Build me a full-stack Next.js 14 (App Router) application called "AI Job Hunter".

## Tech Stack
- Next.js 14 with App Router and TypeScript
- Neon DB (Postgres) with Drizzle ORM
- Tailwind CSS + shadcn/ui components
- Anthropic Claude API (claude-sonnet-4-20250514) for AI message generation
- Apify API for LinkedIn scraping

## What The App Does
An automated job hunting system:
1. User saves their job search criteria (target roles, salary, location, skills, resume)
2. App scrapes LinkedIn jobs matching criteria via Apify
3. App finds the hiring manager for each job via Apify LinkedIn Profile Scraper
4. Claude AI generates a personalized outreach message for each hiring manager
5. User reviews and approves messages in a queue
6. App tracks all outreach in a CRM with status stages

## Database Schema (Drizzle)

Create these tables:

### criteria
- id (cuid, primary key)
- userId (text)
- titles (text array) — target job titles
- salaryMin (integer)
- locations (text array)
- companySizeMin (integer)
- companySizeMax (integer)
- industries (text array)
- skills (text array)
- resumeText (text)
- elevatorPitch (text)
- isActive (boolean, default true)
- createdAt, updatedAt (timestamp)

### jobs
- id (cuid, primary key)
- apifyId (text, unique)
- title, company, companySize, location, salary (text)
- description (text)
- jobUrl (text)
- postedAt (timestamp)
- isProcessed (boolean, default false) — whether hiring manager was found
- createdAt (timestamp)

### leads
- id (cuid, primary key)
- jobId (foreign key → jobs)
- firstName, lastName, title, company (text)
- linkedinUrl, email (text)
- headline, about, recentPosts (text)
- status (enum: not_contacted | message_sent | reply_received | call_scheduled | interview | offer | rejected | no_response)
- lastContactedAt, nextActionAt (timestamp)
- notes (text)
- createdAt, updatedAt (timestamp)

### messages
- id (cuid, primary key)
- leadId (foreign key → leads)
- jobId (foreign key → jobs)
- body (text)
- templateUsed (text)
- status (enum: draft | approved | sent | edited)
- approvedAt, sentAt (timestamp)
- editedBody (text)
- createdAt (timestamp)

## API Routes

### POST /api/apify/scrape-jobs
- Reads active criteria from DB
- Calls Apify linkedin-jobs-scraper actor
- Saves results to jobs table (skip duplicates via apifyId)
- Returns { inserted, total }

### POST /api/apify/find-managers
- Body: { jobId }
- Reads job from DB
- Determines hiring manager titles based on job title (e.g. "engineer" → "VP Engineering", "Engineering Manager")
- Calls Apify linkedin-profile-scraper actor
- Saves results to leads table
- Marks job.isProcessed = true
- Returns { leads }

### POST /api/messages/generate
- Body: { leadId, template: "hiring_manager" | "recruiter" | "referral" }
- Reads lead + job + criteria from DB
- Calls Claude API with a personalized prompt
- Saves draft message to messages table
- Returns { message }

### POST /api/messages/approve
- Body: { messageId, editedBody? }
- Sets message.status = "approved"
- Sets lead.status = "message_sent"
- Returns { message }

### GET /api/jobs
- Returns all jobs, sorted by postedAt desc
- Query params: ?processed=true/false

### GET /api/leads
- Returns all leads with their latest message
- Query params: ?status=not_contacted (filter by status)

### GET /api/messages
- Returns messages filtered by status
- Query params: ?status=draft

### POST /api/criteria + GET /api/criteria
- CRUD for user's search criteria

### PATCH /api/leads/:id
- Update lead status (for kanban drag-and-drop)

## Claude Message Generation

System prompt for Claude:
"You are an expert job search coach who writes highly personalized LinkedIn outreach messages.
Rules:
- Max 150 words
- Never use generic openers like 'I hope this message finds you well'
- Always reference something specific about their company or role
- Lead with value, not desperation
- Be human and direct
- End with one clear ask: a 15-minute call
- No bullet points in the message
- Output ONLY the message body"

User prompt should include:
- Job title, company, description excerpt
- Lead's name, title, headline, about section
- Sender's resume text and elevator pitch
- Template-specific instructions (hiring_manager vs recruiter vs referral)

## Pages To Build
1. / — Dashboard with stats and daily summary
2. /criteria — Form to set job search preferences
3. /jobs — List of scraped jobs with "Find Manager" button per job
4. /leads — Table of hiring managers with "Generate Message" button
5. /messages — Approval queue showing draft messages one at a time
6. /tracker — Kanban board of all leads by status

## File Structure
src/
├── app/
│   ├── page.tsx (dashboard)
│   ├── criteria/page.tsx
│   ├── jobs/page.tsx
│   ├── leads/page.tsx
│   ├── messages/page.tsx
│   ├── tracker/page.tsx
│   └── api/ (all routes above)
├── lib/
│   ├── db/schema.ts
│   ├── db/index.ts
│   ├── apify/client.ts
│   └── claude/client.ts
└── components/
    ├── jobs/JobCard.tsx
    ├── leads/LeadTable.tsx
    ├── messages/ApprovalCard.tsx
    └── criteria/CriteriaForm.tsx

## Important Notes
- Use server actions or API routes (not both mixed)
- All DB calls use Drizzle ORM, never raw SQL
- Environment variables: DATABASE_URL, APIFY_API_TOKEN, ANTHROPIC_API_KEY
- Use shadcn/ui for all UI components
- The app should feel like a professional SaaS tool, not a side project
```

---

## Follow-up Prompts (Use After Initialization)

### After the base is set up, use these one by one:

**For the Approval Queue page:**
```
Build the /messages approval queue page. It should show draft messages one at a time as a card. The card has the lead's name, title, company, the job they applied for, and the message body in an editable textarea. Buttons: Approve, Edit & Approve, Regenerate, Skip. Show a progress bar at the top (X of Y approved). After all are approved, show a success screen.
```

**For the Kanban Tracker:**
```
Build the /tracker kanban board. Use @hello-pangea/dnd for drag and drop. Seven columns matching the lead status enum. Each card shows name, company, days since last contact. Dragging a card to a new column should PATCH /api/leads/:id with the new status.
```

**For the Dashboard stats:**
```
Build the dashboard at /. Fetch stats: jobs scraped today, managers found, messages approved today, replies received, calls scheduled. Show as stat cards. Add an activity feed below showing the last 10 status changes. Add a "Run Daily Scrape" button.
```

**For dark mode:**
```
Add dark mode support using next-themes. The app should default to dark mode. Add a toggle button in the top-right corner of the layout.
```
