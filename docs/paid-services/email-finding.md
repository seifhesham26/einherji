# Email finding — the one decision money doesn't settle

**Created:** 2026-08-18 · **Blocks:** AUDIT H1 ("nothing is ever sent")

---

## The problem, verified

`leads.email` exists on the table. **Nothing has ever written to it.**

`findHiringManagers` returns names, titles, headlines, `about` text and profile
URLs — no email address. So the product stops at "approve" not because the sending
code is missing, but because there is nothing to send *to*.

That means buying an email service is not a shortcut past this. It's one of three
options, and it isn't obviously the best one.

---

## Option 1 — Assisted sending (free)

Generate the message, then hand it to the user to send themselves. A copy button, a
"mark as sent" action, and `sentAt` finally gets written.

- **Cost:** nothing.
- **Code:** small. The message is already generated and approved; this is a status
  transition and a copy control.
- **Trade-off:** you send each one by hand. For a personal job hunt at ~10 messages
  a week, that is genuinely not a burden — and you'd probably want to eyeball a cold
  outreach message before it goes anyway.
- **Compliance:** unchanged. You're the sender, on your own account.

**This is the smallest honest version of the feature, and it makes the product
complete end to end.** I'd do this one first regardless of budget, because it also
tells you whether automated sending is a thing you actually want.

---

## Option 2 — Buy an email-finding service (paid)

Hunter.io, Apollo, Clearbit and similar resolve a name plus a company domain to a
probable work email.

- **Cost:** real, and usually priced per lookup or per month. Check current pricing.
- **Code:** a new source in the leads pipeline, plus deliverability handling —
  bounces, retries, and a suppression list you must honour.
- **Trade-offs worth knowing before you spend:**
  - **Accuracy is probabilistic.** These services guess patterns
    (`first.last@company.com`) and verify them. A wrong guess is a bounce, and
    bounces damage your sending domain's reputation.
  - **You'd be processing personal data you were not given.** Under UK/EU GDPR,
    cold outreach to an individual's work address needs a lawful basis and an
    easy opt-out. This is manageable, but it's a decision, not a detail.
  - **You need a warmed sending domain.** Sending cold email from a fresh domain
    through Resend's free tier will land in spam.

---

## Option 3 — Send on LinkedIn (don't)

The messages are written for LinkedIn, so this looks like the natural fit. It isn't
available: LinkedIn messaging requires an authenticated session, and automating one
is against their terms.

This is the exact line the whole scraper deliberately stayed behind — every job
source in this app uses public, logged-out endpoints for that reason. Crossing it
here would put the account at risk and undo that position for one feature.

**Not recommended at any price.**

---

## Recommendation

Build **Option 1** now, at zero cost. It closes H1, writes `sentAt`, and makes the
product do what it says.

Then use it for a few weeks. If hand-sending turns out to be the bottleneck — and
it may well not be — you'll know exactly what volume you need before paying for
Option 2, instead of guessing.
