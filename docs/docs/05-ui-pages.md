# 05 — UI Pages

## Pages Overview

| Route | Purpose |
|---|---|
| `/` | Dashboard — stats + daily summary |
| `/criteria` | Set job search preferences + resume |
| `/jobs` | Browse scraped job postings |
| `/leads` | CRM — all hiring managers |
| `/messages` | Approval queue — review AI drafts |
| `/tracker` | Full outreach history + follow-up reminders |

---

## `/criteria` — Criteria Setup Page

### What it does:
A form where you set everything once. Claude reads this for every message it generates.

### Fields:
```
Job Titles         → tag input  ["Senior Frontend Developer", "Staff Engineer"]
Salary Minimum     → number     80000
Locations          → tag input  ["Remote, United States", "Cairo, Egypt"]
Company Size       → range      50 – 1000
Industries         → multiselect ["SaaS", "Fintech", "E-commerce"]
Skills             → tag input  ["React", "TypeScript", "Next.js", "Supabase"]
Resume Text        → textarea   (plain text CV)
Elevator Pitch     → textarea   (2-3 sentences about yourself)
```

### Prompt to build this page:
```
Build a Next.js page at /criteria using shadcn/ui components.

It should be a settings-style form that saves to /api/criteria via POST.

Fields:
- "Job Titles" — a tag input where users can add/remove multiple strings
- "Salary Minimum" — a number input with a $ prefix
- "Locations" — a tag input (e.g. "Remote, United States")
- "Company Size" — a dual-handle range slider (min 1, max 10000)
- "Industries" — a multi-select dropdown with these options: SaaS, Fintech, E-commerce, Healthcare, Finance, Education, Legal, Marketing
- "Skills" — a tag input
- "Resume Text" — a large textarea (at least 8 rows)
- "Elevator Pitch" — a textarea (3 rows) with placeholder "2-3 sentences about who you are and what you're great at"

On submit, POST to /api/criteria. Show a success toast on save.

Use Tailwind for styling. The page should feel clean and professional.
```

---

## `/jobs` — Jobs List Page

### What it does:
Shows scraped jobs. Each card has a "Find Manager" button that triggers the Apify profile scrape for that company.

### Prompt to build this page:
```
Build a Next.js page at /jobs that fetches jobs from /api/jobs (GET) and displays them as cards.

Each card shows:
- Job title (bold)
- Company name
- Location
- Salary (if available)
- "Posted X days ago" relative timestamp
- A badge showing if a hiring manager was found (isProcessed: true/false)
- A "Find Manager" button (disabled if already processed) that POSTs to /api/apify/find-managers with the jobId

At the top, show a "Scrape New Jobs" button that POSTs to /api/apify/scrape-jobs and refreshes the list.

Add a search input to filter jobs by title or company.
Add a toggle to show only unprocessed jobs.

Use shadcn/ui Card, Badge, Button components.
```

---

## `/leads` — Hiring Managers CRM

### What it does:
A table of all hiring managers found. Each row has a "Generate Message" button.

### Prompt to build this page:
```
Build a Next.js page at /leads that fetches all leads from /api/leads (GET).

Display as a table with columns:
- Name (firstName + lastName)
- Title
- Company
- Status (colored badge using the leadStatusEnum values)
- Last Contacted (relative date)
- Actions

Actions column has two buttons:
1. "Generate Message" — POSTs to /api/messages/generate with { leadId, template: "hiring_manager" }, then navigates to /messages
2. "View on LinkedIn" — opens linkedinUrl in new tab

Above the table, add filter dropdowns for:
- Status (all / not_contacted / message_sent / reply_received / etc.)
- Company (text search)

Show total lead count at the top.

Use shadcn/ui Table, Badge, Button, Select components.
```

---

## `/messages` — Approval Queue

### What it does:
The most important page. Shows all draft messages. You approve, edit, or skip each one.

### Prompt to build this page:
```
Build a Next.js page at /messages that fetches all draft messages from /api/messages?status=draft (GET).

For each message, show an "approval card" containing:
- The lead's name and title at the top
- The company and job title
- The message body in an editable textarea (pre-filled with the draft)
- Three buttons: "Approve", "Edit & Approve", "Regenerate", "Skip"

"Approve" → POST to /api/messages/approve with { messageId }
"Edit & Approve" → allows editing the textarea, then POST to /api/messages/approve with { messageId, editedBody }
"Regenerate" → POST to /api/messages/generate with { leadId, template: "hiring_manager" } to create a new draft
"Skip" → marks the message status as "skipped" and removes from queue

Show a progress bar at the top: "X of Y approved today"
Show a counter: "Est. time remaining: X minutes" (assume 30 seconds per message)

After approving all, show a celebration screen: "All done! X messages approved."

Use shadcn/ui Card, Textarea, Button, Progress components.
```

---

## `/` — Dashboard

### What it does:
Daily summary of activity. Key stats at a glance.

### Prompt to build this page:
```
Build a Next.js dashboard page at / that shows:

Stats cards (top row):
- Jobs scraped today
- Hiring managers found
- Messages approved today
- Replies received
- Calls scheduled

Below, show two columns:
Left: "Today's Approval Queue" — count of draft messages waiting, with a link to /messages
Right: "Follow-up Reminders" — leads where nextActionAt is today or overdue

Below that, a simple activity timeline showing the last 10 actions (messages sent, replies received, calls scheduled).

Add a "Run Daily Scrape" button that POSTs to /api/apify/scrape-jobs.

Use shadcn/ui Card, Badge, Button components. Make it feel like a command center.
```

---

## `/tracker` — Outreach History

### What it does:
Full pipeline view — all leads by status stage.

### Prompt to build this page:
```
Build a Next.js page at /tracker that displays all leads grouped by status as a Kanban-style board.

Columns (one per status):
- Not Contacted
- Message Sent
- Reply Received
- Call Scheduled
- Interview
- Offer
- Rejected / No Response

Each card in a column shows:
- Lead name + title
- Company
- Days since last contact
- Quick action button (varies by status):
  - "Not Contacted" → "Send Message"
  - "Message Sent" → "Mark Reply Received"
  - "Reply Received" → "Schedule Call"
  - etc.

Allow drag-and-drop between columns to update lead status (PATCH /api/leads/:id).

Use shadcn/ui Card, Badge, Button. Use @hello-pangea/dnd for drag-and-drop.
```
