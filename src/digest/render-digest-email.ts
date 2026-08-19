const MAX_REASONS_SHOWN = 2;

export interface DigestJob {
  title: string;
  company: string;
  jobUrl: string;
  location?: string | null;
  salary?: string | null;
  score: number;
  reasons: string[];
}

export interface DigestContent {
  name: string;
  topJobs: DigestJob[];
  totalNewJobs: number;
  appUrl: string;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * The daily email.
 *
 * Job titles and company names come from third-party feeds, so every
 * interpolated value is escaped — an unescaped `<` in a job title would break the
 * layout at best, and inject markup into the reader's inbox at worst.
 *
 * Inline styles rather than a stylesheet because that's all email clients
 * reliably support, and a plain-text alternative goes alongside it.
 */
export function renderDigestHtml(content: DigestContent): string {
  const rows = content.topJobs
    .map((job) => {
      const meta = [job.location, job.salary]
        .filter((value): value is string => Boolean(value))
        .map(escapeHtml)
        .join(" · ");
      const reasons = job.reasons.slice(0, MAX_REASONS_SHOWN).map(escapeHtml).join(" · ");

      return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #e5e5e5;">
          <a href="${escapeHtml(job.jobUrl)}" style="font-size:15px;font-weight:600;color:#111;text-decoration:none;">
            ${escapeHtml(job.title)}
          </a>
          <div style="font-size:13px;color:#555;margin-top:2px;">${escapeHtml(job.company)}</div>
          ${meta ? `<div style="font-size:12px;color:#777;margin-top:2px;">${meta}</div>` : ""}
          ${reasons ? `<div style="font-size:12px;color:#0a7;margin-top:4px;">${reasons}</div>` : ""}
        </td>
      </tr>`;
    })
    .join("");

  const remaining = content.totalNewJobs - content.topJobs.length;

  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:28px 22px;background:#fff;color:#111;">
  <h1 style="margin:0 0 4px;font-size:19px;font-weight:600;">
    ${content.totalNewJobs} new ${content.totalNewJobs === 1 ? "job" : "jobs"} for you
  </h1>
  <p style="margin:0 0 20px;color:#666;font-size:14px;">
    Morning ${escapeHtml(content.name)} — here ${content.topJobs.length === 1 ? "is the best match" : `are the top ${content.topJobs.length}`} from last night's run.
  </p>

  <table style="width:100%;border-collapse:collapse;">${rows}</table>

  ${
    remaining > 0
      ? `<p style="margin:18px 0 0;font-size:13px;color:#666;">
           …and ${remaining} more waiting in the app.
         </p>`
      : ""
  }

  <p style="margin:24px 0 0;">
    <a href="${escapeHtml(content.appUrl)}/jobs" style="display:inline-block;background:#111;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:500;">
      Open all jobs
    </a>
  </p>

  <p style="margin:26px 0 0;color:#999;font-size:12px;">
    You're getting this because the daily digest is on.
    Turn it off in <a href="${escapeHtml(content.appUrl)}/settings" style="color:#666;">Settings</a>.
  </p>
</div>`.trim();
}

/** Plain-text alternative — some clients show this, and spam filters like it. */
export function renderDigestText(content: DigestContent): string {
  const lines = content.topJobs.map((job) => {
    const meta = [job.location, job.salary].filter(Boolean).join(" · ");
    return `- ${job.title} — ${job.company}${meta ? ` (${meta})` : ""}\n  ${job.jobUrl}`;
  });

  const remaining = content.totalNewJobs - content.topJobs.length;

  return [
    `${content.totalNewJobs} new ${content.totalNewJobs === 1 ? "job" : "jobs"} for you`,
    "",
    ...lines,
    remaining > 0 ? `\n…and ${remaining} more in the app.` : "",
    "",
    `All jobs: ${content.appUrl}/jobs`,
    `Turn this off: ${content.appUrl}/settings`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export function buildSubject(content: DigestContent): string {
  const best = content.topJobs[0];
  if (!best) return "No new jobs today";

  // Leading with the best match beats a generic count — it's what decides
  // whether the mail gets opened at all.
  return content.totalNewJobs === 1
    ? `New job: ${best.title} at ${best.company}`
    : `${content.totalNewJobs} new jobs — top pick: ${best.title} at ${best.company}`;
}

/**
 * The same digest as a Telegram message.
 *
 * A separate renderer rather than a reused one: Telegram accepts only b, i, u,
 * s, a, code and pre, and rejects the entire message if it meets a tag it
 * doesn't know. The email markup would simply fail to send.
 */
export function renderDigestTelegram(content: DigestContent): string {
  const escape = (text: string) =>
    text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const jobs = content.topJobs.map((job, index) => {
    const meta = [job.location, job.salary]
      .filter((value): value is string => Boolean(value))
      .map(escape)
      .join(" · ");

    return [
      `${index + 1}. <a href="${escape(job.jobUrl)}"><b>${escape(job.title)}</b></a>`,
      `   ${escape(job.company)}${meta ? ` — ${meta}` : ""}`,
    ].join("\n");
  });

  const remaining = content.totalNewJobs - content.topJobs.length;

  return [
    `<b>${content.totalNewJobs} new ${content.totalNewJobs === 1 ? "job" : "jobs"}</b>`,
    "",
    ...jobs,
    remaining > 0 ? `\n<i>…and ${remaining} more in the app.</i>` : "",
    "",
    `<a href="${escape(content.appUrl)}/jobs">Open all jobs</a>`,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
