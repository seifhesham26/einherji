# Einherji: AI Job Hunter

Einherji is an automated AI-powered job search assistant. It scrapes LinkedIn for job postings, identifies hiring managers, and uses AI (via OpenRouter/OpenAI) to generate personalized outreach messages based on your CV.

## Tech Stack
- **Framework:** Next.js (App Router)
- **Database:** Neon PostgreSQL + Drizzle ORM
- **Auth:** Better Auth
- **AI:** OpenRouter (supports Gemini, Llama, Claude, OpenAI)
- **Scraping:** Apify
- **File Uploads:** UploadThing

---

## 🚀 Setup Guide

### 1. Clone & Install
```bash
git clone <your-repo-url>
cd einherji
npm install
```

### 2. Environment Variables
Rename `.env.local.example` to `.env.local` (or create a new `.env.local` file) and fill in the following keys:

#### Database (Neon)
1. Go to [Neon.tech](https://neon.tech) and create a free project.
2. Copy the **Connection String** (Postgres URL).
3. Set `DATABASE_URL=postgresql://...`

#### Authentication (Better Auth)
1. Generate a random 32-character string (e.g., run `openssl rand -base64 32` in your terminal).
2. Set `BETTER_AUTH_SECRET=your_random_string`
3. Set `BETTER_AUTH_URL=http://localhost:3000` (update this for production).

#### File Uploads (UploadThing)
1. Go to [UploadThing](https://uploadthing.com) and create a project.
2. Copy the API Token.
3. Set `UPLOADTHING_TOKEN=your_token_here`

#### AI (OpenRouter)
1. Go to [OpenRouter.ai](https://openrouter.ai), create an account, and generate an API key.
2. Set `OPENROUTER_API_KEY=sk-or-...`

#### Scraping (Apify)
1. Go to [Apify Console](https://console.apify.com).
2. Create an account and go to **Settings → API & Integrations**.
3. You can set a global server token `APIFY_API_TOKEN=apify_api_...` in your `.env.local`.
4. *Note: Users can also provide their personal Apify token inside the app's Settings page!*

---

### 3. Database Setup
Once your `DATABASE_URL` is configured, push the database schema to Neon:

```bash
npx drizzle-kit push
```

### 4. Run the App
Start the development server:

```bash
npm run dev
```
Visit `http://localhost:3000` in your browser.

---

## 🛠️ Usage

1. **Sign up/Login** via the UI.
2. Go to **Settings** and ensure your Apify token is saved.
3. Go to **Criteria** and upload your CV to auto-extract skills, or enter them manually.
4. Click **Start Job Scraping** (or check the Jobs/Leads pages) to automatically find jobs matching your criteria!
