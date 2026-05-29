# Apify Setup Guide

Apify is the scraping service that powers the two most important features in this app: finding LinkedIn job postings that match your criteria, and discovering the hiring managers at those companies. Without an Apify token, neither of these features will work.

This guide walks you through creating an account, generating a token, and adding it to the app.

---

## What Apify does in this app

| When you click… | What Apify runs |
|---|---|
| **Run Daily Scrape** on the Dashboard | Searches LinkedIn for jobs matching your criteria |
| **Find Manager** on any job card | Searches LinkedIn for the hiring manager at that company |

Apify runs these as cloud actors — you don't need LinkedIn credentials or a browser on your machine. Everything runs on Apify's infrastructure using your credits.

---

## Step 1 — Create an Apify account

1. Go to [console.apify.com](https://console.apify.com)
2. Click **Sign up** (top right)
3. Register with Google, GitHub, or an email + password
4. Verify your email if prompted

> Apify gives every new account **$5 in free credits** on signup — enough for dozens of scrape runs. No credit card required to get started.

---

## Step 2 — Generate an API token

1. Log into the [Apify Console](https://console.apify.com)
2. Click your **avatar or initials** in the top-right corner
3. Select **Settings** from the dropdown
4. Go to the **API & Integrations** tab (or look for "Integrations" in the left sidebar)
5. Under **API tokens**, click **+ Add new token** (or **Create token**)
6. Give it a name — something like `einherji` or `job-hunter` so you can identify it later
7. Leave the permissions on their default (read + write is fine — the actors need to write dataset results)
8. Click **Create** and then **copy the token immediately** — Apify only shows the full value once

Your token looks like this: `apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

---

## Step 3 — Add the token in the app

1. Open the app and go to **Settings** in the left sidebar
2. Find the **Integrations** section
3. Paste your token into the **Apify API Token** field
4. Click **Save Key**

The field masks the value by default. Use the eye icon to show it if you need to verify what was saved.

---

## Step 4 — Test it works

1. Make sure you've filled in your **Criteria** (at minimum: one job title and one location)
2. Go to the **Dashboard**
3. Click **Run Daily Scrape**
4. Wait 30–90 seconds — the scrape runs on Apify's cloud, not your machine
5. Go to the **Jobs** page — you should see new job cards appear

If jobs appear, Apify is connected and working correctly.

---

## Credit usage

Each actor run costs a small amount of Apify credits. Typical usage:

| Action | Approximate cost |
|---|---|
| One job scrape run (up to 100 jobs) | ~$0.10–$0.20 |
| One "Find Manager" search per company | ~$0.05–$0.10 |

With the free $5 in starter credits, you can run roughly 25–50 scrapes before needing to top up. Apify's pay-as-you-go plan has no monthly fee — you only pay for what you use.

To check your current credit balance: [console.apify.com/billing](https://console.apify.com/billing)

---

## Troubleshooting

**No jobs appear after running the scrape**
- Confirm your Criteria has at least one job title and one location saved
- Check that your Apify token is saved in Settings (the field should not be empty)
- Open the [Apify Console](https://console.apify.com) → **Runs** and look for a recent run — if it shows an error, the actor itself may have hit a rate limit; wait a few minutes and retry

**"Unauthorized" or "Invalid token" error**
- The token may have been copied with extra whitespace — go to Settings, clear the field, and paste it again
- If you deleted or rotated the token in Apify Console, generate a new one and update Settings

**Credits ran out**
- Go to [console.apify.com/billing](https://console.apify.com/billing) and top up — $5 is usually enough for several weeks of daily use
- The app will show an error from Apify when credits are exhausted; it will not silently fail

**The app works without my token**
- The app has a shared fallback token for light testing, but it has limited capacity and may be rate-limited. Always add your own token for reliable daily use.

---

## Managing your token

- **Never share your Apify token** — anyone with it can run actors on your account and consume your credits
- You can rotate (regenerate) the token at any time in Apify Console → Settings → API & Integrations → delete the old token and create a new one, then update Settings in the app
- You can create multiple tokens if you use Apify in other projects — each project should have its own
