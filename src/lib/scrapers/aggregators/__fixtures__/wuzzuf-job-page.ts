// Trimmed from a real Wuzzuf job page (August 2026). The full page is ~700KB of
// React bundle; everything the parser reads is kept here verbatim, including the
// traps that made earlier versions wrong:
//
//  - emotion <style> blocks inlined next to content, which land in textContent
//  - a "Job Details" table whose values are filled in client-side, so the server
//    response has the labels and nothing else
//  - hashed class names that change on every deploy
//  - "internal policies" in the description, which a description-wide work-type
//    scan reads as "internship"
//  - a company name truncated in the header link
export const WUZZUF_JOB_PAGE_HTML = `<!DOCTYPE html><html lang="en"><head>
<title data-rh="true">Sr. Banking &amp; Treasury job at RAQMU for Building and Construction in 6th of October, Giza - Apply on Wuzzuf</title>
<meta data-rh="true" name="description" content="Apply for a Sr. Banking &amp; Treasury at RAQMU for Building and Construction in 6th of October, Giza today. Explore job Accounting/Finance job opportunities in leading companies &amp; grow your career with Wuzzuf | Egypt"/>
<meta data-rh="true" property="og:title" content="Sr. Banking &amp; Treasury job at RAQMU for Building and Construction in 6th of October, Giza - Apply on Wuzzuf"/>
<meta data-rh="true" property="og:url" content="https://wuzzuf.net/jobs/p/pskpkwph4fao-sr-banking-treasury-raqmu-giza-egypt"/>
<meta data-rh="true" property="og:locality" content="6th of October"/>
<meta data-rh="true" property="og:region" content="Giza"/>
<meta data-rh="true" property="og:country_name" content="Egypt"/>
</head><body>
<div class="css-1x2y3z">
  <style data-emotion="css gkdl1m">.css-gkdl1m{font-size:24px;font-weight:700;}</style>
  <a href="/jobs/careers/RAQMU-Egypt-133433"><img alt="logo"/></a>
  <h1 class="css-gkdl1m">Sr. Banking &amp; Treasury</h1>
  <div class="css-5kov97">
    <div class="css-1earnj5"><a class="css-g65o95" href="/a/Full-Time-Jobs-in-Egypt?filters%5Bcountry%5D%5B0%5D=Egypt"><span class="css-dmid6b">Full Time</span></a></div>
    <a class="css-wzyv7i" href="/a/On-Site-Jobs-in-Egypt?filters%5Bcountry%5D%5B0%5D=Egypt"><span class="css-oos404">On-site</span></a>
  </div>
  <strong class="css-1vlp604"><a class="css-1qczh9e" href="/jobs/careers/RAQMU-Egypt-133433">RAQMU for Building and C...</a></strong>
  <span>- 6th of October, Giza</span>
  <span>posted 19 days ago</span>
</div>
<section class="css-pbzohz">
  <style data-emotion="css 1cen1cg">.css-1cen1cg{font-size:16px;font-weight:700;}</style>
  <h2 class="css-1cen1cg">Job Details</h2>
  <div class="css-1ajx53j"><span class="css-720fa0">Experience Needed<!-- -->:</span></div>
  <div class="css-1ajx53j"><span class="css-720fa0">Career Level<!-- -->:</span></div>
  <div class="css-1ajx53j"><span class="css-720fa0">Salary<!-- -->:</span></div>
</section>
<section>
  <style data-emotion="css n7fcne">.css-n7fcne{font-size:14px;color:#001433;}</style>
  <h2 class="css-1cen1cg">Job Description</h2>
  <div class="css-n7fcne"><p>Overview: Manage daily banking operations and treasury reporting.</p><p>Ensure compliance with internal policies and banking covenants.</p></div>
</section>
<section>
  <h2 class="css-1cen1cg">Job Requirements</h2>
  <div class="css-n7fcne"><p>Proven expertise in Banking and Finance.</p></div>
</section>
</body></html>`;

export const WUZZUF_SITEMAP_XML = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://wuzzuf.net/jobs/p/aaa111-senior-software-engineer-acme-cairo-egypt</loc>
    <lastmod>2026-08-22T02:12:46+03:00</lastmod>
  </url>
  <url>
    <loc>https://wuzzuf.net/jobs/p/bbb222-general-accountant-rahala-giza-egypt</loc>
    <lastmod>2026-08-20T02:12:46+03:00</lastmod>
  </url>
  <url>
    <loc>https://wuzzuf.net/jobs/p/ccc333-software-engineer-olis-dubai-united-arab-emirates</loc>
    <lastmod>2026-08-21T02:12:46+03:00</lastmod>
  </url>
  <url>
    <loc>https://wuzzuf.net/companies/acme</loc>
    <lastmod>2026-08-21T02:12:46+03:00</lastmod>
  </url>
</urlset>`;
