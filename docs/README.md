# AI Job Hunter — Full System Documentation

## Overview
An automated job hunting system that scrapes LinkedIn jobs via Apify, finds hiring managers, generates personalized outreach messages using Claude AI, lets you approve them, then tracks everything in a CRM.

---

## Tech Stack
| Layer | Choice |
|---|---|
| Framework | Next.js 14 (App Router) |
| Database | Neon DB (Postgres) |
| ORM | Drizzle ORM |
| AI | Claude API (claude-sonnet-4) |
| Scraping | Apify API |
| Auth | Clerk or NextAuth |
| UI | Tailwind CSS + shadcn/ui |

---

## File Structure
```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── page.tsx                  # Main dashboard
│   │   ├── criteria/page.tsx         # Job search criteria setup
│   │   ├── jobs/page.tsx             # Scraped jobs list
│   │   ├── leads/page.tsx            # Hiring managers CRM
│   │   ├── messages/page.tsx         # Message approval queue
│   │   └── tracker/page.tsx          # Outreach tracker
│   └── api/
│       ├── apify/
│       │   ├── scrape-jobs/route.ts  # Trigger Apify job scrape
│       │   └── find-managers/route.ts # Trigger Apify profile scrape
│       ├── messages/
│       │   ├── generate/route.ts     # Generate AI messages
│       │   └── approve/route.ts      # Approve a message
│       ├── leads/
│       │   └── route.ts              # CRUD for leads
│       └── criteria/
│           └── route.ts              # CRUD for search criteria
├── lib/
│   ├── db/
│   │   ├── schema.ts                 # Drizzle schema
│   │   └── index.ts                  # DB connection
│   ├── apify/
│   │   └── client.ts                 # Apify API wrapper
│   └── claude/
│       └── client.ts                 # Claude API wrapper
├── components/
│   ├── jobs/JobCard.tsx
│   ├── leads/LeadTable.tsx
│   ├── messages/ApprovalCard.tsx
│   └── criteria/CriteriaForm.tsx
└── types/
    └── index.ts                      # Shared TypeScript types
```

---

## Docs Index
1. [Database Schema](./docs/01-database-schema.md)
2. [Apify Integration](./docs/02-apify-integration.md)
3. [Claude AI Prompts](./docs/03-claude-prompts.md)
4. [API Routes](./docs/04-api-routes.md)
5. [UI Pages](./docs/05-ui-pages.md)
6. [Environment Variables](./docs/06-env-variables.md)
7. [Full Build Prompt](./docs/07-full-build-prompt.md)

## User Guides
- [User Guide](./USER_GUIDE.md)
- [Apify Setup Guide](./APIFY_SETUP.md)
