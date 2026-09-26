# User Manual

## 1. Project Overview

### What This Application Is
**Einherji** is an intelligent, automated job-search workbench and outbound pipeline engine. Built as a high-performance Next.js web application, it automates the laborious multi-channel process of finding relevant career opportunities, evaluating hiring requirements against personal experience, preparing tailored application collateral, discovering hiring contacts, and managing the multi-stage progression from initial discovery to interview and offer.

Beyond traditional individual job hunting, Einherji's architecture natively supports multi-hunt "search buckets." This allows it to serve dual purposes: a personal career-advancement platform (hunting for employment) and an outbound client and supplier acquisition workspace (hunting for software engineering contracts, B2B commercial clients, or raw-material vendors).

### What Type of Business / System It Supports
Einherji supports knowledge workers, senior software engineers, technical freelancers, digital agency founders, and niche B2B operators. It functions as a specialized personal CRM (Customer Relationship Management) and ATS (Applicant Tracking System) aggregator. It does not replace enterprise ATS platforms used by employers (such as Greenhouse, Lever, or Ashby); rather, it acts on behalf of the applicant or service provider to monitor, query, and aggregate those platforms directly, leveling the information asymmetry between job seekers/service vendors and corporate hiring machines.

### Who the Intended Users Are
1. **Active Job Seekers & Senior Professionals:** Engineers, developers, and specialists seeking full-time, part-time, or contract positions across global remote markets and local regions (specifically optimized for both US/EU boards and MENA/Egypt markets like Cairo and Giza).
2. **Freelancers & Independent Consultants:** Software developers looking for direct freelance client projects across platforms like Hacker News ("Seeking Freelancer"), Freelancer.com, and remote contract boards.
3. **Small Agency & B2B Service Providers:** Digital studios and consultancy founders who monitor corporate job openings as purchasing signals (e.g., an enterprise advertising 5 open React positions has an immediate software delivery bottleneck and an approved budget).
4. **Local Business & Trade Operators:** Commercial users sourcing prospective local business clients or raw-material suppliers (such as engineering reprographic print shops, paper product buyers, or textile suppliers) using structured directory imports and Google Places integration.

### What Real-World Problem It Solves
Job hunting and business prospecting across the modern web are fragmented, exhausting, and repetitive:
- Postings are scattered across dozens of disconnected platforms: company-hosted career boards (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling), regional platforms (Wuzzuf in Egypt), global remote aggregators (RemoteOK, Jobicy, Himalayas, We Work Remotely, Arbeitnow), community forums (Hacker News "Who is Hiring?"), and social networks.
- Job boards are plagued with deceptive metadata: titles declaring "Senior" for 2-year roles, listings flagged as "Remote" that actually require on-site presence in a distant city, and syndicated postings appearing multiple times across different portals.
- Candidates spend hours manually copying job text, re-writing custom cover letters, drafting essay responses, modifying resume bullet points, searching for hiring managers on professional networks, and logging status entries in generic spreadsheets that quickly fall out of date.

### What People Normally Do Without This System
Without Einherji, an individual or freelancer typically:
- Spends 10–15 hours every week manually checking 15 different browser tabs, sifting through hundreds of irrelevant, expired, or duplicate postings.
- Manually reads 800-word job descriptions to identify basic parameters like true seniority, salary minimums, tech stack requirements, and visa sponsorship.
- Manually writes custom cover letters and application answers in Word or Google Docs, often resorting to generic copy-paste templates that recruiters ignore.
- Maintains a fragile spreadsheet or Trello board, manually copying company names, URLs, application dates, and follow-up deadlines.
- Loses track of when applications were submitted, failing to follow up with hiring managers before positions are filled.

### How This Application Improves That Process
Einherji unifies and automates this entire lifecycle into a single, cohesive workbench:
- **Unified Multi-Source Scraping:** A single click or automated nightly background job queries over 20 distinct job boards, public ATS endpoints, RSS feeds, and aggregator APIs simultaneously.
- **Explainable Relevance Scoring:** Every listing is scored from 0 to 100% against the user's specific profile and target search terms, providing clear explanations (e.g., *"matches React, TypeScript; posted in last 48 hours; salary listed"*).
- **Cross-Source Deduplication:** Smart fingerprinting normalizes company names, job titles, and locations to recognize identical positions syndicated across different aggregators, collapsing duplicates into a single master record.
- **Sub-Second Keyboard Triage:** The user can review hundreds of open roles rapidly without touching a mouse using Vim-style keyboard shortcuts (`j`/`k` to navigate, `s` to shortlist, `a` to mark applied, `x` to dismiss with structured feedback, `o` to open the live ad).
- **AI-Powered Fact Extraction & Fit Analysis:** An integrated LLM reads the raw posting text, extracts concrete parameters (true seniority, required years of experience, normalized annual salary band, visa policies, tech stack tags), and produces an in-depth fit report benchmarking the user's CV against every stated requirement.
- **Custom Application Collateral Generation:** Generates tailored, contextual cover letters, targeted CV achievement bullets, custom essay answers, and comprehensive interview preparation briefings directly grounded in the job description and user background.
- **Outreach & Pipeline CRM:** Supports finding decision-makers, generating personalized LinkedIn/WhatsApp outreach drafts tailored to specific personas (hiring manager, recruiter, peer referral, B2B client pitch, supplier enquiry), providing a manual copy-and-send workflow, and tracking all active contacts across an 8-column drag-and-drop Kanban tracker.
- **Zero-Effort Daily Autopilot:** Automatically runs overnight crawls, filters noise via user-defined mute rules, and delivers the top 5 highest-matching opportunities directly to the user's email inbox or Telegram chat.

### The Major Modules & Features
1. **Career Criteria & CV Profile:** CV upload with automated AI skill and summary extraction, target titles, geographic preferences, salary thresholds, and AI model selection.
2. **Multi-Source Scraping Engine:** Aggregates jobs from ATS APIs (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling), Aggregators (RemoteOK, Arbeitnow, Jobicy, Himalayas, The Muse, We Work Remotely, Hacker News, Wuzzuf), Marketplaces (Freelancer.com, HN Freelance), Credentialed APIs (Adzuna, SerpAPI, Reddit, X/Twitter), and LinkedIn public search.
3. **Jobs Workbench & Keyboard Triage:** Fast, keyset-paginated job feed with score badges, multi-attribute filtering, saved filter tabs, and rapid single-key triage.
4. **AI Job Insights & Fit Reports:** Automated fact extraction (true seniority, annual salary normalization, visa support) and line-by-line requirement evaluation against the user's CV.
5. **Tailored Job Documents:** On-demand generation of targeted cover letters, application question answers, aligned CV bullet points, and interview preparation packages.
6. **Tracked Target Companies:** Monitoring direct careers pages of high-interest employers with automated ATS platform and slug discovery.
7. **Multi-Hunt Search Buckets:** Organizing distinct search campaigns (e.g., "Jobs for Me", "Software Clients", "Paper Factory Raw Materials") with separate keywords, locations, sources, and pitches.
8. **Mute Rules Engine:** Global filtering of recruiting spam, staffing agencies, or unwanted title keywords across all automated crawlers.
9. **Leads & Contact Management:** Centralized directory of hiring managers, recruiters, and business prospects, supporting individual creation, bulk text parsing, and Google Places discovery.
10. **Context-Aware Outreach Messaging:** Automated draft creation matching specific communication channels (LinkedIn, WhatsApp, Email) and personas, complete with a review, edit, and copy-to-send workflow.
11. **Kanban Pipeline Tracker:** Visual drag-and-drop board tracking leads and contacts across 8 relationship stages from initial identification to offer.
12. **Automated Nightly Digest:** Scheduled cron jobs sending ranked job briefings via Resend transactional email and Telegram bot integration.
13. **Settings & Secure Credentials:** Encrypted storage of third-party API keys, custom scraping proxies, and daily notification preferences.

---

## 2. Problems This Project Solves

### Problem: Fragmented Job Hunting Across Multiple Portals

**Before / Without the System**  
Job seekers must maintain accounts and bookmarks across a dozen disparate job boards (LinkedIn, Indeed, RemoteOK, Wuzzuf, Greenhouse career portals, Hacker News). Each platform has different search syntax, varying notification frequencies, and zero interoperability. Candidates waste hours re-entering identical search parameters and manually filtering through repetitive listings.

**Solution in This Project**  
Einherji centralizes over 20 job sources into a unified ingestion pipeline. A single search query checks enterprise ATS endpoints, public aggregators, freelance boards, and regional crawlers simultaneously, loading all normalized opportunities into one consistent database.

**Features Involved**  
Multi-Tier Scraping Engine, Tracked Companies, Source Registry, Keyset Search Pagination.

**Result**  
Users manage a single unified feed instead of 15 separate browser tabs, cutting discovery time by an estimated 80%.

---

### Problem: Syndicated Job Duplication

**Before / Without the System**  
A single remote software engineering opening is commonly syndicated across RemoteOK, Arbeitnow, Jobicy, and LinkedIn. Candidates repeatedly click, read, and evaluate the same job posting under different layout wrappers, wasting mental energy and risking duplicate applications.

**Solution in This Project**  
Einherji generates a normalized cross-source deduplication fingerprint (`dedupeKey`) combining stripped company names, clean title tokens, and normalized cities. When a new posting matches an existing fingerprint, it is automatically recognized as an existing job; the secondary source is appended to the job's `alsoOnSources` array rather than inserting a duplicate row.

**Features Involved**  
Cross-Source Deduplication (`buildDedupeKey`), Source Ingestion Engine, Jobs Database Schema.

**Result**  
A clean, deduplicated feed where each distinct opening appears exactly once, showing all portals where it is listed.

---

### Problem: Misleading Job Metadata & Deceptive Postings

**Before / Without the System**  
Job postings frequently mislead candidates: a title says "Senior Engineer" but the body specifies 2 years of experience; a job is tagged as "Remote" but buried text mandates living in Munich; salary ranges are quoted in disparate periods ($60,000/year vs $5,000/month vs $35/hour). Users must carefully read lengthy job descriptions just to discover basic disqualifiers.

**Solution in This Project**  
The AI Fact Extraction engine reads raw descriptions once, parses them against a strict Zod contract, and populates explicit database columns: true assessed seniority, minimum required years of experience, normalized annual salary (with original currency), true remote policy (remote, hybrid, onsite), visa sponsorship availability, and primary posting language.

**Features Involved**  
AI Fact Extraction, Salary Normalization (`annualiseSalary`), Job Facts Strip, Advanced Filter Bar.

**Result**  
Candidates can instantly filter and sort by true seniority, normalized annual compensation, and verified remote policies, bypassing misleading titles and tags.

---

### Problem: Triage Fatigue & Repetitive Evaluation

**Before / Without the System**  
Triage requires opening each link in a new tab, scrolling, deciding whether to apply, closing the tab, and recording the decision. Evaluating 100 daily postings takes hours of mouse-clicking and context-switching.

**Solution in This Project**  
Einherji provides a high-density, keyboard-driven workbench inspired by terminal-based workflows. Using single keystrokes (`j`/`k` to navigate, `s` to shortlist, `a` to mark applied, `x` to dismiss with a reason, `o` to open external link), users can process an entire queue of 50 new jobs in under 5 minutes without touching the mouse.

**Features Involved**  
Keyboard Triage Hook (`useJobTriageKeyboard`), Quick Action Controls, Dismiss Reason Dialog, Job Status Engine.

**Result**  
Users clear incoming job queues rapidly, transforming job triage from an agonizing chore into a brisk, organized routine.

---

### Problem: Uncalibrated Job Fit & Generic Applications

**Before / Without the System**  
Candidates submit identical resumes to roles where they only meet a fraction of the qualifications, or fail to emphasize key matching skills because they did not analyze the posting in depth. Recruiters reject generic applications within seconds.

**Solution in This Project**  
The AI Fit Report benchmarks the candidate's parsed CV against the job description line-by-line. It returns an objective match percentage, a concise summary, a breakdown of every stated requirement with a verdict (`met`, `partial`, `missing`) grounded in specific CV evidence, key candidate gaps, and recommended skills to emphasize.

**Features Involved**  
AI Fit Analysis (`jobFitReports`), CV Parser, Job Detail Modal, Fit Report Visualizer.

**Result**  
Candidates apply only to roles where they have a competitive advantage, leading with their strongest matching qualifications.

---

### Problem: Time-Consuming Application Collateral Creation

**Before / Without the System**  
Writing tailored cover letters and answers to complex ATS essay prompts takes 30–60 minutes per application. Consequently, applicants either apply to very few jobs or send boilerplate letters that diminish response rates.

**Solution in This Project**  
The Tailored Documents engine generates custom, professional application assets with a single click: comprehensive cover letters referencing specific company initiatives, tailored resume bullet points highlighting relevant achievements, structured answers to custom application prompts, and interview preparation packages detailing likely questions and company background.

**Features Involved**  
Job Document Generator (`jobDocuments`), Model Prompt Builder, Job Document Panel.

**Result**  
High-quality, highly contextual application collateral produced in seconds, ready to be reviewed, copied, and submitted.

---

### Problem: Staffing Agency Noise & Unwanted Roles

**Before / Without the System**  
Aggressive staffing agencies (e.g., third-party recruiters reposting stale listings) and unwanted job categories clutter search feeds. Users repeatedly reject the same agencies day after day.

**Solution in This Project**  
Einherji provides global Mute Rules. Users can mute by Company (e.g., silencing a specific staffing agency) or Title Pattern (e.g., filtering out "Sales", "Intern", or "Wordpress"). When a mute rule is created, it immediately purges matching existing jobs and silently filters incoming crawled jobs at insertion time.

**Features Involved**  
Mute Rules Engine (`muteRules`), Scraper Filter Interceptor, Dismissal Reason Tracking.

**Result**  
Unwanted companies and roles are permanently eliminated from search feeds and scraper statistics.

---

### Problem: Disconnected Networking & Forgotten Follow-Ups

**Before / Without the System**  
Job hunters often apply to a job board and never reach out to hiring managers. When they do reach out, messaging is stored across personal LinkedIn inboxes, email threads, and phone logs. Follow-up deadlines are forgotten, and warm leads go cold.

**Solution in This Project**  
Einherji bridges jobs to contacts. Users can discover hiring managers via Apify or add contacts manually, generate AI outreach messages tailored to the recipient's persona and communication channel (LinkedIn, WhatsApp, Email), approve drafts in a central queue, copy them to send, and track next-action dates with prominent overdue reminders on the main dashboard.

**Features Involved**  
Leads Management, AI Message Generator, Message Approval Queue, Follow-Up Reminders, Kanban Tracker.

**Result**  
A proactive networking workflow where every application has an associated contact, a personalized outreach message, and a tracked follow-up schedule.

---

### Problem: Multi-Persona Searching (Jobs vs Freelance vs B2B)

**Before / Without the System**  
A technical professional often operates multiple revenue tracks: looking for a full-time senior engineering job, hunting for freelance web development contracts, or sourcing clients for an independent service agency. Standard job tools enforce a single search profile, mixing corporate full-time roles with freelance gigs into an unmanageable mess.

**Solution in This Project**  
Einherji introduces **Search Buckets**. Each bucket is an isolated campaign with its own name, category (`jobs`, `clients`, `suppliers`, `custom`), targeted keywords, geographic constraints, active scraper sources, and distinct pitch narrative.

**Features Involved**  
Search Buckets (`buckets`), Bucket Selector Bar, Persona-Specific Message Templates, Local Business Discovery (`places`).

**Result**  
A single account cleanly operates completely independent hunts—such as a remote software job search alongside a local commercial B2B client acquisition pipeline.

---

## 3. User Types

In the current implementation of Einherji, user accounts operate under a **Single-User Workspace Model**. There is no hierarchical organization or multi-tenant team structure (e.g., no separation between "Admin", "Manager", and "Staff" within an organization). Every registered account is fully isolated, owning 100% of its data (criteria, jobs, leads, messages, tracked companies, settings, and credentials).

However, based on the application's configuration and features, four distinct operational personas utilize the system:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          Einherji User Types                           │
├──────────────────┬──────────────────┬──────────────────┬───────────────┤
│ Full-Time Job    │ Freelance &      │ Agency & B2B     │ B2B Sourcing  │
│ Seeker           │ Contract Hunter  │ Service Provider │ & Trade User  │
├──────────────────┼──────────────────┼──────────────────┼───────────────┤
│ • Uploads CV     │ • Targets gigs   │ • Uses job posts │ • Local trade │
│ • Tracks ATS     │ • Freelancer.com │   as signals     │   prospecting │
│ • AI Fit Reports │ • HN Freelance   │ • Identifies CTO │ • Google      │
│ • Cover letters  │ • Fast client    │ • B2B service    │   Places API  │
│ • Full pipeline  │   proposals      │   pitches        │ • WhatsApp DMs│
└──────────────────┴──────────────────┴──────────────────┴───────────────┘
```

### 1. Full-Time Job Seeker (Career Advancement)
- **Who they represent:** Individual software developers, engineering managers, and technical specialists looking for salaried employment.
- **Responsibilities:** Defining target roles and compensation thresholds, uploading and updating their CV, reviewing daily incoming job matches, running AI fit reports, generating cover letters, and applying directly on employer websites.
- **What they can access:** All system areas, primarily focusing on `/criteria`, `/jobs`, `/companies`, `/messages`, and `/tracker`.
- **Primary workflows:** Daily job triage, deep posting evaluation, document generation, and direct employer application tracking.

### 2. Freelance & Contract Specialist (Project Gigs)
- **Who they represent:** Independent contractors, freelance web developers, and mobile consultants.
- **Responsibilities:** Hunting for contract and freelance opportunities, targeting specific tech stacks (e.g., React, Next.js, Flutter), crafting quick project proposals, and pitching prospective clients.
- **What they can access:** All system areas, primarily filtering `/jobs` by `workType: contract` or `workType: freelance`, configuring sources like `freelancer` and `hackernews_freelance`, and utilizing client pitch message templates.
- **Primary workflows:** Ingesting freelance marketplace feeds, generating rapid pitches based on the bucket pitch rather than a full resume, and tracking outreach.

### 3. Agency Owner / B2B Technical Service Provider (Client Acquisition)
- **Who they represent:** Boutique software agency founders and dev shop partners using hiring volume as an indicator of corporate software demand.
- **Responsibilities:** Identifying companies struggling to hire engineering staff, identifying decision-makers (CTOs, VPs of Engineering), generating outbound B2B service pitches offering staff augmentation or project delivery, and managing outbound sales pipelines.
- **What they can access:** All system areas, utilizing "Clients for us" search buckets, target company tracking, and the `client_pitch` template.
- **Primary workflows:** Ingesting corporate hiring data, manually importing decision-maker contact lists, drafting outbound pitches, and tracking business development in the Kanban board.

### 4. Local Trade Operator / Sourcing Specialist (Suppliers & Business Clients)
- **Who they represent:** Business operators and trade specialists (e.g., commercial print distributors, material suppliers, local services) sourcing local business clients or raw-material vendors.
- **Responsibilities:** Sourcing regional businesses in specific cities (e.g., Cairo, Giza), verifying phone and WhatsApp contact channels, importing verified business directories, and managing purchasing or supply inquiries.
- **What they can access:** All system areas, specifically leveraging the Google Places integration (`/places`), manual list parsing (`/leads` -> Import list), and the `supplier_enquiry` message template.
- **Primary workflows:** Live Google Places queries, bulk phone list imports, WhatsApp message generation, and supplier relationship logging.

### System Access & Permission Constraints
- **Account Isolation:** Every user can only view, create, edit, or delete records associated with their own `userId`. Data isolation is strictly enforced at the database query level (`where(eq(table.userId, userId))`).
- **Administrative Control:** There is currently no multi-user admin panel in the UI. Platform-level operational settings (such as closing public registrations via `ARE_SIGNUPS_OPEN = false`) are controlled via application configuration and environment variables.

---

## 4. Getting Started

### 1. User Registration (Account Creation)
Einherji uses **Better Auth** for email and password authentication.

```
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│ Visit /register ├──────▶│ Fill Name, Email,  ├──────▶│ Receive Email    │
└─────────────────┘       │ Password           │       │ Verification Link│
                          └────────────────────┘       └─────────┬────────┘
                                                                 │
                                                                 ▼
┌─────────────────┐       ┌────────────────────┐       ┌──────────────────┐
│ Access Main App │◀──────│ Auto-login / Click ◀──────│ Click Link / Open│
│ Dashboard       │       │ Verification Banner│       │ /verify-email    │
└─────────────────┘       └────────────────────┘       └──────────────────┘
```

1. Navigate to `/register`.
2. **Registration Status Check:**
   - If public signups are enabled (`ARE_SIGNUPS_OPEN = true`), the registration form displays:
     - Full Name (minimum 2 characters)
     - Email Address (valid format)
     - Password (minimum 8 characters)
   - If public signups are disabled (`ARE_SIGNUPS_OPEN = false`, the default private setting):
     - The page renders a locked state: *"Not taking new accounts right now. The door is shut on purpose rather than broken. It will open again."*
     - A link redirects visitors to `/login`.
3. Enter your details and submit the form.
4. Better Auth automatically creates the user record in the `user` table and creates an authenticated session.
5. If Resend email integration is configured, a verification email containing a secure token link is automatically dispatched to your inbox. In local development environments without an email key, the verification link is logged directly to the server console.

### 2. Login
1. Navigate to `/login`.
2. Enter your registered email address and password.
3. If an unauthenticated user attempts to visit a protected route (e.g., `/jobs`), the middleware automatically redirects them to `/login?next=/jobs`.
4. Upon successful login, the application evaluates the `next` parameter (enforcing safe, single-slash relative redirects to prevent open-redirect exploits) and routes you to your intended page or `/dashboard`.

### 3. Email Verification
1. Verification is not strictly blocking—users can log in immediately upon registration.
2. Unverified accounts see a verification banner prompting them to confirm their email address.
3. Clicking the email verification link directs to `/verify-email`, which verifies the token against the `verification` database table and activates the account permanently.

### 4. Initial Account Setup (Settings)
Before executing scrapes or generating documents, configure your profile and API integrations at `/settings`:
1. **User Profile:** Enter your current professional job title and LinkedIn profile URL.
2. **AI Provider Keys (Optional but Recommended):**
   - Provide your personal **OpenRouter API Key** or direct **OpenAI API Key**.
   - *Security Note:* All third-party credentials are encrypted at rest with AES-256-GCM. The browser only ever receives a masked preview (e.g., `sk-or...4a8b`). If you leave these blank, the server will utilize the platform's default shared key if configured.
3. **Apify API Token (Optional):** Add your personal Apify token if you plan to use legacy LinkedIn scraping or manager lookups.
4. **Scraping Proxy (Optional):** If you use an unblocking proxy service (e.g., ScraperAPI, ScrapingBee, Zyte), enter the provider name and API key to enable scraping on sites with aggressive anti-bot protections.
5. **Job Sources Configuration:** Toggle the specific job boards you want enabled by default for account-level searches.
6. **Daily Digest & Telegram Setup:**
   - Enable the daily digest toggle.
   - Choose your preferred channels (`Email`, `Telegram`).
   - If using Telegram, enter your Telegram Bot Token and Chat ID.

### 5. Defining Criteria & Uploading Your CV
Navigate to `/criteria` to establish your primary search baseline:
1. **Upload CV (PDF format, up to 8MB):**
   - Drop your resume into the UploadThing dropzone.
   - The file is securely uploaded, and the PDF text is extracted and passed to the AI parser.
   - The AI automatically extracts:
     - Recommended Job Titles
     - Core Technical & Professional Skills
     - A first-person 2–3 sentence Elevator Pitch
     - Formatted Resume Text
2. **Review & Adjust Criteria:**
   - **Target Job Titles:** Add or edit specific titles (e.g., "Full Stack Developer", "Next.js Engineer").
   - **Target Locations:** Specify countries or cities (e.g., "Remote", "Cairo", "Egypt", "United States").
   - **Minimum Annual Salary:** Enter your compensation floor.
   - **Company Size Bounds:** Specify preferred minimum and maximum employee counts.
   - **AI Model Selection:** Choose your default model for generations (e.g., free Llama 3.3 70B via OpenRouter, Claude Sonnet, or GPT-4o).
3. Click **Save Criteria**. This deactivates previous criteria versions and establishes your active profile.

### 6. Logging Out
Click the **Sign out** button at the bottom of the left sidebar. The session cookie is invalidated on the server and removed from the browser, redirecting you immediately to `/login`.

---

## 5. Main Application Workflow

The application operates as an interconnected, feedback-driven funnel:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        MAIN APPLICATION FUNNEL                         │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
                       [ 1. CRITERIA & BUCKETS ]
                Define target keywords, locations, pitch
                                   │
                                   ▼
                        [ 2. MULTI-SOURCE CRAWL ]
            ATS APIs + Aggregators + Marketplaces + Scrapers
                                   │
                                   ▼
                    [ 3. INGESTION, DEDUPE & SCORE ]
          Normalize, eliminate duplicates, calculate 0-100 score
                                   │
                                   ▼
                      [ 4. SUB-SECOND TRIAGE ]
             Review in /jobs: Shortlist, Dismiss, Mark Applied
                                   │
                  ┌────────────────┴────────────────┐
                  ▼                                 ▼
        [ 5A. DEEP JOB WORKFLOW ]       [ 5B. NETWORKING & LEADS ]
      • AI Fact Extraction            • Find Managers or Add Contacts
      • Line-by-Line AI Fit Report    • Generate Persona-Specific DM
      • Tailored Cover Letters & CV   • Review & Approve in Messages
                                   │                │
                                   └───────┬────────┘
                                           │
                                           ▼
                                 [ 6. MANUAL DISPATCH ]
                             Copy customized text, send via
                               LinkedIn / WhatsApp / Email
                                           │
                                           ▼
                                [ 7. PIPELINE TRACKER ]
                           Drag contacts across Kanban stages;
                              Review Dashboard Follow-ups
```

### How the Modules Connect:
1. **Criteria & Buckets Drive the Crawlers:** When a crawl starts, the scraping orchestrator checks whether you are running a specific **Bucket** (e.g., "Clients for us") or an account-level search. The active keyword array, location targets, and source selections dictate exactly which scrapers execute.
2. **Mute Rules Protect the Ingestion Pipeline:** Before any scraped job is saved to the database, it passes through the active **Mute Rules**. If the company name or title matches a mute rule, it is discarded immediately, preserving clean database state.
3. **Scoring & Deduplication Rank the Results:** Surviving postings are fingerprinted to collapse duplicates across sources, scored against the search criteria (0–100%), and inserted into the `jobs` table.
4. **Triage Feeds the Actions:** On the `/jobs` page, newly ingested jobs arrive in the `new` status. Users triage them: dismissing uninteresting roles (recording structured reasons for future analytics) or shortlisting promising positions.
5. **AI Deep Dive & Asset Generation:** Opening a shortlisted job enables two parallel workflows:
   - **Fact Extraction & Fit Reports:** Evaluates exact requirements against the user's CV.
   - **Document Generation:** Produces cover letters, answers to application forms, and interview prep.
6. **Leads & Outreach Generation:** From the job, users can click **Find Managers** (or manually add a contact) to create a record in the `leads` table linked to that job.
7. **Message Generation & Approval Queue:** From the lead, clicking **Generate Message** activates the AI to draft an outreach note using the relevant template (hiring manager, client pitch, or supplier enquiry) and the appropriate communication channel. The draft lands in `/messages` for human review and editing.
8. **Manual Send & Status Updates:** The user copies the approved message, opens the recipient's LinkedIn profile or WhatsApp chat, and sends it manually. Clicking **Mark as sent** updates the message status to `sent` and automatically advances the lead's status to `message_sent`.
9. **Visual Kanban & Follow-Up Reminders:** The contact now moves across the `/tracker` board. Setting a `nextActionAt` timestamp triggers overdue follow-up alerts on the `/dashboard`.

---

## 6. Feature Documentation

---

## Feature: Career Criteria & CV Parser

### Purpose
Allows users to upload their resume, automatically extract structured skills and career summaries, define target titles, salary expectations, and geographic boundaries, and select their preferred AI model.

### Problem It Solves
Entering dozens of skills, elevator pitches, and search parameters by hand is tedious. Furthermore, matching algorithms often lack access to raw resume text, leading to inaccurate evaluations.

### Who Uses It
Job seekers and professionals configuring their career baseline.

### When It Is Used
During initial setup and whenever the user updates their resume, adjusts target compensation, or changes target roles.

### How to Access It
Navigate to `/criteria` in the left sidebar.

### Complete Workflow
1. User navigates to `/criteria`.
2. User drops a PDF resume into the upload container.
3. The file is uploaded to UploadThing; an authenticated URL is returned.
4. The client invokes `criteria.extractFromCv` with the URL.
5. The server checks the quota (`parse_cv`), validates the URL against SSRF rules, downloads the PDF, extracts raw text using `unpdf`, and sends the first 6,000 characters to the configured AI model.
6. The AI returns a JSON structure containing: `skills`, `elevatorPitch`, `suggestedTitles`, and cleaned `resumeText`.
7. The form fields are automatically populated with the extracted data.
8. User reviews the fields, modifies titles or locations, enters a minimum salary, and selects an AI model from the dropdown.
9. User clicks **Save Criteria**.
10. The system deactivates existing criteria rows and inserts the new active record.
11. A success notification is displayed.

### Inputs
- CV PDF file (max 8MB).
- Target Job Titles (array of strings, minimum 1).
- Target Locations (array of strings, minimum 1).
- Minimum Salary (integer, optional).
- Company Size Bounds (min/max integers, optional).
- Skills (array of strings).
- Elevator Pitch & Resume Text (free text).
- AI Model ID (selected from available OpenRouter/OpenAI models).

### Outputs
- An active `criteria` database row linked to the user.
- Updated form state with extracted resume content.

### Connected Features
- **Scraping Engine:** Uses active criteria titles, locations, and salary when running account-level crawls.
- **Job Scoring:** Compares job titles and descriptions against active criteria skills and titles.
- **Fit Reports & Document Generation:** Uses active criteria resume text and skills to evaluate candidate alignment.

### Business Rules
- Only **one** criteria record can be active (`isActive = true`) per user at any time. Saving new criteria deactivates all previous records.
- CV URL scheme must be HTTP/HTTPS; private IP addresses, loopback addresses, and AWS metadata endpoints (`169.254.169.254`) are strictly blocked.

### Validation
- At least one job title and one location are mandatory.
- Minimum salary must be non-negative.
- The model identifier must match a valid available provider ID.

### Permissions
- Any authenticated user can view and edit their own criteria. Users cannot view or modify criteria belonging to other accounts.

### Edge Cases
- **Scanned or Image-Only PDFs:** If the PDF contains no extractable text, the parser returns empty arrays and preserves raw text without throwing an unhandled exception.
- **Rate Limit / Credit Depletion:** If OpenRouter/OpenAI returns a 429 or 402, the UI displays a specific, friendly toast explaining provider unavailability rather than a generic crash.

### Technology Used
- **UploadThing:** Authenticated file upload and temporary storage.
- **unpdf:** Server-side, lightweight PDF text extraction without native binary dependencies.
- **OpenRouter / OpenAI SDK:** Structured JSON extraction via LLM completions.
- **Zod & React Hook Form:** Client-side form management and server-side input validation.
- **Drizzle ORM & PostgreSQL:** Relational storage with composite indexes (`(userId, isActive)`).

### Why This Technology Is Used Here
`unpdf` enables zero-dependency PDF text extraction directly in serverless execution environments. Zod guarantees that untrusted AI completion text adheres strictly to expected TypeScript types before reaching the database.

---

## Feature: Multi-Tier Job Scraping Engine

### Purpose
Aggregates job listings across company-hosted ATS platforms, open web aggregators, freelance project marketplaces, credentialed search engines, and scraped public feeds.

### Problem It Solves
Job postings are siloed across dozens of walled gardens. Manually browsing each platform takes hours and leads to missed opportunities.

### Who Uses It
All user types (job seekers, contractors, agency founders).

### When It Is Used
Executed manually via the **Run daily scrape** button on the Dashboard or Jobs page, or triggered automatically overnight via the automated daily cron job.

### How to Access It
Click **Run daily scrape** on `/dashboard` or `/jobs`, or configure automated execution in `/settings`.

### Complete Workflow
1. User clicks **Run daily scrape** (or triggers it with a specific Bucket selected).
2. The client calls `scraping.start`.
3. The server checks for existing in-flight scrapes for this user:
   - If a scrape is currently running and active, the request is rejected with a `409 Conflict`.
   - If a previous scrape has been running for longer than the timeout threshold, it is automatically marked failed as a stale run.
4. Quota check consumes one unit of the rolling 24-hour `scrape` quota.
5. The system resolves the search configuration:
   - If a `bucketId` is provided, the bucket's specific keywords, locations, and source selections override global defaults.
   - Otherwise, active account criteria and settings sources are used.
6. A new record is created in `scrape_runs` in the `running` state.
7. An abort timer is initialized (capped at a 60-second runtime budget to survive serverless function limits).
8. The engine executes tasks across enabled source categories:
   - **ATS Boards:** Direct API queries to Greenhouse, Lever, Ashby, Workable, SmartRecruiters, and Rippling for all tracked companies matching active ATS providers.
   - **Aggregators:** Queries RemoteOK, Arbeitnow, Jobicy, The Muse, Himalayas, We Work Remotely, Hacker News, and Wuzzuf (via sitemap crawling).
   - **Marketplaces:** Queries Freelancer.com API and Hacker News "Seeking Freelancer" threads.
   - **Credentialed Sources:** Queries Adzuna, SerpAPI (Google Jobs), Reddit, or X/Twitter using encrypted keys saved in Settings.
   - **Scraped Feeds:** Queries public LinkedIn guest job listings.
9. Results are normalized into standard `ScrapedJob` objects and validated against Zod schemas.
10. Listings pass through query matching and the user's active **Mute Rules**.
11. Surviving jobs are fingerprinted, scored against active criteria, and written to the database in batches.
12. Task progress (`tasksCompleted`, `jobsFound`, `jobsInserted`) is updated continuously in the `scrape_runs` table.
13. The client polls `scraping.latestRun` to update the visual progress bar and outcome summary in real time.

### Inputs
- Optional `bucketId` (to scope scrape to a specific hunt).
- Optional `sources` array (overrides default enabled sources).
- Optional `workTypes` array (filters for full_time, contract, freelance, etc.).

### Outputs
- A finalized `scrape_runs` record with execution statistics and error summaries.
- Newly inserted rows in the `jobs` table (status `new`).
- Updated `lastSeenAt` timestamps for existing postings re-encountered during the crawl.

### Connected Features
- **Tracked Companies:** Ingests jobs from company boards resolved in the companies module.
- **Search Buckets:** Scopes keywords, locations, and sources.
- **Mute Rules:** Discards matching postings before database insertion.
- **Usage Engine:** Deducts daily scrape quota.
- **Jobs Workbench:** Displays newly found and ranked postings.

### Business Rules
- **Concurrency Guard:** A user can have only **one** actively running scrape at any time, enforced by a unique partial index on `scrape_runs(user_id) WHERE status = 'running'`.
- **Fail-Safe Task Isolation:** A failure in one scraper adapter (e.g., an invalid Adzuna API key or an ATS board 404) does not abort the entire run; the failure is logged to `taskErrors`, and remaining tasks continue.
- **Time Ceiling:** Runs are strictly bounded to 60 seconds. Postings found prior to the timeout are safely persisted.

### Validation
- Source names must exist in the validated `JobSourceName` enum.
- Scraped external data must pass Zod runtime schema validation (`scrapedJobSchema`).

### Permissions
- Any authenticated user can trigger a scrape. Scrapes operate strictly within the requesting user's account and credentials.

### Edge Cases
- **Stale Runs:** If a serverless function terminates abruptly without updating the database, the next scrape attempt detects the stale run (>5 minutes old), marks it failed, and proceeds normally.
- **Double Clicks:** If a user double-clicks the button, the second mutation is rejected by the database unique constraint and displays an informative alert.

### Technology Used
- **Next.js Route Handlers & tRPC:** API orchestration.
- **AbortController:** Enforcing strict runtime execution budgets.
- **Linkedom:** Lightweight HTML DOM parsing for sitemap and guest scraper parsing.
- **Drizzle ORM & Neon Postgres:** Relational persistence with partial indexes.

### Why This Technology Is Used Here
Direct ATS API queries are 100% free, require no third-party API keys, and experience zero IP blocking compared to brittle browser-automation scrapers.

---

## Feature: Cross-Source Deduplication & Relevance Scoring

### Purpose
Eliminates duplicate postings syndicated across multiple job boards and ranks all incoming listings from 0 to 100 based on title alignment, recency, remote availability, and presence of compensation data.

### Problem It Solves
Raw scraper feeds present duplicate entries for syndicated jobs and arrange listings strictly by raw publication date, burying the best matches beneath hundreds of irrelevant postings.

### Who Uses It
Job seekers and agency operators triaging feeds.

### When It Is Used
Executes automatically inside the database insertion transaction during every scrape run.

### How to Access It
View the **Score** badge and sort order on `/jobs`.

### Complete Workflow
1. Scraper yields a batch of normalized `ScrapedJob` objects.
2. For each job, the system computes a deterministic `dedupeKey`:
   - Company name is normalized: legal suffixes (`Inc`, `LLC`, `Ltd`, `GmbH`, `Corp`) are stripped.
   - Title is normalized: decoration brackets (e.g., `(m/f/d)`, `[Remote]`) and arrangement noise words (`hybrid`, `contract`) are removed, and significant words are sorted alphabetically.
   - City is normalized to its primary token.
   - Example: *"Acme, Inc."* + *"Senior Frontend Developer (Remote)"* + *"Cairo, Egypt"* -> `acme|developer frontend senior|cairo`.
3. The system checks for existing database rows matching this `dedupeKey` for the user.
4. If a match is found:
   - The new listing is recognized as a duplicate.
   - The secondary source name is appended to the existing job's `alsoOnSources` array.
   - The duplicate is not inserted as a separate row.
5. If the job is new:
   - `scoreJob` evaluates the listing against active search criteria:
     - **Title Match (up to 45 pts):** Share of criteria title terms present in the job title/tags.
     - **Recency (up to 25 pts):** Freshness decay over a 30-day horizon; postings under 48 hours receive bonus points.
     - **Salary Listed (10 pts):** Rewards transparent compensation listings.
     - **Remote Availability (10 pts):** Rewards verified remote roles.
     - **Description Quality (10 pts):** Rewards substantial descriptions (>200 characters).
   - Score and human-readable score reasons (e.g., *"matches React, TypeScript; posted in last 48 hours; salary listed"*) are stored on the job record.
6. The job is inserted with its calculated score and deduplication key.

### Inputs
- Job title, company, location, tags, salary, description, and publication date.
- Active user search criteria or bucket query parameters.

### Outputs
- Normalized `dedupeKey` string.
- Calculated integer `score` (0–100) and `scoreReasons` array on the `jobs` row.

### Connected Features
- **Jobs Table & Cards:** Displays the numerical score badge with tooltip breakdown.
- **Default Sorting:** The jobs list defaults to `sort: "score"` (descending order).
- **Daily Digest:** Selects the top 5 highest-scoring jobs found since the last digest.

### Business Rules
- Scoring occurs at **insert time**, not read time, so thousands of rows can be sorted efficiently inside PostgreSQL using composite indexes (`(userId, status, score DESC)`).

### Validation
- Scores are strictly clamped between 0 and 100.

### Permissions
- Any authenticated user. Operates strictly on user-owned rows.

### Edge Cases
- **No Search Criteria Configured:** If a user runs a crawl without saving criteria titles, the title-match weight defaults to full points to prevent penalizing every job uniformly.

### Technology Used
- **TypeScript String Processing:** Regex-based title cleaning and stop-word filtering.
- **PostgreSQL B-Tree Indexes:** High-speed sorting and keyset pagination.

### Why This Technology Is Used Here
Computing scores in application code before insertion allows complex, explainable ranking logic without overburdening the database with heavy custom SQL functions.

---

## Feature: Keyboard-Driven Job Triage Workbench

### Purpose
Enables users to review hundreds of job postings, inspect details, update pipeline stages, assign dismissal reasons, and launch applications using single-stroke keyboard shortcuts.

### Problem It Solves
Using a mouse to click through hundreds of job cards causes wrist fatigue, slow evaluation speeds, and high drop-off rates during job hunting.

### Who Uses It
Active job seekers triaging incoming daily roles.

### When It Is Used
Daily or several times a week on the `/jobs` page.

### How to Access It
Navigate to `/jobs`. Press `?` to view the keyboard shortcut modal.

### Complete Workflow
1. User navigates to `/jobs`.
2. The list loads the highest-scoring jobs in the `new` status.
3. User presses `j` (or down arrow) to move the active cursor down, or `k` (or up arrow) to move up.
4. User evaluates the active job card:
   - Press `Enter`: Opens the deep-dive Job Detail Panel.
   - Press `s`: Immediately moves the job to `shortlisted`.
   - Press `a`: Immediately moves the job to `applied` and stamps `appliedAt` with the current time.
   - Press `x`: Opens the structured Dismiss Reason dialog. User presses a number or selects a reason (`wrong_seniority`, `wrong_stack`, `location`, `salary`, `company`, `other`), moving the job to `dismissed`.
   - Press `o`: Opens the live external job posting URL in a new browser tab.
   - Press `Space`: Toggles checkbox selection on the job for bulk actions.
   - Press `/`: Jumps focus directly to the text search filter box.
   - Press `Esc`: Clears active selections, closes open drawers, or exits the search box.
5. All status transitions record an entry in the `job_events` timeline table.
6. The UI updates optimistically, removing dismissed or moved jobs from the active view.

### Inputs
- Single keystroke events (`j`, `k`, `s`, `a`, `x`, `o`, `Enter`, `Space`, `/`, `?`, `Esc`).
- Optional dismissal reason selection and context notes.

### Outputs
- Real-time updates to `jobs.status`, `jobs.statusChangedAt`, `jobs.appliedAt`, and `jobs.dismissReason`.
- New records in `job_events`.

### Connected Features
- **Job Events Timeline:** Records who moved the job, the prior status, the new status, and timestamp.
- **Filter Bar:** Reflects active pipeline status counts.
- **Bulk Selection Bar:** Appears when multiple jobs are selected via `Space`.

### Business Rules
- **Typing Guard:** Keyboard shortcuts are completely suppressed whenever the browser focus is inside an `<input>`, `<textarea>`, `<select>`, or content-editable container. `Esc` is the only key active during typing to exit focus.
- **Terminal States:** Moving a job to `dismissed`, `rejected`, or `ghosted` marks it terminal, removing it from default open views while preserving data for historical reporting.

### Validation
- Status values must strictly match the `JobStatus` enum.

### Permissions
- Any authenticated user. Operates strictly on user-owned jobs.

### Edge Cases
- **Bulk Triage:** Selecting 20 jobs with `Space` and clicking bulk dismiss or bulk move processes all rows in a single batch database transaction.

### Technology Used
- **React Custom Hooks (`useJobTriageKeyboard`):** Window-level event listener management.
- **TanStack Query:** Cache invalidation and optimistic UI updates.
- **Radix UI Dialog Primitives:** Accessible modals for dismissal reasons and shortcut help.

### Why This Technology Is Used Here
Muscle-memory keyboard navigation mirrors professional productivity tools (like Superhuman or Vim), drastically reducing the cognitive overhead of job hunting.

---

## Feature: AI Fact Extraction & Line-by-Line Fit Reports

### Purpose
Analyzes unstructured job descriptions with a language model to extract concrete career attributes and benchmarks the user's CV line-by-line against every stated job requirement.

### Problem It Solves
Job postings hide critical requirements in long paragraphs of corporate boilerplate. Candidates cannot easily tell if they meet 4 of 8 requirements or 8 of 8, leading to poorly targeted applications.

### Who Uses It
Job seekers deciding whether a specific role is worth an application.

### When It Is Used
From the Job Detail Panel on `/jobs`, accessed when inspecting a shortlisted opening.

### How to Access It
Click any job card on `/jobs` to open the detail panel, then click **Generate Fit Report** or **Extract Facts**.

### Complete Workflow
1. User opens a job card.
2. Under the **Overview** tab, user clicks **Extract Facts** (or runs **Analyse Backlog** for a batch):
   - Server consumes quota (`extract_job_facts`).
   - The LLM parses the description and returns: assessed seniority (`junior`, `mid`, `senior`, `staff`, `principal`, `lead`), minimum experience years, tech stack array, normalized annual salary band, remote policy (`remote`, `hybrid`, `onsite`), visa sponsorship flag, and posting language.
   - The job row is updated, and the **Job Facts Strip** renders clear visual badges.
3. User navigates to the **Fit Report** tab and clicks **Generate Fit Report**:
   - Server checks for an existing report for this job; if one exists and `regenerate` is false, it returns the cached report immediately to prevent unnecessary AI spending.
   - If generating fresh, the server consumes quota (`generate_fit_report`).
   - The prompt provides the user's parsed CV and the raw job description to the model.
   - The model evaluates each requirement, outputting:
     - `matchPercent`: 0–100 integer.
     - `summary`: High-level fit overview.
     - `requirements`: Array of objects containing `requirement` text, `verdict` (`met`, `partial`, `missing`), and specific quoting `evidence` from the candidate's CV.
     - `gaps`: Key missing qualifications.
     - `emphasise`: Strengths to highlight.
   - The report is saved to `job_fit_reports`.
4. The UI renders an interactive scorecard showing match percentage, color-coded requirement badges, missing gaps, and tactical application advice.

### Inputs
- Job ID.
- Candidate active criteria resume text and skills.
- Optional `regenerate` boolean flag.

### Outputs
- Populated fact columns on the `jobs` row (`seniority`, `salaryMinAnnual`, etc.).
- A persistent `job_fit_reports` row containing requirement breakdown JSON.

### Connected Features
- **Job Filters:** Extracted facts unlock filtering by assessed seniority, verified remote policy, and annual salary floor.
- **Document Generation:** Cover letters and answers reference the gaps and emphasis areas identified in the fit report.

### Business Rules
- **Cache by Default:** Opening an existing fit report never triggers an AI completion unless the user explicitly clicks **Regenerate**.
- **Evidence Requirement:** A verdict of `met` or `partial` must quote specific evidence from the user's CV; otherwise, it is flagged as `missing`.

### Validation
- Input JSON must validate against `fitReportSchema` and `extractedJobFactsSchema`.

### Permissions
- Authenticated owner of the job.

### Edge Cases
- **Vague Descriptions:** If a job description lists no concrete years of experience or salary, fields are set to `null` rather than hallucinations.

### Technology Used
- **OpenRouter / OpenAI API:** LLM JSON mode completions.
- **JSONB in Neon Postgres:** Efficient storage of semi-structured requirement arrays.
- **Tailwind CSS & Lucide Icons:** Clean, visual scorecard presentation.

### Why This Technology Is Used Here
Storing structured facts directly on the `jobs` row allows Postgres to execute instant WHERE filtering across seniority and compensation without needing costly runtime joins or joins across JSON blobs.

---

## Feature: Tailored Application Document Generator

### Purpose
Produces custom application collateral (cover letters, targeted CV achievement bullet points, custom application form essay answers, and interview prep guides) grounded directly in the job description and user background.

### Problem It Solves
Job seekers spend 30–60 minutes per application manually drafting tailored essays and letters. Boilerplate templates achieve low recruiter conversion.

### Who Uses It
Job seekers preparing to apply for shortlisted roles.

### When It Is Used
On the `/jobs` detail panel under the **Documents** tab when preparing an application.

### How to Access It
Open a job's detail panel on `/jobs`, switch to the **Documents** tab, select a document type, and click **Generate**.

### Complete Workflow
1. User opens a job on `/jobs` and navigates to the **Documents** tab.
2. User chooses one of four document types:
   - **Cover Letter:** A targeted letter linking past experience to the role.
   - **Application Answer:** Answers custom ATS form questions (e.g., *"Describe a time you solved a complex scalability challenge"*). Requires pasting the question into the prompt input.
   - **Tailored CV Bullets:** 4–6 high-impact resume bullet points re-framed around the specific posting requirements.
   - **Interview Prep:** A briefing pack detailing likely technical questions, behavioral themes, and strategic questions to ask the interviewer.
3. User clicks **Generate [Document Name]**.
4. The client calls `jobDocuments.generate`.
5. Quota check consumes one unit of `generate_document`.
6. Server loads the job description, active CV text, elevator pitch, and skills.
7. The prompt is assembled and dispatched to the user's selected AI model.
8. The generated document body is stored in `job_documents`.
9. The UI displays the document with an instant **Copy to clipboard** button and formatted Markdown rendering.
10. Users can generate multiple drafts or different document types for the same job; all versions are preserved in reverse chronological order.

### Inputs
- `jobId` (string).
- `kind` (`cover_letter`, `application_answer`, `cv_bullets`, `interview_prep`).
- Optional `prompt` (mandatory when `kind` is `application_answer`).

### Outputs
- A new row in `job_documents` containing the generated text, prompt, and model used.

### Connected Features
- **CV Profile:** Supplies candidate background and achievement history.
- **Job Detail Panel:** Hosts the document creation interface.

### Business Rules
- Prompt validation: If `kind` is `application_answer`, a non-empty `prompt` string (max 600 characters) must be supplied.

### Validation
- Prompt lengths and kind enums are verified via Zod.

### Permissions
- Authenticated owner of the job.

### Edge Cases
- **Multiple Questions:** Users can generate answers for 5 different application questions on the same job; each appears as an independent, labeled card in the document list.

### Technology Used
- **OpenRouter / OpenAI:** AI completion generation.
- **Drizzle ORM & Postgres:** Cascade-deletion storage linked to `jobs.id`.
- **Clipboard API:** One-click copy functionality with visual toast feedback.

### Why This Technology Is Used Here
Separating documents into a dedicated relational table allows unlimited historical drafts and question-answer pairs per job application without bloating the core `jobs` table.

---

## Feature: Tracked Companies & Automated ATS Detection

### Purpose
Allows users to maintain a target employer list and automatically detects their underlying ATS software (Greenhouse, Lever, Ashby, Workable, SmartRecruiters, Rippling) and board slug.

### Problem It Solves
Many top-tier employers never post on public aggregators; they publish roles exclusively to their proprietary ATS career pages. Finding the exact board slug manually is difficult.

### Who Uses It
Job seekers with target company wishlists and B2B agency operators monitoring client accounts.

### When It Is Used
When adding dream companies to monitor on `/companies`.

### How to Access It
Navigate to `/companies` in the sidebar.

### Complete Workflow
1. User navigates to `/companies`.
2. User enters a Company Name (e.g., "Stripe") and an optional Careers URL (e.g., "https://stripe.com/jobs").
3. User clicks **Add Company**.
4. The server creates the company record in `tracked_companies`.
5. `detectAts` executes in the background:
   - Evaluates the provided careers URL or queries the company name.
   - Inspects URL redirects, page HTML, and embedded iframe scripts for known ATS vendor signatures:
     - `boards.greenhouse.io/<slug>` -> `greenhouse`
     - `jobs.lever.co/<slug>` -> `lever`
     - `jobs.ashbyhq.com/<slug>` -> `ashby`
     - `apply.workable.com/<slug>` -> `workable`
     - `careers.smartrecruiters.com/<slug>` -> `smartrecruiters`
     - `rippling-ats.com/<slug>` -> `rippling`
6. If an ATS provider and board slug are identified, `setCompanyAts` updates the record immediately.
7. If detection fails, the company remains saved as "unresolved." The user can re-run detection or enter the ATS provider and slug manually.
8. On every subsequent scrape run, the scraper orchestrator automatically queries the official public API endpoints for all resolved tracked companies.

### Inputs
- Company Name (string, max 120 chars).
- Careers Page URL (optional HTTP/HTTPS URL).
- Manual ATS Provider & Slug overrides (optional).

### Outputs
- A `tracked_companies` row with resolved `atsProvider` and `atsSlug`.
- Direct job ingestion during scraping runs.

### Connected Features
- **Scraper Engine:** Loops through all resolved tracked companies during every crawl, pulling 100% official direct openings.

### Business Rules
- Unique constraint: A user cannot add the same company name twice (`uniqueIndex(userId, name)`).
- SSRF protection: Careers URLs are fetched server-side only after passing strict IP address and hostname validation.

### Validation
- URLs must be valid HTTP/HTTPS schemes. ATS providers must match supported vendor enums.

### Permissions
- Authenticated user owning the company record.

### Edge Cases
- **Custom Domains:** When companies use custom domains (e.g., `careers.airbnb.com` pointing to Greenhouse), the detector fetches the page, follows redirects safely, and inspects script tags to extract the underlying slug.

### Technology Used
- **Custom ATS Detection Engine (`detect-ats.ts`):** Pattern recognition and HTML header analysis.
- **SSRF Safe Fetcher:** Protected HTTP client preventing intranet probing.

### Why This Technology Is Used Here
Direct ATS board APIs are free, unthrottled, and return structured JSON, completely eliminating the need for expensive third-party scraping services.

---

## Feature: Multi-Hunt Search Buckets

### Purpose
Allows users to partition their job search and business development efforts into distinct campaigns (e.g., "Jobs for me", "Clients for us", "Paper Factory", "Clothing Suppliers") with independent keywords, locations, sources, and pitches.

### Problem It Solves
Users frequently operate multiple simultaneous hunts—such as searching for a remote engineering job while simultaneously looking for freelance mobile app clients or sourcing industrial raw materials. A single criteria profile conflates these searches.

### Who Uses It
Freelancers, agency founders, and versatile professionals.

### When It Is Used
Created in `/settings` or during onboarding; selected via the bucket switcher bar at the top of `/jobs`, `/leads`, and `/tracker`.

### How to Access It
Use the horizontal **Bucket Bar** atop the Jobs, Leads, and Tracker views, or manage buckets under `/settings`.

### Complete Workflow
1. User clicks **New Bucket** (or runs the starter bucket seeding script).
2. User selects a **Bucket Kind**:
   - `jobs`: Permanent roles for oneself. Suggests ATS boards and aggregators.
   - `clients`: Companies needing software built. Suggests freelance boards and aggregators.
   - `suppliers`: Vendors to purchase from. Sets sources to manual by default.
   - `custom`: Blank configuration.
3. User enters a Bucket Name, search keywords, target locations, active scraper sources, and a dedicated **Pitch**.
4. Saving creates a `buckets` database record.
5. In the UI, clicking a bucket tab filters the entire view:
   - `/jobs`: Displays only listings filed under this bucket (plus unfiled jobs under "All").
   - `/leads`: Shows contacts associated with this bucket.
   - `/tracker`: Displays Kanban cards belonging to this bucket.
6. Clicking **Run scrape** while a bucket is active runs the crawl using **only** that bucket's keywords, locations, and sources.
7. Generating outreach messages for contacts in this bucket uses the bucket's custom **Pitch** instead of the user's personal resume.

### Inputs
- Bucket Name (string, max 80 chars).
- Kind (`jobs`, `clients`, `suppliers`, `custom`).
- Keywords & Locations (arrays of strings).
- Sources (array of validated `JobSourceName`).
- Pitch (free text, up to 2,000 characters).

### Outputs
- A `buckets` database record.
- Automatic association of scraped jobs and contacts with `bucketId`.

### Connected Features
- **Scraper Engine:** Uses bucket queries when executed with a `bucketId`.
- **AI Outreach Generator:** Uses `bucket.pitch` as the sender narrative in outbound messages.
- **Jobs, Leads, & Tracker Views:** Provides one-click tabbed filtering.

### Business Rules
- Bucket names must be unique per user account (`uniqueIndex(userId, name)`).
- Deleting a bucket cascades to delete its filed jobs, but **sets `bucketId` to null** on associated leads and messages. Contacts represent real people/businesses and are never deleted when a hunt is removed.

### Validation
- Name is required; arrays cannot exceed 30 items.

### Permissions
- Authenticated user owning the bucket.

### Edge Cases
- **Manual-Only Buckets:** A bucket can have an empty `sources` array (e.g., for local supplier lists built by hand). Attempting to run an automated scrape on a manual bucket displays an informative error directing the user to add contacts via import or Places search.

### Technology Used
- **Drizzle ORM & Postgres:** Foreign key relationships with selective cascade policies.
- **Zod Schemas:** Strict create vs. update validation preventing accidental keyword erasure.

### Why This Technology Is Used Here
Buckets generalize the application from an individual job-search tool into a multi-track outbound pipeline platform without requiring separate databases or accounts.

---

## Feature: Global Noise Filtering via Mute Rules

### Purpose
Permanently silences unwanted companies (e.g., aggressive staffing agencies) or irrelevant job titles (e.g., "Sales", "Intern") across all crawlers and existing lists.

### Problem It Solves
Third-party staffing agencies frequently flood job boards with dozens of duplicate or low-quality job postings, cluttering the user's feed day after day.

### Who Uses It
All users triaging high-volume job markets.

### When It Is Used
Created on-the-fly when encountering an unwanted company or title on `/jobs`, or managed under Settings.

### How to Access It
Click the ban icon on any job card on `/jobs`, or manage rules in the Mute Rules dialog.

### Complete Workflow
1. User identifies an unwanted posting on `/jobs` (e.g., from a staffing firm like "CyberCoders").
2. User clicks the mute action.
3. User selects the rule kind:
   - `company`: Mutes exact or normalized company name.
   - `title`: Mutes any job containing a specific title phrase.
4. User confirms whether to `dismissExisting` (defaults to true).
5. The server creates a `mute_rules` record.
6. If `dismissExisting` is true, the server executes an immediate bulk update moving all existing jobs matching the pattern to `dismissed` with `dismissReason = "muted"`.
7. On every subsequent scrape run, all active mute rules are loaded into memory once.
8. Incoming scraped jobs matching any mute rule are split off before insertion; they are excluded from the feed, and the final scrape summary reports: *"X postings hidden by your mute rules."*

### Inputs
- `kind` (`company` or `title`).
- `pattern` (string, 2–120 characters).
- `dismissExisting` (boolean).

### Outputs
- A `mute_rules` database record.
- Immediate dismissal of matching existing jobs.
- Automatic discarding of matching future crawled jobs.

### Connected Features
- **Scraper Service:** Intercepts scraped batches at insertion time.
- **Jobs Feed:** Immediately removes muted postings.

### Business Rules
- Matching is case-insensitive and whitespace-normalized.
- Unique constraint: A user cannot create the identical rule pattern and kind twice.

### Validation
- Patterns must be at least 2 characters long to prevent accidental muting of entire feeds.

### Permissions
- Authenticated user owning the rule.

### Edge Cases
- **Deleting a Rule:** Deleting a mute rule immediately stops filtering future crawlers. Previously dismissed jobs remain in the `dismissed` status unless reopened manually.

### Technology Used
- **In-Memory Text Normalization (`matches-mute-rule.ts`):** Evaluates rules in Node.js memory during scrapes to prevent thousands of unnecessary database queries.
- **Drizzle SQL Operators:** Bulk updating existing records using `ilike`.

### Why This Technology Is Used Here
Applying mute rules at insertion time prevents the database from accumulating thousands of junk rows that would permanently slow down search queries and distort statistics.

---

## Feature: Saved Views Tab System

### Purpose
Allows users to save complex combinations of filters, search queries, and sort orders as permanent, named tabs atop the Jobs page.

### Problem It Solves
Re-applying the same 5 filters (e.g., "Remote only, score 70+, posted this week, full-time, senior") every morning is annoying and causes users to stop filtering.

### Who Uses It
Active daily job hunters.

### When It Is Used
Created once on `/jobs` and clicked daily for quick access.

### How to Access It
At the top of the `/jobs` page, above the job cards, rendered as interactive tabs.

### Complete Workflow
1. User adjusts filters on `/jobs` (e.g., sets `isRemote: true`, `minScore: 75`, `postedWithinDays: 7`, `seniorities: ["senior", "staff"]`).
2. User clicks **Save View**.
3. User enters a descriptive name (e.g., "Top Remote Senior").
4. The system validates the active filter object and saves a `saved_views` record storing the filter JSON and tab position.
5. The new view appears as a dedicated tab alongside default views ("All", "Shortlisted", "Applied").
6. Clicking the tab instantly applies the stored filter set and updates the URL query parameters.
7. Users can rename, update with new filter criteria, reorder, or delete saved views at any time.

### Inputs
- View Name (string, max 40 chars).
- Filter configuration object (statuses, sources, workTypes, isRemote, minScore, postedWithinDays, search, sort, seniorities, remotePolicies, minAnnualSalary).

### Outputs
- A persistent `saved_views` row with a JSONB filter bundle.
- A new interactive tab on the Jobs workbench.

### Connected Features
- **Jobs Filter Bar:** Hydrates from and saves into the active saved view.
- **Keyset Pagination:** Saved view queries execute seamlessly over keyset pagination cursors.

### Business Rules
- Tab cap: A user can save up to **12 views** maximum to prevent UI clutter.
- Unique names: View names must be unique per user account.

### Validation
- Filters are strictly validated against `savedViewFiltersSchema` to prevent corrupted filter states.

### Permissions
- Authenticated user owning the view.

### Edge Cases
- **Exclusion of Bucket and Paging:** Saved views intentionally do not store `bucketId` or pagination cursors. A view represents an abstract question ("what senior remote jobs exist?"), not a position in a list or a specific hunt.

### Technology Used
- **PostgreSQL JSONB:** Storing schema-validated filter bundles without requiring table schema migrations for new filter attributes.
- **TanStack Query:** Seamless client-side filter switching without page reloads.

### Why This Technology Is Used Here
Storing filter configurations as JSONB allows the product to add new filter fields in the future without modifying the `saved_views` table schema.

---

## Feature: Leads & Contact Directory with Bulk List Importing

### Purpose
Centralizes professional contacts, hiring managers, recruiters, and business prospects, supporting individual creation, automated hiring manager association, and bulk pasted list importing.

### Problem It Solves
Tracking hiring contacts across fragmented LinkedIn messages, sticky notes, and spreadsheets leads to lost relationships. Sourcing B2B prospects in regional markets (like Egypt) requires handling messy pasted text lists with phone numbers and Arabic business names.

### Who Uses It
Job seekers conducting outreach, contractors, and B2B operators.

### When It Is Used
On `/leads` when managing contacts, adding a new lead, or bulk-importing directory lines.

### How to Access It
Navigate to `/leads` in the left sidebar.

### Complete Workflow
1. User navigates to `/leads`.
2. **Individual Addition:** User clicks **Add Lead**, fills in Name, Title, Company, LinkedIn URL, Phone, and notes, assigns a Bucket, and saves.
3. **Bulk List Importing:**
   - User clicks **Import list**.
   - User pastes unformatted text (up to 200 lines) copied from business directories, maps, or spreadsheets (e.g., *"مكتبة بكير — 0225211040\nDelta Repro, 0235699066"*).
   - `parseLeadList` dynamically extracts business names, phone numbers, and notes regardless of separators used (commas, hyphens, pipes, tabs).
   - An interactive live preview displays valid parsed records and identifies any skipped lines.
   - User selects the target Bucket and clicks **Import**.
   - The server deduplicates incoming contacts against existing records and inserts valid rows.
4. Contacts display in a comprehensive table with direct links to LinkedIn, one-click phone dialing, status indicators, and quick actions to generate AI outreach messages.

### Inputs
- Individual contact fields (First Name, Last Name, Title, Company, LinkedIn URL, Phone, Headline, About, Notes, BucketId, JobId).
- Raw multi-line text for bulk import (max 200 lines per batch).

### Outputs
- New `leads` database records.
- Batch creation summary toast (created, duplicates skipped, failed).

### Connected Features
- **Message Generator:** Directly creates outreach drafts for any lead.
- **Tracker Board:** Visualizes leads as draggable Kanban cards.
- **Dashboard:** Tracks overdue follow-up dates set on leads.

### Business Rules
- Deleting a job or a bucket **never** cascades to delete its leads; foreign keys are set to `SET NULL`. Contacts represent real human relationships that outlive job postings or search campaigns.
- LinkedIn URLs are strictly validated to prevent stored XSS attacks (`javascript:...`).

### Validation
- First Name and Company are required. Import batches are capped at 200 items per request.

### Permissions
- Authenticated user owning the leads.

### Edge Cases
- **Duplicate Handling:** If an imported lead shares an identical name and company within the same bucket, it is reported as a duplicate and skipped rather than creating duplicate contacts.

### Technology Used
- **Custom Parsing Engine (`parse-lead-list.ts`):** Robust regex parsing handling multilingual text, Arabic script, and regional telephone formats.
- **Drizzle Transactions:** Batch database insertions.

### Why This Technology Is Used Here
The custom parser eliminates the need for rigid CSV formatting rules, allowing users to paste messy data directly from WhatsApp groups or web directories without manual formatting.

---

## Feature: Google Places Business Discovery

### Purpose
Allows users to search Google Places live for real-world businesses by industry and city, previewing company details and saving selected businesses directly as leads.

### Problem It Solves
Users operating B2B client acquisition or local supplier sourcing (such as finding engineering consultancies or paper reprographic shops in Cairo) have no job board to scrape. Traditional web directories forbid scraping or require high-cost subscriptions.

### Who Uses It
Agency founders, commercial service providers, and B2B trade operators.

### When It Is Used
On `/leads` via the **Find businesses** dialog.

### How to Access It
Navigate to `/leads` and click **Find businesses**.

### Complete Workflow
1. User opens `/leads` and clicks **Find businesses**.
2. The search query is pre-seeded based on the active Bucket's keywords and location (e.g., "engineering consultancies in Cairo").
3. User enters or refines the search query and selects a country region code (e.g., "eg").
4. User clicks **Search**.
5. The server checks the encrypted `google_places` API key saved in Source Credentials and deducts one quota unit.
6. The server calls the official Google Places Text Search API.
7. Results are returned to the client and rendered in a clean preview list (Name, Address, Phone Number, Website, Rating).
8. **Compliance Enforcement:** Results are displayed in memory and **never written to the database automatically**. In compliance with Google's Terms of Service, business display data cannot be stored indefinitely without deliberate user action.
9. User reviews the results and clicks **Save as lead** on relevant businesses.
10. The selected business is created as a permanent lead in the `leads` table, storing its name, category, phone, website, and Google `placeId` for future reference.

### Inputs
- Search query string (2–200 characters).
- Country Region Code (ISO 3166-1 alpha-2, e.g., "eg").
- Target Bucket selection.

### Outputs
- Transient Google Places API search results.
- New `leads` rows for explicitly saved businesses.

### Connected Features
- **Leads Directory:** Houses saved businesses as actionable contacts.
- **Source Credentials:** Securely stores the user's Google Places API key.
- **Buckets:** Pre-seeds the query and files saved leads under the active bucket.

### Business Rules
- Only the Google `placeId` and user-saved contact details are persisted. Transient search results are discarded on modal close.

### Validation
- A valid Google Places API key must be configured in Settings -> Source Credentials.

### Permissions
- Authenticated user with their own Google Places API key.

### Edge Cases
- **Missing API Key:** If a user clicks Find Businesses without a key, the modal presents a direct link to Settings and Google Cloud Console instructions rather than failing silently.

### Technology Used
- **Google Places Text Search API:** Live, high-accuracy global business directory queries.
- **AES-256-GCM Encrypted Credentials:** Secure storage of personal Google Cloud API keys.

### Why This Technology Is Used Here
Google Places provides the most accurate, up-to-date business contact directory for international and MENA regions, where corporate websites are often outdated.

---

## Feature: Context-Aware AI Outreach Message Generation

### Purpose
Drafts personalized, highly relevant outreach messages tailored to the recipient's role, the specific job description or bucket pitch, and the designated communication channel (LinkedIn, WhatsApp, Email).

### Problem It Solves
Writing customized cold outreach messages to hiring managers or commercial prospects takes 15–30 minutes per contact. Generic templates suffer from abysmal reply rates.

### Who Uses It
Job seekers connecting with recruiters and agency operators pitching prospective clients.

### When It Is Used
From any contact row on `/leads`, or via the message generator on `/messages`.

### How to Access It
Click the message icon next to any lead on `/leads`, or click **Generate** on `/messages`.

### Complete Workflow
1. User selects a lead and clicks **Generate Message**.
2. User selects an outreach template:
   - `hiring_manager`: Concise, achievement-oriented DM to an engineering leader.
   - `recruiter`: Professional note referencing specific open requisitions.
   - `referral`: Warm inquiry to a potential peer developer.
   - `client_pitch`: B2B value proposition offering development services to solve staffing/project bottlenecks.
   - `supplier_enquiry`: Commercial purchasing inquiry regarding wholesale pricing, specs, and delivery.
3. If no template is specified, the system automatically selects the ideal template based on the lead's Bucket kind.
4. The server calls `messages.generate`:
   - Checks quota (`generate_message`).
   - Identifies the communication channel: WhatsApp (if lead has a phone number and is a business contact), LinkedIn (for job-seeking templates), or Email.
   - Loads the lead's profile details (headline, about, recent posts).
   - Injects the sender's background: uses the Bucket's custom **Pitch** for business hunts, or the candidate's CV and skills for job hunts.
   - Compiles a specialized system and user prompt enforcing conciseness, concrete numbers, and strict avoidance of corporate clichés.
   - Dispatches prompt to the selected AI model.
5. The generated draft is saved in `messages` with status `draft`. If a draft already existed for this lead, it is updated in place to prevent duplicates.
6. The new draft is immediately queued for review in the **Approval Queue**.

### Inputs
- `leadId` (string).
- Optional `template` selection.

### Outputs
- A `messages` database record with status `draft`.

### Connected Features
- **Leads:** Provides recipient background and profile data.
- **Buckets & Criteria:** Provides sender narrative and credentials.
- **Approval Queue (`/messages`):** Displays drafts awaiting user review.

### Business Rules
- **Anti-Hallucination Constraints:** Prompts strictly forbid inventing achievements, metrics, or technologies not present in the provided CV or pitch.
- **Context Isolation:** A CV is never included in supplier or client pitch templates; business pitches rely exclusively on the bucket pitch narrative.

### Validation
- Lead must exist and belong to the requesting user. Sender must have either an active criteria elevator pitch or a bucket pitch.

### Permissions
- Authenticated owner of the lead.

### Edge Cases
- **Missing Pitch:** If a user attempts generation without setting up criteria or a bucket pitch, the system halts with a clear error prompt directing them to add a pitch first.

### Technology Used
- **OpenRouter / OpenAI:** LLM completion generation.
- **Prompt Engineering System (`lib/ai/client.ts`):** Persona- and channel-specific system prompts.

### Why This Technology Is Used Here
Channel-specific prompt engineering ensures WhatsApp messages sound conversational and direct, while LinkedIn notes maintain professional brevity.

---

## Feature: Message Approval Queue & Manual Dispatcher

### Purpose
Provides a distraction-free queue to review, edit, approve, and record the manual sending of generated outreach drafts.

### Problem It Solves
Fully autonomous message sending (e.g., botting LinkedIn accounts) violates platform Terms of Service and leads to account bans. Conversely, lacking a review workflow results in unvetted AI hallucinations being sent to high-value contacts.

### Who Uses It
Job seekers and outbound operators reviewing communication drafts.

### When It Is Used
On `/messages` after generating outreach drafts.

### How to Access It
Navigate to `/messages` in the sidebar.

### Complete Workflow
1. User navigates to `/messages`.
2. The page loads the **Approval Queue** displaying unreviewed drafts.
3. User inspects the draft card:
   - Displays recipient name, company, title, template used, and matching channel badge (LinkedIn, WhatsApp, Email).
   - Displays the editable message body in a textarea.
4. User can:
   - Edit the text directly in the box.
   - Press `r` (or click **Regenerate**) to create a fresh draft.
   - Press `s` (or click **Skip**) to move to the next draft without approving.
   - Press `a` (or click **Approve**) to confirm the message.
5. Approving marks the message `approved` (or `edited` if modified). The lead status remains unchanged (it is NOT marked sent yet).
6. User switches to the **Ready to Send** tab:
   - Shows all approved messages waiting for dispatch.
   - User clicks **Copy message** (copies clean text to clipboard).
   - User clicks **Open LinkedIn** (or WhatsApp/website link) to launch the recipient's profile in a new tab.
   - User pastes and sends the message directly within the target platform.
7. User returns to Einherji and clicks **Mark as sent**:
   - Message status updates to `sent` and `sentAt` is recorded.
   - The associated lead's status is automatically updated to `message_sent` and `lastContactedAt` is stamped.
   - The card is removed from Ready to Send, and the daily sent counter increments.

### Inputs
- Message ID.
- Optional edited text body.

### Outputs
- Message status updated to `approved`, `edited`, or `sent`.
- Lead status advanced to `message_sent` with `lastContactedAt` timestamp.

### Connected Features
- **Dashboard:** Tracks "Approved today" and approval queue backlog counts.
- **Tracker Board:** Automatically moves the lead card to the "Message Sent" column.

### Business Rules
- **Honest CRM Tracking:** Approving a message does **not** mark the lead contacted. The lead is only transitioned to `message_sent` when the user explicitly clicks **Mark as sent**, ensuring analytics reflect reality.

### Validation
- Only approved messages can be marked sent.

### Permissions
- Authenticated owner of the message.

### Edge Cases
- **Clipboard Denial:** If the browser denies clipboard permissions (e.g., in an insecure HTTP environment), the UI displays a toast instructing the user to copy the text manually from the card.

### Technology Used
- **Keyboard Event Listeners:** Quick single-key approval (`a`, `r`, `s`).
- **Async Clipboard API:** Safe one-click clipboard copying.
- **TanStack Query Invalidation:** Real-time synchronization across Dashboard and Tracker.

### Why This Technology Is Used Here
This "human-in-the-loop assisted dispatch" workflow gives the user 100% control over their personal reputation while eliminating 95% of the writing effort.

---

## Feature: Drag-and-Drop Pipeline Kanban Tracker

### Purpose
Visualizes all active contacts across an 8-stage interactive Kanban board, allowing users to track relationships from initial identification to offer.

### Problem It Solves
Tracking multiple active applications and client discussions in a spreadsheet makes it easy to lose track of stage progression, interview dates, and stalled opportunities.

### Who Uses It
Job seekers and outbound pipeline managers.

### When It Is Used
On `/tracker` when reviewing pipeline status or moving contacts through stages.

### How to Access It
Navigate to `/tracker` in the left sidebar.

### Complete Workflow
1. User navigates to `/tracker`.
2. The board renders 8 status columns horizontally:
   - `Not Contacted` (`not_contacted`)
   - `Message Sent` (`message_sent`)
   - `Reply Received` (`reply_received`)
   - `Call Scheduled` (`call_scheduled`)
   - `Interviewing` (`interview`)
   - `Offer Received` (`offer`)
   - `Rejected` (`rejected`)
   - `No Response / Ghosted` (`no_response`)
3. User selects a Bucket from the top bar to focus on a specific hunt, or views all contacts.
4. Each card displays the contact's name, company, title, phone, LinkedIn badge, last contacted date, and overdue reminder warnings.
5. User drags a card from one column and drops it into another (e.g., moving a contact from `Message Sent` to `Reply Received`):
   - `@hello-pangea/dnd` handles fluid drag physics.
   - The drop event triggers `leads.update` with the new status.
   - The database updates `leads.status` and `updatedAt`.
6. Clicking any card opens a slide-over modal allowing the user to update internal notes or schedule a `nextActionAt` reminder.

### Inputs
- Drag-and-drop movement events.
- Status, notes, and reminder date updates.

### Outputs
- Real-time updates to `leads.status`, `leads.notes`, and `leads.nextActionAt`.

### Connected Features
- **Dashboard:** "Replies received" and "Calls scheduled" metric cards query these columns directly.
- **Follow-Up Reminders:** Cards with overdue `nextActionAt` dates are flagged in red.

### Business Rules
- Lead status updates immediately synchronize across the Leads table, Tracker board, and Dashboard metrics.

### Validation
- Destination column must match a valid `LeadStatus` enum value.

### Permissions
- Authenticated owner of the lead.

### Edge Cases
- **Empty States:** Columns with zero leads render clean dashed dropzones ready to receive dragged cards.

### Technology Used
- **@hello-pangea/dnd:** Modern, accessible, smooth drag-and-drop interaction (the actively maintained successor to react-beautiful-dnd).
- **Tailwind Scrollbar Utilities:** Horizontal scrolling across 8 columns without layout breakage.

### Why This Technology Is Used Here
Visual drag-and-drop progression provides immediate spatial feedback on pipeline health and bottleneck stages.

---

## Feature: Automated Nightly Digest (Email & Telegram)

### Purpose
Runs unattended overnight job crawls and automatically dispatches a curated summary of the top 5 highest-scoring new opportunities directly to the user's email inbox or Telegram chat.

### Problem It Solves
Job seekers forget to open web apps daily, causing them to discover hot job postings days late after hundreds of competing applications have already been submitted.

### Who Uses It
Users wanting an "autopilot" job search experience.

### When It Is Used
Executes automatically every night via Vercel Cron (`0 6 * * *`, 6:00 AM UTC).

### How to Access It
Configure channels under `/settings`. Received directly via email or Telegram.

### Complete Workflow
1. At 6:00 AM UTC, Vercel Cron makes an authenticated GET request to `/api/cron/daily-digest` with a bearer token matching `CRON_SECRET`.
2. The endpoint calls `runDailyDigestForAll`:
   - Queries `user_settings` for all accounts with `dailyDigestEnabled = true`.
   - If Upstash QStash is configured, it publishes one signed task per user to `/api/queue/run-digest` (distributing execution so each user gets a full 5-minute timeout budget).
   - If QStash is not configured, it loops through subscribers sequentially within the cron function budget.
3. For each subscriber:
   - Triggers `startScrape` to crawl all enabled sources.
   - Queries `jobs` inserted since the user's `lastDigestSentAt` timestamp (or the last 24 hours for first-time runs).
   - Discards jobs matching mute rules.
   - Evaluates and ranks matching jobs with `scoreJob`.
   - Selects the top 5 highest-scoring opportunities.
   - If matching jobs are found:
     - Formats an HTML and plain-text digest email featuring job titles, companies, locations, salary tags, score reasons, and direct apply links.
     - Dispatches email via Resend from `FROM_EMAIL`.
     - If Telegram is enabled and configured with bot token and chat ID, formats and sends a Markdown Telegram message.
   - Updates `user_settings.lastDigestSentAt` to prevent duplicate notifications.
4. Any errors encountered during account runs are reported to Sentry with user attribution while allowing remaining accounts to finish.

### Inputs
- Cron trigger with valid authorization header.
- Subscriber email, criteria, settings, and bot credentials.

### Outputs
- Automated multi-source scrape run.
- Transactional email delivered via Resend.
- Telegram message delivered via Telegram Bot API.
- Updated `lastDigestSentAt` timestamp in `user_settings`.

### Connected Features
- **Scraper Engine:** Executes the automated crawl.
- **Job Scoring:** Selects the top 5 opportunities.
- **Settings:** Controls toggle, channel selection, and bot tokens.

### Business Rules
- **Fail-Closed Security:** The cron endpoint returns `503 Service Unavailable` if `CRON_SECRET` is unset, and `401 Unauthorized` if the bearer token is invalid, preventing unauthorized invocation.
- **Time Window Integrity:** `lastDigestSentAt` ensures jobs included in today's digest are never repeated in tomorrow's digest.

### Validation
- Telegram chat IDs and tokens are validated before dispatch. Email delivery requires a verified Resend domain or local dev fallback.

### Permissions
- Triggered exclusively by platform infrastructure (Vercel Cron / QStash) using shared secrets.

### Edge Cases
- **No Jobs Found:** If an overnight scrape finds zero matching jobs, no email is sent, preventing inbox spam.

### Technology Used
- **Vercel Cron & Upstash QStash:** Reliable distributed background scheduling.
- **Resend SDK:** Modern transactional email delivery.
- **Telegram Bot API:** Instant mobile messaging.
- **Sentry:** Silent background failure telemetry.

### Why This Technology Is Used Here
Distributing cron tasks through QStash ensures that scraping 20 accounts never exceeds serverless timeout limits, giving each user a dedicated execution sandbox.

---

## 7. Cross-Feature Workflows

---

## Workflow: The Daily Automated Hunt & Sub-Second Triage

### Goal
Wake up to pre-filtered, pre-ranked job opportunities and clear the incoming queue in minutes without manual searching.

### Problem Solved
Eliminates the daily 2-hour routine of checking bookmarks and job portals.

### Actors
Automated Background Cron, The User.

### Modules Involved
Cron Route, Scraping Engine, Cross-Source Deduplication, Relevance Scorer, Nightly Digest, Jobs Workbench, Mute Rules.

### Full Workflow
1. **6:00 AM UTC:** Vercel Cron executes `/api/cron/daily-digest`.
2. The scraper queries all enabled company ATS boards, aggregators, and scrapers.
3. Ingested listings pass through global Mute Rules; staffing spam is discarded.
4. Clean jobs are fingerprinted, deduplicated across sources, and scored (0–100%).
5. The top 5 highest-matching listings are emailed to the user and sent via Telegram.
6. **8:30 AM:** User wakes up, reads the Telegram digest over breakfast, and clicks the dashboard link.
7. User navigates to `/jobs`. The list is sorted by **Score (Best match)**.
8. User uses keyboard navigation:
   - `j`/`k` to navigate down the list.
   - `o` on role #1 to view the company posting in a new tab.
   - `s` on role #1 to move it to **Shortlisted**.
   - `x` on role #2 -> presses `1` ("Wrong seniority") to dismiss it.
   - `a` on role #3 to mark it **Applied**.
9. In under 5 minutes, 30 new jobs are completely triaged.

### Behind the Scenes
- Keyset database cursors paginate records efficiently without offset degradation.
- Status changes optimistically update TanStack Query caches and insert audit rows into `job_events`.

### Technologies Used
Vercel Cron, Resend, Telegram API, PostgreSQL composite indexing, React keyboard hooks.

### Final Result
30 jobs evaluated, 1 shortlisted, 1 applied, 28 dismissed; all state saved with zero mouse interaction.

---

## Workflow: Deep Opportunity Evaluation & Application Preparation

### Goal
Determine whether a shortlisted opening is truly worth applying to, evaluate missing qualifications, and prepare custom application collateral.

### Problem Solved
Prevents applying blindly to bad-fit roles and eliminates the 45-minute slog of writing custom cover letters and essay answers from scratch.

### Actors
Job Seeker, AI Completion Engine.

### Modules Involved
Jobs Workbench, Job Detail Modal, AI Fact Extraction, Job Fit Reports, Job Document Generator, Criteria Profile.

### Full Workflow
1. User filters `/jobs` by the **Shortlisted** saved view tab.
2. User selects an opening and presses `Enter` to open the Job Detail Panel.
3. User clicks **Extract Facts**:
   - The AI parses the description, extracting true seniority ("Senior"), normalized compensation ($120k–$140k/yr), tech stack tags, and verified remote policy.
   - Visual badges render immediately on the header strip.
4. User clicks the **Fit Report** tab and clicks **Generate Fit Report**:
   - The AI reads the candidate's active CV against the job requirements.
   - Returns a 78% match score, detailing 6 requirements met with specific resume evidence, 1 partial match, and 1 missing requirement (e.g., "GraphQL").
   - Gaps list advises leading with strong REST API architecture experience.
5. Convinced the role is a strong match, user clicks the **Documents** tab.
6. User selects **Cover Letter** and clicks **Generate**:
   - AI drafts a customized 3-paragraph letter highlighting the specific achievements that match the role's requirements.
7. User selects **Application Answer**, pastes the employer's form question (*"Why do you want to work at Acme?"*), and clicks **Generate**:
   - AI generates a concise, tailored answer.
8. User clicks **Copy to clipboard** on both assets, opens the employer's careers portal, pastes the materials, and submits the application.
9. User returns to Einherji and presses `a` to mark the job **Applied**.

### Behind the Scenes
- AI outputs are strictly validated via Zod schemas before being persisted in `job_fit_reports` and `job_documents`.
- Timestamps and pipeline history are recorded in `job_events`.

### Technologies Used
OpenRouter/OpenAI SDK, unpdf text extraction, PostgreSQL JSONB storage, Clipboard API.

### Final Result
A fully evaluated, highly targeted job application submitted with custom collateral in under 4 minutes.

---

## Workflow: Target Company Monitoring & Direct ATS Ingestion

### Goal
Monitor high-priority employers that do not advertise on public job boards and automatically capture their careers page openings.

### Problem Solved
Manually checking dream company job pages once a week is unreliable and frequently forgotten.

### Who Uses It
Senior engineers and agency operators tracking specific corporate targets.

### Modules Involved
Tracked Companies, ATS Detection Engine, SSRF Safe Fetcher, Scraping Engine, Jobs Feed.

### Full Workflow
1. User navigates to `/companies`.
2. User enters "Supabase" and `https://supabase.com/careers`.
3. User clicks **Add Company**.
4. The system executes `detectAts` safely:
   - Fetches the careers page, follows safe HTTP redirects, and scans HTML content.
   - Detects Ashby script tags and resolves the slug `supabase`.
   - Sets `atsProvider = "ashby"` and `atsSlug = "supabase"`.
5. User clicks **Run daily scrape** (or waits for the automated nightly cron).
6. The scraper queries `https://api.ashbyhq.com/posting-api/job-board/supabase`.
7. All live Supabase engineering openings are fetched directly from their official ATS API, scored against the user's criteria, and loaded into `/jobs`.

### Behind the Scenes
- Direct ATS queries bypass browser scrapers, incurring zero API costs and zero proxy bandwidth fees.

### Technologies Used
Linkedom DOM parsing, SSRF guard filters, direct REST API integrations.

### Final Result
Continuous, official career board monitoring established in seconds with automated job ingestion.

---

## Workflow: Networking & Hiring Manager Outreach

### Goal
Identify the relevant hiring manager or recruiter for an open role, create a tailored outreach message, dispatch it safely, and track follow-ups.

### Problem Solved
Cold outreach on LinkedIn is slow, repetitive, and often ignored due to generic templates or forgotten follow-up dates.

### Actors
Job Seeker, AI Messaging Engine, Hiring Contact.

### Modules Involved
Jobs Detail, Leads Directory, AI Messaging Engine, Approval Queue, Ready to Send Dispatcher, Kanban Tracker, Dashboard Reminders.

### Full Workflow
1. On `/jobs`, user selects a shortlisted role at "Stripe".
2. User clicks **Find Managers** (or clicks **Add Lead** to enter a contact found on LinkedIn).
3. A lead is created for "Sarah Jenkins, VP of Engineering at Stripe", linked to the Stripe job.
4. User clicks **Generate Message**:
   - Template: `hiring_manager`.
   - Channel: `linkedin`.
   - AI drafts a concise 75-word note referencing Stripe's specific tech stack and the candidate's quantified scaling achievements.
5. Draft lands in `/messages` under the **Approval Queue**.
6. User reviews the draft, tweaks one sentence, and clicks **Approve** (or presses `a`).
7. User navigates to **Ready to Send**:
   - Clicks **Copy message**.
   - Clicks **Open LinkedIn** to launch Sarah's profile.
   - Pastes the message into LinkedIn InMail and clicks send.
8. User returns to Einherji and clicks **Mark as sent**:
   - Message status updates to `sent`.
   - Lead status updates to `message_sent`.
   - User sets a follow-up reminder for 5 days out.
9. **5 Days Later:** The Dashboard highlights Sarah Jenkins in the **Follow-up reminders** card with a red overdue badge, prompting the user to send a check-in.

### Behind the Scenes
- Status transitions maintain referential integrity.
- Approving is decoupled from sending, ensuring metrics reflect verified real-world actions.

### Technologies Used
Persona prompt builders, Async Clipboard API, TanStack Query invalidation.

### Final Result
A multi-stage, human-verified outreach workflow with automated reminder tracking.

---

## Workflow: Local B2B Client Acquisition & Directory Import

### Goal
Source local business clients in a specific city, import their phone contacts, generate customized WhatsApp service pitches, and manage client deals.

### Problem Solved
Agency founders and local service providers cannot use traditional job boards to find local B2B clients who do not post job ads.

### Actors
Agency Founder / Commercial Operator, Prospective Business Owner.

### Modules Involved
Search Buckets, Google Places Integration, Bulk List Parser, Leads Directory, B2B Message Generator, Kanban Tracker.

### Full Workflow
1. User creates a new Bucket:
   - Name: "Web Clients — Cairo".
   - Kind: `clients`.
   - Pitch: *"We design and build custom web applications, mobile apps, and internal inventory dashboards for Cairo businesses."*
2. User navigates to `/leads` and clicks **Find businesses**:
   - Query: "logistics companies in New Cairo". Region: `eg`.
   - Google Places returns 15 local companies with phone numbers and addresses.
   - User saves 5 matching companies as leads filed under this bucket.
3. User receives a separate list of 20 engineering consultancies via a WhatsApp group:
   - Clicks **Import list** on `/leads`.
   - Pastes the messy 20-line block.
   - The parser extracts company names and Egyptian landline/mobile phone numbers.
   - User clicks **Import**; all 20 leads are added to the bucket.
4. For each lead, user clicks **Generate Message**:
   - Channel automatically detects `whatsapp` due to the presence of a phone number.
   - Template selects `client_pitch`.
   - AI drafts a conversational WhatsApp pitch in Arabic or English referencing the company's trade and pitching custom software solutions.
5. User approves drafts, clicks **Copy**, sends the WhatsApp message, and marks the lead `message_sent`.
6. User tracks client responses and scheduled discovery calls on `/tracker`.

### Behind the Scenes
- Google Places data is queried on-demand and stored only upon deliberate user save action.
- Channel resolution routes business pitches to WhatsApp and job inquiries to LinkedIn.

### Technologies Used
Google Places API, custom multilingual list parser, persona prompt builder, Kanban board.

### Final Result
A localized B2B client acquisition pipeline built from live directory queries and raw text imports.

---

## 8. Dashboard

The Dashboard (`/dashboard`) serves as the central command center for the entire application.

```
┌────────────────────────────────────────────────────────────────────────┐
│                              DASHBOARD                                 │
├────────────────────────────────────────────────────────────────────────┤
│ Good morning, Seif                          [ Run daily scrape button ]│
│ Here's your job hunt overview.                                         │
├─────────────┬─────────────┬─────────────┬──────────────┬───────────────┤
│ Jobs Scraped│ Managers    │ Approved    │ Replies      │ Calls         │
│ Today       │ Found       │ Today       │ Received     │ Scheduled     │
│     42      │     18      │      5      │      3       │       1       │
├─────────────┴─────────────┴─────────────┴──────────────┴───────────────┤
│ [ Active Scrape Progress Bar & Live Task Summary                     ] │
├──────────────────────────────────────────┬─────────────────────────────┤
│ [ Approval Queue Summary Card ]          │ [ Activity Feed Card ]      │
│ 4 messages waiting for review  [Review →]│ • Sarah Jenkins (Stripe)    │
├──────────────────────────────────────────┤   Reply Received (2h ago)   │
│ [ Follow-Up Reminders Card ]             │ • Alex Rivera (Vercel)      │
│ 2 overdue reminders                      │   Message Sent (1d ago)     │
│ • David Chen (Acme Corp) · 2d overdue    │ • Marcus Vance (Linear)     │
└──────────────────────────────────────────┴─────────────────────────────┘
```

### Every Metric Explained

| Metric Card | Source Query | Meaning & Business Question Answered | Action on Click |
|---|---|---|---|
| **Jobs scraped today** | `jobs.getStats` (count of rows with `createdAt >= today`) | "How many new postings were captured today?" Verifies that overnight crawls ran successfully. | Navigates to `/jobs` |
| **Managers found** | `leads.getAll` (total count of lead rows) | "What is the size of my professional network?" Measures lead generation volume. | Navigates to `/leads` |
| **Approved today** | `messages.getApprovedTodayCount` (count of messages with `approvedAt >= today`) | "How much outbound messaging work did I complete today?" Measures daily application effort. | Navigates to `/messages` |
| **Replies received** | Count of leads with `status = 'reply_received'` | "Who is actively engaging with my outreach?" Measures lead-to-response conversion rate. | Navigates to `/leads?status=reply_received` |
| **Calls scheduled** | Count of leads with `status = 'call_scheduled'` | "How many interviews or discovery calls are lined up?" Core indicator of pipeline velocity. | Navigates to `/leads?status=call_scheduled` |

### Key Cards & Modules on the Dashboard
1. **Header & Greeting:** Personalized greeting based on local client hydration time (preventing SSR hydration mismatch errors) and quick-action **Run daily scrape** button.
2. **Active Scrape Panel:** Appears when a crawl is running or recently finished, showing live task completion fractions (e.g., `Tasks 14/18`), job count tallies, and human-readable outcome summaries.
3. **Approval Queue Summary:** Displays the number of pending draft messages waiting for review with a direct **Review** link to `/messages`.
4. **Follow-Up Reminders:** Highlights contacts whose `nextActionAt` date is in the past, showing contact name, company, and relative overdue days in red.
5. **Recent Activity Feed:** Shows the 4 most recently updated contacts, their current pipeline stage badges, and relative timestamps, providing an instant snapshot of pipeline movement.

---

## 9. Search, Filtering and Sorting

### Where Available
- Dedicated advanced filtering on the **Jobs Workbench** (`/jobs`).
- Contact status filtering on the **Leads Directory** (`/leads`).
- Campaign bucket filtering across `/jobs`, `/leads`, and `/tracker`.

### Searchable Fields
- **Jobs:** Full text matching across `jobs.title` and `jobs.company`.
- **Leads:** Text matching across `leads.firstName`, `leads.lastName`, and `leads.company`.
- **Places:** Free-text semantic querying against Google Places.

### Available Job Filters
1. **Pipeline Status:** Multi-select filtering across all 10 states (`new`, `shortlisted`, `applying`, `applied`, `screening`, `interviewing`, `offer`, `rejected`, `ghosted`, `dismissed`).
2. **Sources:** Filter by specific boards (Greenhouse, Ashby, RemoteOK, Wuzzuf, LinkedIn, etc.).
3. **Work Types:** `full_time`, `part_time`, `contract`, `freelance`, `internship`.
4. **Remote Only:** Boolean toggle filtering for remote openings.
5. **Minimum Relevance Score:** Slider/number input filtering for jobs scoring >= N (e.g., 70+).
6. **Publication Recency:** Relative day filter (posted within 1, 3, 7, 14, 30, or 90 days).
7. **Assessed Seniority:** Filters on extracted facts (`intern`, `junior`, `mid`, `senior`, `staff`, `principal`, `lead`).
8. **Verified Remote Policy:** `remote`, `hybrid`, `onsite`.
9. **Minimum Annual Salary:** Filters on normalized annual compensation (e.g., $100k+).

### Sorting Mechanisms
- **Best match (`score`):** Descending order by calculated score (default).
- **Newest first (`newest`):** Ordered by publication date descending.
- **Oldest first (`oldest`):** Ordered by publication date ascending.

### Pagination Architecture (Keyset Cursors)
The jobs feed uses **keyset pagination** (`cursor`) rather than offset-based pagination (`LIMIT/OFFSET`). 
- *Why this matters:* When scraping continuously adds new rows to the top of the feed, traditional offset pagination shifts rows between pages, causing users to see the same job twice or miss jobs entirely. Keyset cursors anchor queries to specific record IDs and scores, guaranteeing smooth, duplicate-free scrolling even while background crawls are actively writing.

---

## 10. Notifications and Communication

| Communication | Channel | Trigger | Content / Purpose | Technology |
|---|---|---|---|---|
| **Daily Job Digest Email** | Email | Nightly cron job (6:00 AM UTC) | Top 5 scored new jobs found in last 24h, with match reasons and direct links | Resend SDK, Vercel Cron, QStash |
| **Daily Job Digest Telegram** | Telegram Chat | Nightly cron job (if Telegram configured) | Markdown briefing of top opportunities sent directly to mobile chat | Telegram Bot API, `node-fetch` |
| **Email Verification** | Email | Account registration / Resend request | Security link to verify email address and activate account | Better Auth, Resend |
| **Overdue Follow-Up Alerts** | In-App Dashboard | Date comparison (`nextActionAt <= now()`) | Red warning badges on dashboard prompting user to re-contact leads | Drizzle query, React client |
| **Action Feedback** | In-App Toast | User mutations (save, delete, approve, copy) | Instant status confirmations (success, errors, clipboard feedback) | Sonner Toast Library |

---

## 11. Reports and Exports

### 1. Job Fit Report Scorecard
- **Purpose:** Comprehensive technical evaluation benchmarking a candidate's resume against an individual job posting.
- **Format:** Interactive UI panel on `/jobs` with color-coded requirement breakdowns (`met`, `partial`, `missing`), resume evidence citations, gap summaries, and strategic advice.
- **Workflow:** Generated on-demand via the Job Detail Modal; cached permanently in the database.

### 2. Application Preparation Documents
- **Purpose:** Complete application copy tailored to specific job openings.
- **Format:** Formatted Markdown text panels on `/jobs` featuring one-click clipboard copying.
- **Types:** Full cover letters, ATS form essay answers, targeted CV bullet points, and interview preparation guides.

### 3. Bulk List Import Preview Report
- **Purpose:** Validation and sanity report shown prior to committing raw pasted text to the database.
- **Format:** Modal summary displaying parsed business names, phone numbers, and a list of skipped/malformed lines with specific line numbers and failure reasons.

---

## 12. Settings and Configuration

Accessed via `/settings` in the left sidebar:

### 1. Profile Settings
- **Full Name:** User's display name.
- **Current Job Title:** Displayed in header profiles and used as baseline sender context.
- **LinkedIn Profile URL:** Personal profile link.

### 2. Job Sources Configuration
- Checkboxes for all supported public boards and aggregators. Unchecking a source excludes it from general scraping runs.

### 3. AI Provider Configuration
- **Personal OpenRouter API Key:** Enables account-level billing for Llama, Claude, and Gemini models.
- **Personal OpenAI API Key:** Enables direct GPT-4o and GPT-4o Mini execution.
- *Security:* Displays masked previews (`sk-or...xxxx`). Blank inputs preserve saved keys; clicking clear removes keys.

### 4. Third-Party Integrations
- **Apify API Token:** Personal token for legacy Apify actor executions.
- **Scraping Proxy Provider & Key:** Optional configuration for unblocking proxies (ScraperAPI, ScrapingBee, Zyte) for protected websites.

### 5. Source Credentials
- Dedicated modal configurations for sources requiring specific credential structures:
  - **Adzuna:** App ID + API Key.
  - **Google Places:** Google Cloud API Key.
  - **SerpAPI:** Search API Key.
  - **X / Twitter:** Bearer Token.
  - **Reddit:** Client ID + Client Secret.

### 6. Daily Digest & Notifications
- **Daily Digest Toggle:** Master on/off switch for automated overnight runs.
- **Channels:** Checkboxes for `Email` and `Telegram`.
- **Telegram Bot Token & Chat ID:** Bot configuration for instant mobile alerts.

---

## 13. Complete User Journey Examples

### Journey 1: Senior Full-Stack Engineer Landing a Remote Role
1. **Setup:** Seif signs in, navigates to `/criteria`, drops his resume PDF, and confirms his extracted skills (React, TypeScript, Next.js, Postgres). He sets minimum salary to $110,000 and selects Llama 3.3 70B.
2. **Company Targeting:** Navigates to `/companies`, adds Vercel, Linear, and Supabase. The system detects their Lever and Ashby ATS boards automatically.
3. **Crawl:** Clicks **Run daily scrape**. In 45 seconds, the engine queries 15 sources and ingest 60 new positions.
4. **Triage:** On `/jobs`, Seif uses the keyboard: navigates with `j`/`k`, shortlists 3 top roles with `s`, dismisses 20 irrelevant roles with `x`, and opens postings with `o`.
5. **Evaluation:** Opens a shortlisted Senior Engineer role at Linear. Generates a **Fit Report** (88% match; notes missing experience with GraphQL). Generates an **Application Answer** for the prompt *"What is the most challenging technical project you led?"*.
6. **Outreach:** Finds the hiring engineering manager, generates a customized LinkedIn note, approves it in `/messages`, copies it, sends it on LinkedIn, and clicks **Mark as sent**.
7. **Tracking:** Drags the contact to `Interviewing` in the Kanban board when a call is scheduled.

### Journey 2: Freelance Developer Securing Contract Clients
1. **Setup:** Omar creates a Bucket called "Freelance Web Apps", selects kind `clients`, enters keywords ("next.js", "mobile app", "mvp", "dashboard"), and inputs his dev shop pitch.
2. **Crawl:** Selects his Freelance bucket on `/jobs` and clicks **Run daily scrape**. The scraper queries Freelancer.com, Hacker News "Seeking Freelancer", and contract remote boards.
3. **Outreach:** Identifies a startup looking for an immediate Next.js dashboard rebuild. Generates a tailored **Client Pitch** in `/messages` highlighting previous dashboard case studies.
4. **Dispatch:** Copies the pitch, submits it to the founder, marks it sent, and sets a follow-up reminder for 4 days later.
5. **Follow-Up:** 4 days later, the Dashboard alerts Omar that the follow-up is due. He sends a brief check-in and books a discovery call.

### Journey 3: Local Business Owner Sourcing Industrial Materials
1. **Setup:** Mostafa creates a Bucket called "Paper Factory Suppliers", selecting kind `suppliers`, locations ("Cairo", "Giza", "10th of Ramadan"), and inputs his purchasing specifications for 80gsm paper rolls.
2. **Discovery:** Opens `/leads`, clicks **Find businesses**, enters "paper mills and paper roll suppliers in Cairo", and runs the search.
3. **Ingestion:** Reviews 10 Google Places results, saving 4 verified commercial paper mills with landline and mobile numbers as leads.
4. **Bulk Import:** Pastes 15 additional supplier lines received from an industry directory into **Import list**, which parses business names and phone numbers instantly.
5. **Messaging:** For each supplier, clicks **Generate Message**. The system detects WhatsApp and selects the `supplier_enquiry` template, producing a professional wholesale inquiry detailing specifications and requested quotation terms.
6. **Execution:** Mostafa reviews the drafts in `/messages`, copies them into WhatsApp Web, dispatches them in minutes, and logs responses directly on `/tracker`.
