import { config } from "dotenv";
import type { CreateBucketInput } from "../src/buckets/buckets.validators";

config({ path: ".env.local" });

/**
 * Creates the starter buckets for an account.
 *
 *   npm run seed:buckets -- <userId>
 *
 * Idempotent: a bucket whose name already exists is skipped, so re-running after
 * editing one is safe and won't produce a second copy.
 *
 * The keyword lists are a starting point, not a finished search. Expect to tune
 * them once you've seen what each bucket actually returns.
 */

// Arabic terms sit alongside English deliberately: the matcher normalises both,
// and Egyptian listings are written in either.
const STARTER_BUCKETS: CreateBucketInput[] = [
  {
    name: "Jobs for me",
    kind: "jobs",
    keywords: [
      "react developer",
      "next.js",
      "frontend developer",
      "full stack developer",
      "typescript",
      "react native",
    ],
    locations: ["Remote", "Cairo", "Egypt"],
    sources: [
      "greenhouse",
      "lever",
      "ashby",
      "workable",
      "remoteok",
      "arbeitnow",
      "jobicy",
      "himalayas",
      "weworkremotely",
      // The Egypt half of this bucket. The remote boards above have no Cairo
      // coverage at all, and Adzuna has no Egypt index to offer one.
      "wuzzuf",
      "linkedin_guest",
    ],
    pitch:
      "Full-stack developer building web and mobile applications — React, Next.js, TypeScript, React Native. Available remotely or in Cairo.",
  },
  {
    name: "Clients for us",
    kind: "clients",
    // What someone writes when they need software built, rather than a job title.
    keywords: [
      "website",
      "web application",
      "mobile app",
      "react developer",
      "next.js",
      "flutter",
      "crm",
      "dashboard",
      "e-commerce",
    ],
    locations: [],
    sources: ["freelancer", "hackernews_freelance", "remoteok", "arbeitnow"],
    pitch:
      "We design and build websites, mobile applications and enterprise platforms — CRMs, dashboards and internal tools. Small senior team, based in Egypt, working remotely.",
  },
  {
    name: "Paper factory — Cairo & Giza",
    kind: "clients",
    // Who buys 80gsm engineering plotter rolls: consultancies, contractors,
    // surveyors, and above all the repro shops that print for all of them.
    keywords: [
      "طباعة هندسية",
      "مكتب هندسي",
      "استشارات هندسية",
      "مكتبة هندسية",
      "مقاولات",
      "engineering consultant",
      "architecture",
      "contractor",
      "surveying",
      "reprographics",
      "blueprint",
    ],
    locations: ["Cairo", "Giza", "القاهرة", "الجيزة"],
    // Deliberately empty. Google Places needs a card, and OpenStreetMap returns
    // 6 copy shops across Cairo and Giza combined — measured, not assumed. This
    // list is built by hand via Leads → Import list.
    sources: [],
    pitch:
      "رولات خرائط الرسومات الهندسية 80 جرام مستورد — imported 80gsm engineering drawing paper rolls, supplied across Cairo and Giza. Consistent stock, wholesale pricing, fast delivery.",
  },
  {
    name: "Clothing suppliers",
    kind: "suppliers",
    keywords: [
      "قماش",
      "نسيج",
      "مصنع ملابس",
      "طباعة على الملابس",
      "fabric supplier",
      "textile",
      "garment manufacturer",
      "screen printing",
    ],
    locations: ["Cairo", "Giza", "المحلة الكبرى", "العاشر من رمضان"],
    // Facebook prohibits automated collection and no other source covers this,
    // so it's a manual list by design.
    sources: [],
    pitch:
      "Sourcing fabric, blanks and garment production for a clothing brand. Looking for reliable suppliers with consistent quality and reasonable minimums.",
  },
];

async function main() {
  const userId = process.argv[2];

  if (!userId) {
    console.error("Usage: npm run seed:buckets -- <userId>");
    process.exit(1);
  }

  const { db } = await import("../src/lib/db");
  const { getBuckets, insertBucket } = await import("../src/buckets/buckets.db");

  const existing = await getBuckets(db, userId, true);
  const existingNames = new Set(existing.map((bucket) => bucket.name));

  for (const bucket of STARTER_BUCKETS) {
    if (existingNames.has(bucket.name)) {
      console.log(`skip    ${bucket.name} — already exists`);
      continue;
    }

    // insertBucket takes the stored shape, where an absent pitch is null rather
    // than undefined — the service normalises this for calls coming from the app.
    const created = await insertBucket(db, userId, { ...bucket, pitch: bucket.pitch ?? null });
    console.log(
      created
        ? `created ${bucket.name} (${bucket.kind}, ${bucket.keywords.length} keywords, ${bucket.sources.length} sources)`
        : `skip    ${bucket.name} — name taken`,
    );
  }

  console.log("\nDone. Tune the keywords in the app once you've seen what each returns.");
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
