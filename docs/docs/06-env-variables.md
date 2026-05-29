# 06 — Environment Variables

Create a `.env.local` file in the root of your Next.js project:

```env
# ─── Database ─────────────────────────────────────────────────────────────────
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=require
# Get this from: https://console.neon.tech → your project → Connection string

# ─── Apify ────────────────────────────────────────────────────────────────────
APIFY_API_TOKEN=apify_api_xxxxxxxxxxxxxxxxxxxx
# Get this from: https://console.apify.com → Settings → API & Integrations

# ─── Anthropic (Claude) ───────────────────────────────────────────────────────
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxxxxxxxxx
# Get this from: https://console.anthropic.com → API Keys

# ─── Auth (if using Clerk) ────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx

# ─── App ──────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Where To Get Each Key

### Neon DB
1. Go to [console.neon.tech](https://console.neon.tech)
2. Create a new project
3. Go to **Connection Details**
4. Copy the **Connection string** (Postgres format)

### Apify
1. Go to [console.apify.com](https://console.apify.com)
2. Sign up / log in
3. Go to **Settings → API & Integrations**
4. Copy your **Personal API token**

### Anthropic
1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Go to **API Keys**
3. Create a new key
4. Copy it (you won't see it again)

---

## `.env.local` vs `.env`
- `.env.local` → local development only, never committed to git
- Add `.env.local` to your `.gitignore` ✅
- For production (Vercel), add these as **Environment Variables** in your project settings
