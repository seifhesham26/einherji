# Einherji — User Guide

## What is Einherji?

Einherji is an AI-powered job hunting assistant. It automatically scrapes LinkedIn for job postings that match your criteria, finds the hiring manager at each company, writes personalized outreach messages using AI, and lets you manage every conversation in a pipeline — all from one dashboard.

---

## Getting Started

### 1. Create an Account

Go to the **Register** page and fill in:

- **Full Name** — your display name used throughout the app
- **Email** — used to log in and for email verification
- **Job Title** *(optional)* — your current or target role (e.g. "Senior Frontend Engineer")
- **Password** + **Confirm Password**

After submitting, you'll be redirected to a verification page. Check your inbox for a verification email and click the link inside. If it doesn't arrive, use the **Resend verification email** button on the page.

> If you already have an account, go to **Login** and sign in with your email and password.

---

### 2. Set Up Your Search Criteria

Once logged in, go to **Criteria** from the sidebar. This is the most important step — it tells the AI what jobs to look for and how to write your outreach messages.

The form has five sections:

#### CV Upload *(optional but recommended)*
Drop your CV (PDF) into the upload area and click **Extract & fill profile**. The AI will automatically read your resume and fill in:
- Your skills
- Suggested job titles based on your experience
- Your resume text (for AI context)
- An elevator pitch (a 2–3 sentence intro used in every message)

You can always edit any of these fields after extraction.

#### Target Role
- **Job Titles** — the roles you're targeting (e.g. "Frontend Engineer", "React Developer"). Add multiple by typing and pressing Enter.
- **Locations** — where you want to work (e.g. "Remote", "London, UK"). Add multiple.
- **Minimum Salary** — optional salary floor. Leave blank to include all salaries.

#### Company Preferences
- **Company Size** — drag the slider to set a range (from 1-person startups to 10,000+ enterprise). The label updates to show Startup / Mid-size / Enterprise.
- **Industries** — toggle any industries you're interested in (SaaS, Fintech, AI/ML, Healthcare, etc.). Leave all off to include every industry.
- **Skills** — your top technical skills (e.g. "React", "TypeScript", "Node.js"). Used to match jobs and personalise messages.

#### Your Background
- **Resume Text** — paste or edit the plain text of your CV. The AI uses this to write messages that reference your actual experience.
- **Elevator Pitch** — a short personal intro. This appears near the top of every outreach message. Keep it 2–3 sentences.

#### AI Model
Choose which AI model generates your outreach messages:

| Model | Cost |
|---|---|
| Gemini 2.0 Flash *(default)* | Free |
| Llama 3.3 70B | Free |
| Mistral Nemo | Free |
| GPT-4o Mini | Paid (OpenAI credits) |
| GPT-4o | Paid (OpenAI credits) |
| Claude Haiku | Paid (OpenRouter credits) |
| Claude Sonnet | Paid (OpenRouter credits) |

Click **Save Criteria** when done.

---

### 3. Add Your Apify API Token

Go to **Settings** from the sidebar. Under **Integrations**, paste your Apify API token. This is required to scrape LinkedIn jobs and find hiring managers.

To get a token: sign up at [console.apify.com](https://console.apify.com) (free $5 credits on signup) → click your avatar → Settings → API & Integrations → create a new token.

Click **Save Key** after pasting.

> For a detailed walkthrough with screenshots, troubleshooting tips, and credit usage info, see the [Apify Setup Guide](./APIFY_SETUP.md).

---

### 4. Run Your First Scrape

Go to **Dashboard** and click the **Run Daily Scrape** button (top right). The app will use Apify to search LinkedIn for jobs matching your criteria.

When complete, go to the **Jobs** page to see what was found.

---

## Page-by-Page Guide

---

### Dashboard

The home screen gives you a quick overview of everything happening.

**Stats row (5 cards):**
- **Jobs scraped today** — how many LinkedIn jobs were found in the last scrape
- **Managers found** — total hiring managers discovered across all jobs
- **Approved today** — messages you've approved and sent today
- **Replies received** — leads who have replied to your outreach
- **Calls scheduled** — leads you've progressed to a scheduled call

**Approval Queue summary** — shows how many AI-generated messages are waiting for your review. Click **Review** to go to the Messages page.

**Follow-up Reminders** — lists leads where you set a follow-up date that has now passed. Red badge means you have overdue follow-ups.

**Recent Activity** — a feed of the 10 most recent status changes across all your leads, with timestamps.

---

### Jobs

A grid of all LinkedIn job postings found by the scraper.

**Each job card shows:**
- Company logo (first letter in a colored circle)
- Job title and company name
- Location
- Salary range *(if available)*
- Company size *(if available)*
- How long ago it was posted
- A status badge: **Done** (green) if a hiring manager has been found, **Pending** (amber) if not yet

**Actions on each card:**
- **Find Manager** — triggers the AI to search for the hiring manager at that company. Once found, they appear as a lead on the Leads page.
- **External link icon** — opens the original job posting on LinkedIn in a new tab

**Toolbar:**
- Search bar — filter jobs by title or company name
- **Pending only** toggle — show only jobs where no manager has been found yet (with a count badge)

---

### Leads

A table of all discovered hiring managers and contacts.

**Each row shows:**
- Avatar with initials
- Full name
- Job title *(or — if unknown)*
- Company
- Status badge (colour-coded — see pipeline stages below)
- Last contact date
- Action buttons *(visible on hover)*:
  - **Generate Message** — asks the AI to write a personalised outreach message for this lead (goes into your approval queue)
  - **LinkedIn icon** — opens their LinkedIn profile in a new tab

**Toolbar:**
- Search by name or company
- Status filter dropdown — show only leads at a specific pipeline stage

---

### Messages

The approval queue. This is where you review, edit, and approve every AI-generated message before it's sent.

**The queue shows one message at a time:**

- **Lead header** — avatar, name, job title, company
- **Badges** — the job they were found through and the message template used (Hiring Manager / Recruiter / Referral)
- **Message body** — large editable text area. The AI writes a draft; you can read and modify it directly.
- **"Edited" indicator** — appears if you've changed the text, so you know you're approving a modified version

**Action buttons:**
- **Approve** (or **Edit & Approve** if you edited) — approves the message and moves to the next one
- **Regenerate** — asks the AI to rewrite the message from scratch; you review the new version
- **Skip** — puts this message aside and moves to the next one; you can come back to it

**Progress bar** at the top shows how many messages remain in the queue and an estimated time to finish.

**Daily counter** shows how many messages you've approved today.

When the queue is empty, you'll see a confirmation that everything is cleared.

---

### Tracker

A drag-and-drop kanban board showing every lead and where they are in your pipeline.

**The 8 pipeline stages (columns):**

| Stage | What it means |
|---|---|
| **Not Contacted** | Lead found, no message sent yet |
| **Message Sent** | AI message approved and sent |
| **Reply Received** | Contact replied to your message |
| **Call Scheduled** | You've booked a call with them |
| **Interview** | Interview completed or upcoming |
| **Offer** | Offer received or strong interest |
| **Rejected** | They declined or you stopped pursuing |
| **No Response** | Message sent, no reply after follow-up |

**Each card shows:**
- Avatar with initials
- Full name
- Company name
- Last contact date *(if any)*
- A quick action button that advances the lead to the next logical stage:
  - Not Contacted → **Send Message**
  - Message Sent → **Mark Reply**
  - Reply Received → **Schedule Call**
  - Call Scheduled → **Mark Interview**
  - Interview → **Mark Offer**

**To move a lead:** drag the card to any column, or click the quick action button to advance it one step forward.

---

### Settings

**Profile section:**
- **Display Name** — your name shown in the header and on messages
- **Job Title** — your role (used in outreach context)
- **LinkedIn URL** — your own LinkedIn profile link

Click **Save Profile** after making changes.

**Integrations section:**
- **Apify API Token** — your personal Apify key for scraping LinkedIn. Click the eye icon to show/hide the token. Click **Save Key** after pasting.

> If you don't have an Apify token, the app will use a shared server token as a fallback. Adding your own gives you dedicated scraping capacity and your own usage quota.

---

## The Full Workflow

Here's the end-to-end flow once everything is set up:

```
1. Set Criteria      → tell the AI what jobs and companies you're targeting
2. Run Scrape        → Apify searches LinkedIn and returns matching jobs
3. Find Managers     → AI discovers the hiring manager at each company
4. Generate Messages → AI writes personalised outreach for each lead
5. Review & Approve  → you read, edit if needed, and approve in the queue
6. Track Progress    → move leads through the kanban as conversations progress
```

You can re-run the scrape daily to find new postings. The app will not create duplicate leads for contacts you've already found.

---

## Pipeline Stage Reference

| Stage | Badge Colour |
|---|---|
| Not Contacted | Gray |
| Message Sent | Blue |
| Reply Received | Yellow |
| Call Scheduled | Orange |
| Interview | Violet |
| Offer | Green |
| Rejected | Red |
| No Response | Muted gray |

---

## Tips

- **Start with the CV upload** on the Criteria page — it saves a lot of manual filling and gives the AI the best possible context for your messages.
- **Review the elevator pitch** after extraction. The AI generates a generic version; personalise it to sound like you.
- **Use the Regenerate button** freely — if a message doesn't feel right, regenerate until it does. Quality of output improves with a detailed resume text and elevator pitch.
- **The Pending only filter** on Jobs is useful for finding jobs where you haven't run "Find Manager" yet.
- **Drag cards on Tracker** as conversations happen, even if you're not using the message features — it keeps your pipeline accurate and the dashboard stats meaningful.
