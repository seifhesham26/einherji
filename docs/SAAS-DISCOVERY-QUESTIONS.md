# Einherji SaaS Discovery Questions - Stage 1

**Status:** First review added on 2026-10-03; decisions and remaining answers pending

## How To Use This File

Answer the questions directly under each prompt. Keep the question IDs intact so we can refer to them later.

- Give the practical answer, even if it is not fully decided yet.
- If you are unsure, write `Undecided` and explain what is blocking the decision.
- Distinguish what you want for the first commercial version from what you may want eventually.
- Do not optimize for what the current code already supports. Describe the product and customers you actually want.
- This is discovery only. It is not a final architecture or implementation plan.

After you complete this file, I will read your answers and add only the follow-up questions needed to remove ambiguity. We will then use the clarified answers to create the SaaS conversion plan.

## Review Notes - 2026-10-03

Your answers describe a free or cost-recovery product, built by one person alongside a full-time job. The long-term ambition is broad discovery: jobs, employees, clients, suppliers, and other needs. The clearest first workflow is helping an individual job seeker import a CV, find relevant jobs, prepare an application, and prepare for interviews.

**My assessment:** The individual workflow is a useful starting point. The largest unresolved issue is scope: Q1.1 says to start with every customer type, while Q2.1 prioritizes individuals and Q0.5 describes limited weekly capacity. No deadline gives you room to build in stages; it does not remove the ongoing cost of supporting several different products.

**Updated direction:** I recommend individual job seekers first. This revises the agency-first recommendation in `PROJECT-FINDINGS.md`. User-owned data is a valid tenant model for an individual SaaS; shared workspaces and subscriptions should become priorities when team use or a payment model requires them. Cost controls, reliable execution, private documents, and removal of personal onboarding defaults remain relevant immediately.

### Recommended First Release

| Capability | Recommendation |
| --- | --- |
| CV import and editable profile | Core; let the user confirm extracted facts and enter information manually. |
| Job discovery | A small set of reviewed sources, with pasted job descriptions as a fallback. |
| Shortlist and application tracking | Core; preserve notes, status, and the original job link. |
| Fit report and application documents | Available on demand, with explanations, user review, and usage limits. |
| Interview preparation | A focused preparation pack can fit the first release; a general context-aware chatbot can follow after validation. |
| Recruiter, agency, client, and supplier workflows | Future product stages, with their own user research and source requirements. |

### Decisions To Resolve First

| Decision | Where to answer | Why it matters |
| --- | --- | --- |
| First user group and launch scope | F1.1 and F2.4 | Determines which workflow we design and support. |
| Free service versus cost recovery | F0.3, F0.4, and Q3.1 | Determines access and what happens after the beta. |
| Weekly time and monthly spending ceiling | F0.5 and Q3.5 | Determines a sustainable pilot size and usage limits. |
| Individual accounts versus teams | Q4.1 | Determines whether workspace migration is necessary now. |
| Initial sources and job coverage | Q5.1 and Q5.2 | Determines what discovery can deliver reliably. |
| Evidence of value | Q7.1 and Q7.4 | Determines how we judge the pilot. |

**Reading the review:** All 66 original questions have a recommendation below. Written answers were present for 21 questions in sections 0-2 at review time; sections 3-10 had empty answer blocks. Recommendations are proposals, including suggested defaults for those empty sections. They are not decisions you have already accepted. Your original answers are preserved. Nine additional prompts use `F` IDs and have separate answer blocks. For an unanswered original question, you can write `Agree with the recommendation` or describe your alternative.

## 0. Quick Product Profile

### Q0.1 Product name

What name should we use for the SaaS product? Is `Einherji` temporary or intended to be the public name?

**Answer:**
yes it's Einherji's public name, it's not temporary.

**Recommendation:** Keep Einherji as the public name. Use a clear supporting description such as `Job search and application preparation` so new visitors understand the first product without needing to understand the name. Broader positioning can evolve when the additional workflows exist.

### Q0.2 One-sentence promise

Complete this sentence:

> For [specific customer], Einherji helps them [specific job] so they can [measurable or valuable outcome].

**Answer:**
For all customers, Einherji helps them get whatever they looking for, weather it is a job, a new employee, a new employee, a better salary, etc ...
however this will be the intiate version later on we shall add new features to it.
for example i want to use it to help me find clints for my web development buisness.
or another example i want to find factories for suppliers, or even just a random task i want to do like finding a doctor to do a surgery for me.

**Recommendation:** Keep broad discovery as the long-term vision, but give the first release a specific promise: `For individual job seekers, Einherji helps turn a CV and job preferences into a relevant shortlist and reviewed application materials, reducing repetitive search and preparation work.` Finding employees, clients, suppliers, and other services requires different data and workflows; a shared search concept does not make them one launch feature.

**Follow-up F0.2:** Does that first-release promise represent what you want, and how would you change it?

**Follow-up answer:**

### Q0.3 Why SaaS now?

Why do you want to turn the personal project into a SaaS product now? What changed or created the opportunity?

**Answer:**
i think it have so much potential to be used in different ways and for different purposes, and i want to explore that potential by turning it into a saas product.
also it will be non-profit as much as i can if there is something free we can use it to the max as much as we can
the paid ones we will use them only if we really need to use them. and will be for price.

**Recommendation:** A free core with optional cost recovery for expensive actions fits your stated motivation. Use inexpensive parsing, filtering, deduplication, and caching where they are sufficient, and reserve AI for actions that benefit from it. Free AI capacity should be treated as limited shared capacity rather than a guarantee of unlimited service. [OpenRouter documents free-model and provider rate limits](https://openrouter.ai/docs/api/reference/limits).

**Follow-up F0.3:** Do you want the core product to remain free indefinitely, with payment only for expensive features, or is all access potentially paid after the initial free period?

**Follow-up answer:**

### Q0.4 Desired first launch

What does the first public or private launch mean to you? For example: a private pilot, a paid beta, a public free tier, or a production product with subscriptions.

**Answer:**
the first launch will be a free launch for everyone to use for a limited time period.

**Recommendation:** Start with a free pilot of roughly 10-20 people, then open a capped public beta after observing cost and reliability. This is a proposed change to your open-to-everyone launch, because a small cohort gives you manageable feedback and support. State the beta review date and any access changes clearly before people invest time in their profiles.

**Follow-up F0.4:** What does `limited time period` mean: a temporary free beta, a trial for each new user, or a temporary public service? What should happen to existing users and their data afterward?

**Follow-up answer:**

### Q0.5 Constraints

What constraints should shape the plan?

Consider available time, budget, team size, coding capacity, sales capacity, existing customers, hosting preferences, and any deadline.

**Answer:**
time is mostly limited weekly 
budget is scalable but i prefer to keep it minimal
team size is 1 person (me)
coding capacity is limited as i work as a full time software engineer
sales capacity is 0
existing customers is 0
hosting preferences is prefer Vercel i will buy the domain from namecheap.
no deadline

**Recommendation:** Plan around a sustainable weekly allocation and a fixed spending ceiling, with progress measured by completed user workflows. Keep your preferred Vercel hosting if its plan fits the launch: Hobby is restricted to personal, non-commercial use, so budget for an appropriate plan if you introduce a commercial offering. A free beta alone does not settle plan eligibility. [Vercel Hobby documentation](https://vercel.com/docs/plans/hobby).

**Follow-up F0.5:** How many hours per week can you consistently give this project, including maintenance and support?

**Follow-up answer:**

## 1. Customer And Problem

### Q1.1 Who is the first paying customer?

Choose one primary customer for the first commercial version, then describe them in your own words:

- Individual job seekers
- Recruitment agencies
- Career coaches or job-search service providers
- Small businesses hiring for themselves
- Another customer type

**Answer:**
we will start with all of them since we have alot of time to develop the product.

**Recommendation:** Begin with individual job seekers and choose an initial group whose needs you understand, such as software developers seeking local or remote roles. Serving several customer types introduces distinct onboarding, permissions, data, and support requirements. Recruiter research can happen alongside the pilot, but AI-generated descriptions of recruiter needs should be checked with actual recruiters.

**Follow-up F1.1:** Which group should we recruit first for the pilot? Describe their profession, experience level, and local or remote job preferences.

**Follow-up answer:**

### Q1.2 User, buyer, and beneficiary

Are the user, the person who pays, and the person who benefits the same person? If not, who are they?

**Answer:**
yes they are the same person

**Recommendation:** Treat these as the same person for the individual release. If you later support agencies or employers, revisit this answer: the person operating the product, the client or candidate, and the person paying may be different. Account permissions should follow the confirmed use case.

### Q1.3 First ten customers

Who could realistically become the first ten users or customers? How would you reach them?

**Answer:**
i have no idea i think i will relay on posts on social media and by word of mouth at first.

**Recommendation:** Recruit the first users directly through colleagues, friends, and one or two relevant communities. Invite people who are actively looking for work and agree to discuss their experience. Social posts can support that effort, but named pilot participants will give you better evidence than anonymous sign-ups. A paid sales function is unnecessary for this free pilot.

### Q1.4 Customer geography

Which countries or regions should the first version serve? Should the product be designed specifically for Egypt, the Middle East, the United States, or a global audience?

**Answer:**
global

**Recommendation:** Allow global use while publishing the actual country, language, and source coverage. Start discovery with the regions supported by the chosen sources, and let users add jobs manually elsewhere. Global availability and comprehensive global job coverage are different commitments.

### Q1.5 Language and localization

Which languages must be supported at launch? Does this include the interface, generated content, job search, resumes, emails, and support?

**Answer:**
enlgish and arabic and yes for all of them.

**Recommendation:** Treat English and Arabic as first-class launch requirements, including right-to-left layout, mixed-language content, validation, emails, and generated documents. Store the user's interface language separately from the requested document language. Preserve the original job text and CV; translations should not silently replace source information.

### Q1.6 Current alternative

How does the target customer solve this problem today? Include spreadsheets, messaging apps, job boards, manual processes, other software, or hiring a person.

**Answer:**
`Undecided` elaborate please?.

**Recommendation:** This question asks what people do today, before Einherji. For example, a job seeker may browse job boards, copy relevant links into a spreadsheet, edit a CV in a document editor, draft a cover letter with an AI tool, and track replies in email. Identify which steps Einherji improves and which tools it complements; competitors include that manual process, even when it costs nothing.

**Follow-up F1.6:** Describe your most recent real job search: where you found jobs, how you chose them, how you prepared applications, how you tracked them, and which step consumed the most effort.

**Follow-up answer:**

### Q1.7 Pain and evidence

What makes this problem painful enough that someone would pay to solve it? What evidence do you already have from your own use or from other people?

**Answer:**
it will save lot of time , time is important and finding a job now days is hard process so this could help alot , for companies it will help them find the right employee for the right job in less time.
and for employees it will help them find the right job in less time.
and since its non-profit so money isnt what i am after.

**Recommendation:** Time saving is a reasonable hypothesis, but measure it with real users. Compare time spent creating a useful shortlist and preparing one application, and ask whether the output needed major corrections. Your own experience is initial evidence, not yet evidence that every profession or employer needs the same workflow. Willingness to keep using the product matters even if revenue is not the goal.

### Q1.8 Desired customer outcome

What should a customer be able to achieve after using the product for one week? What should be different after one month?

**Answer:**
well i wamt to help people get their dream job
at first it was to make my life easy but i think it will not cost me much 

its not daily use website 
however its target everyone and everything.
so their will be lot of users but not many will use it daily.

**Recommendation:** Keep helping people find a suitable job as the mission. Set nearer outcomes that the product can deliver: in week one, a verified profile, a useful shortlist, and one reviewed application; over a month, less repeated preparation and clearer application progress. A job offer depends on factors outside the product. Measure return visits during an active job search rather than expecting permanent daily use.

## 2. Product Direction And Scope

### Q2.1 Primary product mode

The current project contains both job-seeker workflows and agency or service-provider workflows. Which direction should be primary for the first SaaS version?

- Job-search assistant for individuals
- Recruitment or career-service workspace for professionals
- Both, with one clearly primary
- Another direction

**Answer:**
both but i want to start with empowering the individual user first.

**Recommendation:** Make the individual experience the first public mode, as your answer suggests. Preserve useful existing components for later modes, and validate recruiter or agency workflows before exposing them. This is a release sequence, not a decision to abandon the broader vision.

### Q2.2 If the primary customer is a service provider

Describe the service provider's workflow. What do they manage for each client, and what does a successful client engagement look like?

**Answer:**
well i am not sure how does it work for recruiters or HR people .
i will look into it maybe do some research or use ai help for determining that.
however for the individual users the workflow is as following:
1.he upload his cv and we try to map and summorize it for the fields we have (we should check for all fields and make it adjastable like the user can add new or remove excisting fields if they want to) so basicly it will be depending on the job and individual.
2.after that we search for available jobs in his area or for his field using web scraping and other methods we can use.
3.we show him the jobs and if he finds any job intersting he can save it or add it to his bucket.
4.he can then apply for the job using our generated cover letters for that job or use his cv we shall have ai determine that for him with precenage of how likely it is to be accepted. basicly we will have a report for him to determine his chances to get the job.
5.we can also determine his weaknesses and give him a report how to improve his cv and what skills to gain or improve to get the job with the highest precenage
6.we can also help him in determining the best time to apply for the job and the best way to contact the recruiter or hr person.
7.after applying their is nothing we can do its all up to him in his email or messaging app.
8.in the mean time he can use the website to improve his profile or cv and he can have chats with ai chat pot that can see the job he applied at and the cv he uploaded and the company info and will give him advice or questions he might be asked in the interview or questions he should ask in the interview.

**Recommendation:** Your individual workflow is a concrete starting point. I suggest these refinements:

- Keep a stable set of searchable profile fields, with optional editable sections. A fully user-defined field system adds complexity to matching and forms; manual corrections should work first.
- Present a fit or relevance score with supporting evidence and missing information. A percentage match is not a measured probability of acceptance; we do not have the hiring-outcome data needed to support that prediction.
- Show weaknesses relative to the particular job requirements. Generated documents must not invent experience, skills, or achievements.
- Use actual deadlines, listing age, and published application channels for timing and contact advice. When that information is unavailable, say so rather than generating a precise recommendation.
- Keep application status, notes, dates, and optional reminders after submission. The product can support tracking without reading the user's inbox or sending applications itself.
- Start interview support with an on-demand preparation pack. Later chat should use only the authenticated user's selected CV, job, and verified company information, with clear limits on context and cost.

**Follow-up F2.2a:** Would a transparent fit score and evidence-based improvement report meet your goal, without presenting an acceptance probability?

**Follow-up answer:**

**Follow-up F2.2b:** Which specific CV fields must users be able to add or remove? Give two examples that the current profile does not handle.

**Follow-up answer:**

### Q2.3 Core workflow

Describe the ideal first workflow from sign-up to value in 5-10 steps. Use concrete actions, not feature names.

**Answer:**
i think i answerd that in the previos question.

**Recommendation:** Use the previous answer as the workflow source. A proposed sequence is: create an account; import or enter a CV; confirm the profile and preferences; discover or manually add jobs; save a shortlist; request a fit report; review application materials and apply through the original channel; track the application and prepare for interviews. Each step should remain useful if scraping or AI is temporarily unavailable.

### Q2.4 Essential existing features

Which current capabilities must survive into the first SaaS release? For example: job discovery, job matching, fit reports, resume generation, cover letters, leads, buckets, tracked companies, scraping, messaging, or analytics.

**Answer:**
all of them basicly

**Recommendation:** Keep the working code and data where useful, but define a smaller first public surface: profile, jobs, collections, fit reports, application documents, and tracking. Interview preparation can reuse an existing document workflow. Client and supplier discovery, manager searches, agency messaging, and a broad chatbot need separate validation and cost decisions. Existing implementation alone does not establish that a feature is ready to support publicly.

**Follow-up F2.4:** Can the first public release focus on this individual workflow while the other capabilities remain available for your own use or later testing? If not, which additional feature is essential and why?

**Follow-up answer:**

### Q2.5 Features to exclude

Which existing features should be removed, hidden, postponed, or kept only for your personal account?

**Answer:**
we shall keep the good ones

**Recommendation:** Define a good launch feature as one that helps the agreed workflow, produces trustworthy results, and has manageable maintenance and operating cost. Use that test to choose features. This makes `keep the good ones` a decision we can evaluate, rather than a judgment based only on whether a feature currently runs.

### Q2.6 Product vocabulary

Which concepts should customers see in the interface? Are terms such as `bucket`, `lead`, `job`, `client`, `workspace`, and `application` correct, or should they be renamed?

**Answer:**
i think they are good names.

**Recommendation:** Keep familiar terms such as jobs and applications. `Bucket` can stay if pilot users understand it; `collection` is an alternative worth testing. Show lead, client, and workspace terminology when those workflows become relevant. The initial navigation should reflect what an individual job seeker is trying to do.

### Q2.7 Automation boundary

Which actions should be automatic, and which actions must require user review or approval? Consider scraping, AI-generated documents, sending messages, status changes, and deleting data.

**Answer:**
we shall have it configrable however sending messages and application should require user review or approval.

**Recommendation:** Begin with user-triggered discovery and generation, optional scheduled discovery later, and explicit approval for any external send or submission. User preferences must stay within platform cost limits. Treat deletion as a clear user action, and avoid adding email or application automation merely to support an approval setting.

### Q2.8 Manual work that is acceptable

What manual setup or recurring work are you willing to do for early customers? This helps separate a viable pilot from requirements that can wait for automation.

**Answer:**
we shall do all the manual work for early customers.
we will adjast it to automation after testing and determining what is needed.

**Recommendation:** Offer manual onboarding help, investigate failures, and interview pilot users, but place a weekly limit on this work. Repeatedly finding jobs or preparing applications for every customer yourself would hide whether the product is useful. Record recurring support tasks, then automate the ones that are frequent and well understood.

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

**Recommendation:** Use a free pilot with visible allowances, followed by a free public core if measured costs permit it. Introduce payment only when there is a specific funded feature or ongoing cost to recover. Resolve F0.3 and F0.4 before describing the beta as a trial or promising continued free access.

### Q3.2 Pricing hypothesis

What price range seems reasonable for the first paying customer? Include currency and whether you are thinking per month, per year, per client, per seat, or per workspace.

**Answer:**

**Recommendation:** Leave the price undecided until the pilot measures typical usage, heavy usage, and total infrastructure cost. For your cost-recovery goal, a limited allowance or credits for expensive actions may fit better than charging for all access. Include hosting, storage, email, failed requests, and maintenance in the calculation, not only AI tokens.

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

**Recommendation:** Start with individual accounts and an allowance for expensive actions. If payment becomes necessary, associate it with that account and its usage. Seats, managed-client pricing, and workspace billing should follow a confirmed team product rather than being built in advance.

### Q3.4 Usage limits and overages

Should customers have hard limits, soft limits with warnings, paid overages, or unlimited usage within a plan? Which actions are expensive enough to limit?

**Answer:**

**Recommendation:** Use hard limits for funded AI, paid discovery, and scraping, plus a global spending budget and concurrency limits. Keep reading saved data available when expensive actions are paused. The current quotas were deliberately set generously for personal use; review them for a public free service. Enforce which models the platform funds on the server, since model input is currently a string and platform keys can be used as a fallback. Provider rate limits are an additional constraint. [OpenRouter limits](https://openrouter.ai/docs/api/reference/limits).

### Q3.5 AI and infrastructure costs

Are you willing to pay for AI, scraping, storage, email, and other infrastructure on behalf of customers? If yes, what monthly cost per customer is acceptable?

**Answer:**

**Recommendation:** Give a maximum monthly amount you can sustainably fund, including hosting, database, storage, email, AI, and discovery. Define how much goes to variable usage and when funded actions pause. A scalable budget is not a spending policy. Start with a small cohort and measure cost per active user before raising allowances or opening registration widely.

### Q3.6 Customer-provided credentials

Should customers ever bring their own API keys, scraping credentials, or model provider accounts, or should the product provide everything?

**Answer:**

**Recommendation:** Keep customer-provided AI keys as an optional advanced setting, not a requirement for a normal job seeker. Explain who pays for a request and which provider receives the data. Keep keys private, and retain platform processing limits even when inference is customer-funded. Choose approved provider routes before sending CV content; downstream providers can have different data practices. [OpenRouter privacy policy](https://openrouter.ai/privacy).

### Q3.7 Payment and tax constraints

Do you already have a preferred payment provider or business entity? Are there country, currency, tax, invoicing, or payout constraints we must account for?

**Answer:**

**Recommendation:** For the free pilot, record your operating country and intended future currencies without committing to a payment integration. Before accepting payment, resolve the business entity, supported payouts, invoicing requirements, and whether the model is donations, cost recovery, or subscriptions. Provider selection depends on those answers.

## 4. Accounts, Workspaces, And Teams

### Q4.1 Account model for v1

Should the first SaaS version support only one person per account, or must it support teams from the beginning?

**Answer:**

**Recommendation:** Launch with one person per account. The current user-scoped data model can support this SaaS direction; a workspace migration is not automatically required. Preserve and verify user isolation, and revisit shared ownership when teams or agency clients become an actual requirement.

### Q4.2 Workspace meaning

If workspaces exist, what does one workspace represent?

- One person's job search
- One agency
- One client of an agency
- One hiring company
- Another boundary

**Answer:**

**Recommendation:** Use collections for a person's different job searches in v1. If an agency mode is validated later, a workspace would usually represent the agency, with client records beneath it and explicit rules for client visibility. Several search collections alone do not require team membership or workspace billing.

### Q4.3 Roles and permissions

Which roles are needed at launch? For example: owner, administrator, staff member, client, viewer, or billing manager.

**Answer:**

**Recommendation:** Start with a normal user and a narrowly authorized operator role. Operator access should cover service health, usage, and account administration, with access logged. Avoid building a complete role matrix or impersonation workflow before support needs justify it.

### Q4.4 Shared versus private data

Which data should be shared within a workspace, and which data should remain private to an individual user?

**Answer:**

**Recommendation:** Keep CVs, extracted profiles, generated documents, notes, saved jobs, application history, and credentials private to their owner. Public source listings may be cached across users where the source permits it, but personal annotations and AI outputs must remain isolated. Define sharing explicitly if team use is added.

### Q4.5 Existing personal data

Should your current personal data be migrated into a special owner account, imported into a workspace, or kept separate from the SaaS data?

**Answer:**

**Recommendation:** Preserve your existing data under your account and back it up before migrations. Use separate test accounts and an isolated test database for migration rehearsal. A personal or operator account should not gain broad data access through ordinary user endpoints.

### Q4.6 Personal-only capabilities

Are there features, seed data, credentials, or workflows that must remain available only to you and never be exposed to customers?

**Answer:**

**Recommendation:** Keep personal seeds, experimental discovery sources, and business or supplier workflows available only through explicitly chosen personal configuration. Your own integration credentials should stay scoped to your account. Separate those from platform-funded credentials, which need a deliberate public usage budget.

## 5. Data Sources, Privacy, And Trust

### Q5.1 Allowed data sources

Which job boards, company sites, APIs, feeds, or customer-provided sources may the SaaS use at launch?

**Answer:**

**Recommendation:** Choose two or three initial sources after checking their API or usage terms, geographic coverage, freshness, and stability. Favor permitted feeds or APIs when available, and support pasted job descriptions as a reliable fallback. Publish actual source coverage; do not make every existing scraper a launch dependency.

### Q5.2 Source restrictions

Are there sources that are acceptable for personal use but must not be used commercially? List any known restrictions, account requirements, or concerns.

**Answer:**

**Recommendation:** Review the selected sources individually and record their terms, attribution, rate limits, and allowed use. An existing adapter demonstrates technical access, not that its use is suitable for the public product. Keep uncertain sources disabled until reviewed. The source list from Q5.1 is needed before specific conclusions can be made.

### Q5.3 Customer credentials

Will customers connect their own accounts to external sources? If yes, which sources and what actions should the product be allowed to perform?

**Answer:**

**Recommendation:** Avoid requiring third-party job-board credentials for the first release. If a needed source provides a supported integration, prefer scoped tokens or its authorization flow. Specify permitted actions and a disconnect path. Customer-supplied credentials do not remove source restrictions or platform workload limits.

### Q5.4 Data retention

How long should the product keep jobs, documents, messages, activity history, usage records, and uploaded files?

**Answer:**

**Recommendation:** As a starting policy, retain user-created profiles, saved jobs, and documents while the account remains active; consider 30-day retention for operational scrape and error logs. Expire temporary files after processing, and offer deletion of uploaded CVs. Define backup expiry separately and avoid automatic deletion of inactive accounts without notice. These durations are proposals to confirm against actual needs and storage costs.

### Q5.5 Export and deletion

What should a customer be able to export? What should happen when they cancel, request deletion, or close a workspace?

**Answer:**

**Recommendation:** Let users export their profile, saved jobs, application history, notes, and documents. Account closure should revoke access and remove owned active data, files, and credentials through a tracked deletion process. Explain any backup retention period. Stopping paid features later should not silently erase work or remove the ability to export it.

### Q5.6 Resume and document handling

Should resumes, cover letters, and other documents be stored permanently, versioned, downloadable, shareable, or automatically deleted after a period?

**Answer:**

**Recommendation:** Treat uploaded CVs and generated documents as owned assets with storage keys, version information, access control, and deletion behavior. Default to private access and user-controlled downloads. The current upload completion returns a URL without persisting an owned CV asset, so document lifecycle work is needed before promising durable CV history or deletion. Public sharing can be a later opt-in capability.

### Q5.7 Trust requirements

What security, privacy, auditability, or compliance expectations will customers have? Include any requirements you know about, without assuming a specific legal framework yet.

**Answer:**

**Recommendation:** Make the first trust commitments concrete: isolated accounts, private CVs, controlled secret access, clear AI-provider disclosure, and working export and deletion. Avoid putting CV text or credentials into analytics and error logs. Disable optional prompt logging and select acceptable downstream data policies rather than assuming every free model handles data identically. [OpenRouter data collection](https://openrouter.ai/docs/guides/privacy/data-collection), [provider data practices](https://openrouter.ai/privacy).

## 6. Onboarding And Customer Experience

### Q6.1 First-session setup

What information should a new customer provide before the product can deliver value? What can be optional?

**Answer:**

**Recommendation:** Ask for language, an uploaded CV or manual profile, target roles, and location or remote preference. Let the user confirm extracted information. Salary, company size, detailed criteria, and integration keys can remain optional. A missing CV or unavailable AI service should not prevent a user from entering a profile manually.

### Q6.2 Time to first value

How quickly should a new customer see a useful result? For example: a matched job, a completed fit report, a generated document, or a client dashboard.

**Answer:**

**Recommendation:** Test a target of completing a basic profile within five minutes and reaching a useful job or fit review within ten minutes. These are pilot targets, not current performance claims. Use manual job entry or known sources to test the workflow independently of scraping delays, with visible progress and recovery for slower work.

### Q6.3 Onboarding style

Should onboarding be self-service, guided by a checklist, assisted by you, or a mixture depending on the plan?

**Answer:**

**Recommendation:** Use a short self-service flow, with optional personal help for pilot users. Keep advanced settings out of the initial path. Record where people need help before adding a larger wizard, tutorial system, or setup automation.

### Q6.4 Notifications

Which notifications matter at launch? Consider email, in-app notifications, scheduled digests, scraping completion, usage warnings, billing, and customer activity.

**Answer:**

**Recommendation:** Prioritize essential account emails and in-app results or failure notices. Add optional job digests only when discovery is reliable and users request them; weekly may suit the usage pattern you described. Let users pause job-search notifications when their search ends. Multiple messaging channels can wait.

### Q6.5 Support

How will early customers ask for help, and how much support are you willing to provide manually?

**Answer:**

**Recommendation:** Start with one support email address or a simple feedback form and a realistic response expectation. Cap weekly support time, track recurring issues, and ask users before they share private document content. A support request should not automatically grant access to their full CV and history.

## 7. Validation And Success Metrics

### Q7.1 Activation event

What single action would prove that a new customer understood the value of the product?

**Answer:**

**Recommendation:** Use saving a genuinely relevant job within the first day as the initial activation event, then ask whether the user would consider applying. Measure fit-report and draft completion as subsequent steps. Account creation and CV upload alone do not demonstrate that the product delivered useful work.

### Q7.2 Retention event

What recurring action would indicate that the product is becoming part of the customer's workflow?

**Answer:**

**Recommendation:** Measure whether people who are still actively searching return the following week to save another job, prepare an application, update progress, or prepare for an interview. Track this active-search group separately from people who found work or paused their search. Daily activity is a poor primary target for the episodic use you described.

### Q7.3 Business success

What would make the first 90 days successful? Include a target number of users, paying customers, revenue, retention, or validated learning if you have one.

**Answer:**

**Recommendation:** For the first 90 days after pilot launch, consider these provisional goals: 10-20 pilot users, at least five who complete the core workflow more than once, reported time savings supported by concrete examples, and costs within your monthly ceiling. Adjust after establishing a baseline. Useful outcomes and sustainable operation fit your motivation better than a revenue target at this stage.

### Q7.4 Pilot design

How many pilot customers do you want, and what should each pilot test? What would make you stop, change direction, or continue?

**Answer:**

**Recommendation:** Recruit 10-20 people from the first user group and observe their use over a two-to-four-week period. Test shortlist relevance, profile accuracy, document editing effort, time saved, repeat use, and operating cost. Set review criteria in advance; revisit the workflow if users repeatedly find outputs unhelpful or need you to perform the core work manually.

### Q7.5 Feedback loop

How will you collect feedback and observe actual usage? For example: interviews, support conversations, product analytics, session reviews, or weekly check-ins.

**Answer:**

**Recommendation:** Combine a few observed onboarding sessions, short weekly feedback conversations, and minimal product events. Ask what users did, what failed, and what they changed in generated output. Track enough to evaluate activation, repeat use, and cost without collecting document content in analytics.

## 8. Technical And Operational Constraints

### Q8.1 What should remain unchanged?

Which parts of the current stack or architecture do you want to preserve if possible? Consider Next.js, tRPC, Better Auth, Neon, Drizzle, UploadThing, Vercel, AI providers, and scraper integrations.

**Answer:**

**Recommendation:** Keep the current application stack unless a confirmed requirement exposes a limitation. Concentrate changes on public account lifecycle, document ownership, affordable usage, source coverage, and reliable expensive operations. Vercel remains a reasonable preference, subject to plan eligibility and measured cost. Evaluate provider changes against the pilot workload before replacing working integrations. [Vercel plans](https://vercel.com/docs/plans).

### Q8.2 Expected scale

What scale should the first production version support? Estimate users, workspaces, jobs, scrapes, generated documents, and AI requests per day or month.

**Answer:**

**Recommendation:** Size the first operating envelope around the pilot cohort, then estimate searches and AI actions per active person. Monthly registrations alone do not describe the workload. Use measured usage to choose a public-beta admission limit and concurrency policy rather than designing for an unsupported forecast of very large demand.

### Q8.3 Reliability expectations

Which workflows must be reliable and recoverable even when a provider fails? Which workflows can be best-effort during the pilot?

**Answer:**

**Recommendation:** Require reliable account access, saved data, document access, and export. External discovery and AI may be temporarily unavailable, but they should show clear status, allow safe retries, and avoid duplicate results or duplicate funded work. Manual profile and job entry should keep the core experience usable during provider failures.

### Q8.4 Background processing

Which operations should run asynchronously before launch? Consider scraping, AI generation, document processing, notifications, imports, and scheduled jobs.

**Answer:**

**Recommendation:** Prioritize durable execution for multi-source scraping and batch analysis, since the earlier audit found request-bound work there. Add bounded retries, progress, and cancellation where needed. Assess individual parsing and document generation by their actual duration before moving every action to a queue. Reuse the existing QStash integration where appropriate rather than introducing a separate workflow platform by default.

### Q8.5 Observability and administration

What must you be able to see or control as the operator? Consider customer status, usage, failed jobs, provider costs, impersonation or support access, feature flags, and account suspension.

**Answer:**

**Recommendation:** Start with usage by account, provider cost, source failures, stuck operations, storage volume, and an ability to pause expensive actions or registration. Reuse existing operational tools where practical. Keep operator privileges narrow and logged; unrestricted impersonation and a large custom administration dashboard are unnecessary for the first pilot. Provider spend controls can supplement application limits. [Vercel spend management](https://vercel.com/docs/spend-management).

### Q8.6 Release sequence

Do you have a preferred sequence such as internal cleanup, private pilot, paid beta, and public launch? Include target dates if known.

**Answer:**

**Recommendation:** Use readiness gates: clarify this discovery file; agree on the individual workflow; prepare public account and document lifecycle plus cost limits; run a small free pilot; review results; open a capped public beta. Add payment or another customer mode when evidence supports it. Dates can follow your weekly capacity rather than an artificial deadline.

## 9. Migration From Personal Project To SaaS

### Q9.1 Personal seed data

The current seed data includes personal categories and Egypt-specific examples. Should these be removed, generalized, converted into onboarding templates, or retained only for your account?

**Answer:**

**Recommendation:** Keep the personal seeds available for your own account or development, and remove them from new-user onboarding. Extract genuinely reusable templates separately. Factory searches in Cairo or Giza and personal business pitches should never be inserted into unrelated users' accounts just because they exist in the seed script.

### Q9.2 Default data

Should every new customer receive starter buckets, sample jobs, templates, criteria, or other defaults? If yes, what should be generic and what should be configurable by plan or region?

**Answer:**

**Recommendation:** Start with a clean account and an optional generic job-search collection. Offer templates by user choice and language, with sample content clearly marked. Let actual profile and location inputs determine discovery preferences rather than preloading Egypt-specific settings or fabricated jobs.

### Q9.3 Existing account migration

How should your current account, settings, criteria, jobs, documents, credentials, and history behave after the SaaS conversion?

**Answer:**

**Recommendation:** Preserve your existing identifiers and relationships wherever possible. Rehearse any necessary migrations on a backup and verify jobs, documents, history, criteria, and credentials afterward. If user ownership remains the v1 model, a workspace migration is unnecessary; seed cleanup alone should not rewrite your personal account.

### Q9.4 Branding and public surface

Which personal references, internal names, comments, seed labels, and documentation must be removed or rewritten before customers see the product?

**Answer:**

**Recommendation:** Review customer-visible defaults, account emails, navigation, model labels, source descriptions, and documentation for personal assumptions. Keep the Einherji name. Replace stale public instructions with the actual supported workflow, and keep internal development notes separate from customer-facing material.

## 10. Priorities And Non-Negotiables

### Q10.1 Top three priorities

List the three outcomes that matter most for this conversion.

**Answer:**

**Recommendation:** Proposed priorities are: deliver a useful individual job-search workflow; keep cost and maintenance sustainable; protect user data and explain generated advice. Rank these yourself so the eventual plan can resolve trade-offs consistently.

### Q10.2 Non-negotiables

What must not be compromised, even if it increases implementation time or cost?

**Answer:**

**Recommendation:** Consider account isolation, private documents, no fabricated qualifications, user approval for external actions, and a funded-usage ceiling as non-negotiable. Your English and Arabic launch requirement also needs an explicit quality standard. Confirm which of these matter most to you and add any others.

### Q10.3 Acceptable compromises

What are you willing to simplify for the first release?

**Answer:**

**Recommendation:** Accept fewer sources, a narrower initial profession or region, manual pilot onboarding, limited AI allowances, simple application tracking, and no team interface. These reduce launch complexity while preserving the individual outcome. Keep the longer-term modes on the roadmap for later validation.

### Q10.4 Known risks

What worries you most about making this a SaaS product?

**Answer:**

**Recommendation:** The clearest risks from your answers are scope expansion, unknown demand, funded usage cost, discovery reliability, and support load. Test them through a small cohort, measured cost, a manual import fallback, and a fixed weekly support allocation. Record which concern would make you change the release sequence.

### Q10.5 Open decisions

List any decisions you already know are unresolved but that are not covered above.

**Answer:**

**Recommendation:** Resolve the first user group, weekly time, monthly ceiling, long-term free policy, launch sources, account model, and pilot success criteria before detailed architecture. Record each accepted recommendation as your answer so the implementation plan can distinguish your decisions from my suggestions.

## Completion Check

Before sending this back for review, mark each section as one of:

- `Answered`
- `Partially answered`
- `Not decided`
- `Not applicable`

| Section | Status | Notes |
| --- | --- | --- |
| 0. Quick Product Profile | Partially answered | Answers present; free-period policy and capacity need clarification. |
| 1. Customer And Problem | Partially answered | First user group and current alternatives remain unresolved. |
| 2. Product Direction And Scope | Partially answered | Workflow described; release scope and score semantics need decisions. |
| 3. Business Model And Pricing | Not decided | Original answers empty; recommendations supplied. |
| 4. Accounts, Workspaces, And Teams | Not decided | Original answers empty; individual-account default proposed. |
| 5. Data Sources, Privacy, And Trust | Not decided | Original answers empty; sources and lifecycle need confirmation. |
| 6. Onboarding And Customer Experience | Not decided | Original answers empty; pilot defaults proposed. |
| 7. Validation And Success Metrics | Not decided | Original answers empty; provisional metrics proposed. |
| 8. Technical And Operational Constraints | Not decided | Original answers empty; priorities proposed. |
| 9. Migration From Personal Project To SaaS | Not decided | Original answers empty; preservation and seed-cleanup approach proposed. |
| 10. Priorities And Non-Negotiables | Not decided | Original answers empty; priorities proposed for your ranking. |

The status entries above are review observations from 2026-10-03, not acceptance of the recommendations. Update them as you answer or decide.
