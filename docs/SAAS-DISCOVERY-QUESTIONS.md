# Einherji SaaS Discovery Questions - Stage 1

**Status:** Awaiting answers

## How To Use This File

Answer the questions directly under each prompt. Keep the question IDs intact so we can refer to them later.

- Give the practical answer, even if it is not fully decided yet.
- If you are unsure, write `Undecided` and explain what is blocking the decision.
- Distinguish what you want for the first commercial version from what you may want eventually.
- Do not optimize for what the current code already supports. Describe the product and customers you actually want.
- This is discovery only. It is not a final architecture or implementation plan.

After you complete this file, I will read your answers and add only the follow-up questions needed to remove ambiguity. We will then use the clarified answers to create the SaaS conversion plan.

## 0. Quick Product Profile

### Q0.1 Product name

What name should we use for the SaaS product? Is `Einherji` temporary or intended to be the public name?

**Answer:**

### Q0.2 One-sentence promise

Complete this sentence:

> For [specific customer], Einherji helps them [specific job] so they can [measurable or valuable outcome].

**Answer:**

### Q0.3 Why SaaS now?

Why do you want to turn the personal project into a SaaS product now? What changed or created the opportunity?

**Answer:**

### Q0.4 Desired first launch

What does the first public or private launch mean to you? For example: a private pilot, a paid beta, a public free tier, or a production product with subscriptions.

**Answer:**

### Q0.5 Constraints

What constraints should shape the plan?

Consider available time, budget, team size, coding capacity, sales capacity, existing customers, hosting preferences, and any deadline.

**Answer:**

## 1. Customer And Problem

### Q1.1 Who is the first paying customer?

Choose one primary customer for the first commercial version, then describe them in your own words:

- Individual job seekers
- Recruitment agencies
- Career coaches or job-search service providers
- Small businesses hiring for themselves
- Another customer type

**Answer:**

### Q1.2 User, buyer, and beneficiary

Are the user, the person who pays, and the person who benefits the same person? If not, who are they?

**Answer:**

### Q1.3 First ten customers

Who could realistically become the first ten users or customers? How would you reach them?

**Answer:**

### Q1.4 Customer geography

Which countries or regions should the first version serve? Should the product be designed specifically for Egypt, the Middle East, the United States, or a global audience?

**Answer:**

### Q1.5 Language and localization

Which languages must be supported at launch? Does this include the interface, generated content, job search, resumes, emails, and support?

**Answer:**

### Q1.6 Current alternative

How does the target customer solve this problem today? Include spreadsheets, messaging apps, job boards, manual processes, other software, or hiring a person.

**Answer:**

### Q1.7 Pain and evidence

What makes this problem painful enough that someone would pay to solve it? What evidence do you already have from your own use or from other people?

**Answer:**

### Q1.8 Desired customer outcome

What should a customer be able to achieve after using the product for one week? What should be different after one month?

**Answer:**

## 2. Product Direction And Scope

### Q2.1 Primary product mode

The current project contains both job-seeker workflows and agency or service-provider workflows. Which direction should be primary for the first SaaS version?

- Job-search assistant for individuals
- Recruitment or career-service workspace for professionals
- Both, with one clearly primary
- Another direction

**Answer:**

### Q2.2 If the primary customer is a service provider

Describe the service provider's workflow. What do they manage for each client, and what does a successful client engagement look like?

**Answer:**

### Q2.3 Core workflow

Describe the ideal first workflow from sign-up to value in 5-10 steps. Use concrete actions, not feature names.

**Answer:**

### Q2.4 Essential existing features

Which current capabilities must survive into the first SaaS release? For example: job discovery, job matching, fit reports, resume generation, cover letters, leads, buckets, tracked companies, scraping, messaging, or analytics.

**Answer:**

### Q2.5 Features to exclude

Which existing features should be removed, hidden, postponed, or kept only for your personal account?

**Answer:**

### Q2.6 Product vocabulary

Which concepts should customers see in the interface? Are terms such as `bucket`, `lead`, `job`, `client`, `workspace`, and `application` correct, or should they be renamed?

**Answer:**

### Q2.7 Automation boundary

Which actions should be automatic, and which actions must require user review or approval? Consider scraping, AI-generated documents, sending messages, status changes, and deleting data.

**Answer:**

### Q2.8 Manual work that is acceptable

What manual setup or recurring work are you willing to do for early customers? This helps separate a viable pilot from requirements that can wait for automation.

**Answer:**

## 3. Business Model And Pricing

### Q3.1 Initial access model

Which model do you want to test first?

- Free private beta
- Free plan with paid upgrades
- Time-limited trial followed by payment
- Paid from the first day
- Service-assisted pilot where you configure accounts manually
- Another model

**Answer:**

### Q3.2 Pricing hypothesis

What price range seems reasonable for the first paying customer? Include currency and whether you are thinking per month, per year, per client, per seat, or per workspace.

**Answer:**

### Q3.3 Billing unit

What should determine the price?

- Individual account
- Workspace
- Team member or seat
- Number of managed clients
- Number of jobs or applications
- AI or scraping usage
- A combination

**Answer:**

### Q3.4 Usage limits and overages

Should customers have hard limits, soft limits with warnings, paid overages, or unlimited usage within a plan? Which actions are expensive enough to limit?

**Answer:**

### Q3.5 AI and infrastructure costs

Are you willing to pay for AI, scraping, storage, email, and other infrastructure on behalf of customers? If yes, what monthly cost per customer is acceptable?

**Answer:**

### Q3.6 Customer-provided credentials

Should customers ever bring their own API keys, scraping credentials, or model provider accounts, or should the product provide everything?

**Answer:**

### Q3.7 Payment and tax constraints

Do you already have a preferred payment provider or business entity? Are there country, currency, tax, invoicing, or payout constraints we must account for?

**Answer:**

## 4. Accounts, Workspaces, And Teams

### Q4.1 Account model for v1

Should the first SaaS version support only one person per account, or must it support teams from the beginning?

**Answer:**

### Q4.2 Workspace meaning

If workspaces exist, what does one workspace represent?

- One person's job search
- One agency
- One client of an agency
- One hiring company
- Another boundary

**Answer:**

### Q4.3 Roles and permissions

Which roles are needed at launch? For example: owner, administrator, staff member, client, viewer, or billing manager.

**Answer:**

### Q4.4 Shared versus private data

Which data should be shared within a workspace, and which data should remain private to an individual user?

**Answer:**

### Q4.5 Existing personal data

Should your current personal data be migrated into a special owner account, imported into a workspace, or kept separate from the SaaS data?

**Answer:**

### Q4.6 Personal-only capabilities

Are there features, seed data, credentials, or workflows that must remain available only to you and never be exposed to customers?

**Answer:**

## 5. Data Sources, Privacy, And Trust

### Q5.1 Allowed data sources

Which job boards, company sites, APIs, feeds, or customer-provided sources may the SaaS use at launch?

**Answer:**

### Q5.2 Source restrictions

Are there sources that are acceptable for personal use but must not be used commercially? List any known restrictions, account requirements, or concerns.

**Answer:**

### Q5.3 Customer credentials

Will customers connect their own accounts to external sources? If yes, which sources and what actions should the product be allowed to perform?

**Answer:**

### Q5.4 Data retention

How long should the product keep jobs, documents, messages, activity history, usage records, and uploaded files?

**Answer:**

### Q5.5 Export and deletion

What should a customer be able to export? What should happen when they cancel, request deletion, or close a workspace?

**Answer:**

### Q5.6 Resume and document handling

Should resumes, cover letters, and other documents be stored permanently, versioned, downloadable, shareable, or automatically deleted after a period?

**Answer:**

### Q5.7 Trust requirements

What security, privacy, auditability, or compliance expectations will customers have? Include any requirements you know about, without assuming a specific legal framework yet.

**Answer:**

## 6. Onboarding And Customer Experience

### Q6.1 First-session setup

What information should a new customer provide before the product can deliver value? What can be optional?

**Answer:**

### Q6.2 Time to first value

How quickly should a new customer see a useful result? For example: a matched job, a completed fit report, a generated document, or a client dashboard.

**Answer:**

### Q6.3 Onboarding style

Should onboarding be self-service, guided by a checklist, assisted by you, or a mixture depending on the plan?

**Answer:**

### Q6.4 Notifications

Which notifications matter at launch? Consider email, in-app notifications, scheduled digests, scraping completion, usage warnings, billing, and customer activity.

**Answer:**

### Q6.5 Support

How will early customers ask for help, and how much support are you willing to provide manually?

**Answer:**

## 7. Validation And Success Metrics

### Q7.1 Activation event

What single action would prove that a new customer understood the value of the product?

**Answer:**

### Q7.2 Retention event

What recurring action would indicate that the product is becoming part of the customer's workflow?

**Answer:**

### Q7.3 Business success

What would make the first 90 days successful? Include a target number of users, paying customers, revenue, retention, or validated learning if you have one.

**Answer:**

### Q7.4 Pilot design

How many pilot customers do you want, and what should each pilot test? What would make you stop, change direction, or continue?

**Answer:**

### Q7.5 Feedback loop

How will you collect feedback and observe actual usage? For example: interviews, support conversations, product analytics, session reviews, or weekly check-ins.

**Answer:**

## 8. Technical And Operational Constraints

### Q8.1 What should remain unchanged?

Which parts of the current stack or architecture do you want to preserve if possible? Consider Next.js, tRPC, Better Auth, Neon, Drizzle, UploadThing, Vercel, AI providers, and scraper integrations.

**Answer:**

### Q8.2 Expected scale

What scale should the first production version support? Estimate users, workspaces, jobs, scrapes, generated documents, and AI requests per day or month.

**Answer:**

### Q8.3 Reliability expectations

Which workflows must be reliable and recoverable even when a provider fails? Which workflows can be best-effort during the pilot?

**Answer:**

### Q8.4 Background processing

Which operations should run asynchronously before launch? Consider scraping, AI generation, document processing, notifications, imports, and scheduled jobs.

**Answer:**

### Q8.5 Observability and administration

What must you be able to see or control as the operator? Consider customer status, usage, failed jobs, provider costs, impersonation or support access, feature flags, and account suspension.

**Answer:**

### Q8.6 Release sequence

Do you have a preferred sequence such as internal cleanup, private pilot, paid beta, and public launch? Include target dates if known.

**Answer:**

## 9. Migration From Personal Project To SaaS

### Q9.1 Personal seed data

The current seed data includes personal categories and Egypt-specific examples. Should these be removed, generalized, converted into onboarding templates, or retained only for your account?

**Answer:**

### Q9.2 Default data

Should every new customer receive starter buckets, sample jobs, templates, criteria, or other defaults? If yes, what should be generic and what should be configurable by plan or region?

**Answer:**

### Q9.3 Existing account migration

How should your current account, settings, criteria, jobs, documents, credentials, and history behave after the SaaS conversion?

**Answer:**

### Q9.4 Branding and public surface

Which personal references, internal names, comments, seed labels, and documentation must be removed or rewritten before customers see the product?

**Answer:**

## 10. Priorities And Non-Negotiables

### Q10.1 Top three priorities

List the three outcomes that matter most for this conversion.

**Answer:**

### Q10.2 Non-negotiables

What must not be compromised, even if it increases implementation time or cost?

**Answer:**

### Q10.3 Acceptable compromises

What are you willing to simplify for the first release?

**Answer:**

### Q10.4 Known risks

What worries you most about making this a SaaS product?

**Answer:**

### Q10.5 Open decisions

List any decisions you already know are unresolved but that are not covered above.

**Answer:**

## Completion Check

Before sending this back for review, mark each section as one of:

- `Answered`
- `Partially answered`
- `Not decided`
- `Not applicable`

| Section | Status | Notes |
| --- | --- | --- |
| 0. Quick Product Profile |  |  |
| 1. Customer And Problem |  |  |
| 2. Product Direction And Scope |  |  |
| 3. Business Model And Pricing |  |  |
| 4. Accounts, Workspaces, And Teams |  |  |
| 5. Data Sources, Privacy, And Trust |  |  |
| 6. Onboarding And Customer Experience |  |  |
| 7. Validation And Success Metrics |  |  |
| 8. Technical And Operational Constraints |  |  |
| 9. Migration From Personal Project To SaaS |  |  |
| 10. Priorities And Non-Negotiables |  |  |
