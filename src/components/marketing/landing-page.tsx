"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  BrainCircuit, ArrowRight, Sparkles, Users, MessageSquare,
  KanbanSquare, Briefcase, Zap, Target, Search, CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold },
    );
    const el = ref.current;
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [threshold]);

  return { ref, inView };
}

function useCounter(target: number, active: boolean, duration = 1800) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!active) return;
    let start: number | null = null;
    const step = (timestamp: number) => {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [active, target, duration]);
  return count;
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 32);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-500",
        scrolled
          ? "bg-black/70 backdrop-blur-xl border-b border-white/8 py-3"
          : "bg-transparent py-5",
      )}
    >
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="rounded-lg bg-emerald-500/20 p-1.5 group-hover:bg-emerald-500/30 transition-colors">
            <BrainCircuit className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-white font-semibold text-sm">AI Job Hunter</span>
        </Link>

        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-sm font-medium text-white bg-white/10 hover:bg-white/15 rounded-lg px-4 py-2 transition-colors"
            >
              Dashboard <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors px-3 py-2"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium text-black bg-white hover:bg-gray-100 rounded-lg px-4 py-2 transition-colors"
              >
                Get started free
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  const { data: session } = useSession();

  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-[#030303]">
      {/* Background layers */}
      <div className="absolute inset-0">
        {/* Grid */}
        <div
          className="absolute inset-0 opacity-100"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.03) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full bg-emerald-500/10 blur-[140px] pointer-events-none" />
        <div
          className="absolute top-1/3 left-1/5 w-[500px] h-[500px] rounded-full bg-blue-500/8 blur-[120px] pointer-events-none animate-float-slow"
        />
        <div
          className="absolute bottom-1/4 right-1/5 w-[400px] h-[400px] rounded-full bg-violet-500/8 blur-[100px] pointer-events-none"
          style={{ animation: "float-slow 14s ease-in-out infinite reverse" }}
        />
        {/* Vignette */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#030303]" />
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto px-6 pt-24">
        {/* Badge */}
        <div
          className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-400 mb-8 animate-fade-up"
          style={{ animationDelay: "0ms" }}
        >
          <Sparkles className="h-3 w-3" />
          Powered by Claude AI
        </div>

        {/* Headline */}
        <h1
          className="text-6xl md:text-7xl lg:text-8xl font-black text-white leading-[1.05] tracking-tight mb-6 animate-fade-up"
          style={{ animationDelay: "80ms" }}
        >
          Your personal<br />
          <span
            className="bg-gradient-to-r from-emerald-400 via-blue-400 to-violet-400 bg-clip-text text-transparent animate-gradient-x"
          >
            job hunting AI
          </span>
        </h1>

        {/* Sub */}
        <p
          className="text-xl text-gray-400 max-w-xl mx-auto leading-relaxed mb-10 animate-fade-up"
          style={{ animationDelay: "160ms" }}
        >
          Stop applying to hundreds of jobs manually. Let AI handle the scraping,
          hiring manager research, and personalised outreach — on autopilot.
        </p>

        {/* CTAs */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16 animate-fade-up"
          style={{ animationDelay: "240ms" }}
        >
          <Link
            href={session ? "/dashboard" : "/register"}
            className="group relative overflow-hidden flex items-center gap-2 bg-white text-black font-semibold px-7 py-3.5 rounded-xl text-sm hover:bg-gray-100 transition-colors shadow-lg shadow-white/10"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out pointer-events-none" />
            <Sparkles className="h-4 w-4" />
            {session ? "Go to Dashboard" : "Start for free"}
            <ArrowRight className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
          <a
            href="#how-it-works"
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors px-4 py-3.5"
          >
            See how it works <ChevronDown className="h-4 w-4" />
          </a>
        </div>

        {/* Floating UI cards */}
        <div
          className="relative mx-auto max-w-3xl h-[320px] animate-fade-up"
          style={{ animationDelay: "360ms" }}
        >
          {/* Main card */}
          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-72 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-5 shadow-2xl animate-float">
            <p className="text-xs text-emerald-400 font-semibold mb-3 uppercase tracking-wide">Today's Scrape</p>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-4xl font-black text-white">24</p>
                <p className="text-sm text-gray-400 mt-0.5">new matching jobs</p>
              </div>
              <div className="rounded-full bg-emerald-500/20 p-3">
                <Briefcase className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {["React", "TypeScript", "Node.js"].map((tag) => (
                <span key={tag} className="text-xs bg-white/10 text-gray-300 rounded-full px-2.5 py-1">
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Message card — left */}
          <div
            className="absolute left-0 top-12 w-64 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-xl hidden md:block"
            style={{ animation: "float 9s ease-in-out infinite reverse" }}
          >
            <div className="flex items-center gap-2.5 mb-3">
              <div className="h-8 w-8 rounded-full bg-violet-500/30 flex items-center justify-center shrink-0">
                <span className="text-xs font-bold text-violet-300">SC</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-none">Sarah Chen</p>
                <p className="text-xs text-gray-500 mt-0.5">Head of Eng · Stripe</p>
              </div>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed">
              "Hi Sarah, I noticed your team is building out the infrastructure…"
            </p>
            <div className="mt-3 flex gap-1.5">
              <span className="text-xs bg-emerald-500/20 text-emerald-400 rounded-full px-2.5 py-1 font-medium">
                ✓ Approve
              </span>
              <span className="text-xs bg-white/8 text-gray-400 rounded-full px-2.5 py-1">
                Edit
              </span>
            </div>
          </div>

          {/* Pipeline card — right */}
          <div
            className="absolute right-0 top-8 w-56 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-xl hidden md:block"
            style={{ animation: "float 11s ease-in-out infinite 2s" }}
          >
            <p className="text-xs text-gray-500 font-medium mb-2.5">Pipeline</p>
            {[
              { label: "Not contacted", count: 12, color: "bg-gray-600" },
              { label: "Message sent", count: 8, color: "bg-blue-500" },
              { label: "Reply received", count: 3, color: "bg-yellow-500" },
              { label: "Interview", count: 1, color: "bg-violet-500" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2 mb-1.5">
                <div className={cn("h-1.5 w-1.5 rounded-full shrink-0", row.color)} />
                <span className="text-xs text-gray-400 flex-1 truncate">{row.label}</span>
                <span className="text-xs font-semibold text-white tabular-nums">{row.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-gray-600 animate-[pulse-slow_2s_ease-in-out_infinite]">
        <ChevronDown className="h-5 w-5" />
      </div>
    </section>
  );
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

const MARQUEE_ITEMS = [
  { icon: Search, text: "LinkedIn scraping" },
  { icon: Target, text: "Hiring manager research" },
  { icon: Sparkles, text: "AI-crafted messages" },
  { icon: CheckCircle2, text: "One-click approval" },
  { icon: KanbanSquare, text: "Pipeline tracking" },
  { icon: Zap, text: "Daily automation" },
  { icon: Users, text: "Contact discovery" },
  { icon: MessageSquare, text: "Personalised outreach" },
];

function Marquee() {
  const doubled = [...MARQUEE_ITEMS, ...MARQUEE_ITEMS];

  return (
    <div className="bg-[#070707] border-y border-white/5 py-4 overflow-hidden">
      <div className="flex animate-marquee whitespace-nowrap w-max">
        {doubled.map((item, i) => {
          const Icon = item.icon;
          return (
            <div key={i} className="flex items-center gap-2.5 mx-8 text-gray-500">
              <Icon className="h-3.5 w-3.5 text-gray-600 shrink-0" />
              <span className="text-sm font-medium">{item.text}</span>
              <span className="ml-6 text-gray-700">·</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────

interface StepProps {
  number: string;
  title: string;
  description: string;
  icon: React.ElementType;
  fillClass: string;
  delay?: number;
}

function Step({ number, title, description, icon: Icon, fillClass, delay = 0 }: StepProps) {
  const { ref, inView } = useInView(0.25);

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/8 p-8 transition-all duration-700",
        inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6",
      )}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {/* Fill background — scales from bottom to top */}
      <div
        className={cn(
          "absolute inset-0 transition-transform ease-out pointer-events-none",
          fillClass,
          inView ? "scale-y-100" : "scale-y-0",
        )}
        style={{ transformOrigin: "bottom", transitionDuration: "1.2s", transitionDelay: `${delay + 100}ms` }}
      />

      {/* Content */}
      <div className="relative z-10">
        <span className="block text-7xl font-black text-white/8 leading-none mb-4 select-none">
          {number}
        </span>
        <div className="inline-flex rounded-xl bg-white/10 p-2.5 mb-4">
          <Icon className="h-5 w-5 text-white" />
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

const STEPS: StepProps[] = [
  {
    number: "01",
    title: "Set your criteria",
    description: "Tell AI your target roles, locations, salary range, and preferred company sizes. Upload your CV and it extracts your skills automatically.",
    icon: Target,
    fillClass: "bg-emerald-500/12",
  },
  {
    number: "02",
    title: "AI scrapes jobs daily",
    description: "Every day, the AI scans LinkedIn and pulls matching job postings — no manual searching needed. Just wake up to fresh opportunities.",
    icon: Search,
    fillClass: "bg-blue-500/12",
  },
  {
    number: "03",
    title: "Find hiring managers",
    description: "For each job, AI identifies the right person to contact — engineering managers, VPs, department heads — not just the recruiter.",
    icon: Users,
    fillClass: "bg-violet-500/12",
  },
  {
    number: "04",
    title: "Approve and send",
    description: "AI writes a personalised message for each contact referencing their background and your experience. You review, edit, and approve with one click.",
    icon: MessageSquare,
    fillClass: "bg-amber-500/12",
  },
];

function HowItWorks() {
  const { ref, inView } = useInView(0.1);

  return (
    <section id="how-it-works" className="py-32 bg-[#060606]">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div
          ref={ref}
          className={cn(
            "text-center mb-16 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <p className="text-xs font-semibold text-emerald-400 uppercase tracking-widest mb-3">How it works</p>
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            From criteria to inbox
          </h2>
          <p className="text-gray-400 mt-3 max-w-md mx-auto">
            Four steps from setup to receiving interview replies.
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {STEPS.map((step, i) => (
            <Step key={step.number} {...step} delay={i * 80} />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features (horizontal scroll) ────────────────────────────────────────────

interface Feature {
  icon: React.ElementType;
  color: string;
  title: string;
  description: string;
}

const FEATURES: Feature[] = [
  {
    icon: Search,
    color: "text-blue-400 bg-blue-500/15",
    title: "Daily LinkedIn scraping",
    description: "Automatically pulls 100+ matching jobs every day using your exact criteria — titles, locations, company sizes, industries.",
  },
  {
    icon: Users,
    color: "text-violet-400 bg-violet-500/15",
    title: "Hiring manager discovery",
    description: "For each job, AI finds the engineering manager or department head — the person who actually makes hiring decisions.",
  },
  {
    icon: Sparkles,
    color: "text-emerald-400 bg-emerald-500/15",
    title: "AI-crafted messages",
    description: "Each outreach is personalised to the specific role and person. References their background, your skills, and mutual interests.",
  },
  {
    icon: CheckCircle2,
    color: "text-amber-400 bg-amber-500/15",
    title: "One-click approval",
    description: "Review and approve a full day's outreach in minutes. Edit inline if needed. Approve with a single click when it's right.",
  },
  {
    icon: KanbanSquare,
    color: "text-rose-400 bg-rose-500/15",
    title: "Pipeline tracker",
    description: "Drag-and-drop kanban tracks every contact through 8 stages — from first message to offer received.",
  },
  {
    icon: Zap,
    color: "text-orange-400 bg-orange-500/15",
    title: "CV parsing",
    description: "Upload your PDF CV and AI extracts your skills, experience, and suggests job titles — seeding all your preferences automatically.",
  },
];

function FeaturesSection() {
  const { ref, inView } = useInView(0.1);

  return (
    <section className="py-32 bg-[#040404] overflow-hidden">
      <div className="max-w-6xl mx-auto px-6">
        {/* Header */}
        <div
          ref={ref}
          className={cn(
            "mb-10 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <p className="text-xs font-semibold text-blue-400 uppercase tracking-widest mb-3">Features</p>
          <div className="flex items-end justify-between gap-4 flex-wrap">
            <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight max-w-sm">
              Everything you need
            </h2>
            <p className="text-gray-400 max-w-xs text-sm">
              Scroll to see all the tools that make up your automated job hunt. →
            </p>
          </div>
        </div>

        {/* Horizontal scroll cards */}
        <div className="overflow-x-auto scrollbar-none -mx-6 px-6">
          <div className="flex gap-4 w-max pb-4">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <div
                  key={i}
                  className={cn(
                    "w-[280px] shrink-0 rounded-2xl border border-white/8 bg-white/3 p-6 hover:border-white/15 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/50 group",
                    inView ? "animate-fade-up" : "opacity-0",
                  )}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  <div className={cn("inline-flex rounded-xl p-3 mb-5", feature.color.split(" ")[1])}>
                    <Icon className={cn("h-5 w-5", feature.color.split(" ")[0])} />
                  </div>
                  <h3 className="text-base font-semibold text-white mb-2 group-hover:text-white/90">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-gray-500 leading-relaxed group-hover:text-gray-400 transition-colors">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatCard({ value, suffix, label }: { value: number; suffix: string; label: string }) {
  const { ref, inView } = useInView(0.5);
  const count = useCounter(value, inView);

  return (
    <div ref={ref} className="text-center">
      <p className="text-5xl md:text-6xl font-black text-white tabular-nums leading-none">
        {count}
        <span className="text-emerald-400">{suffix}</span>
      </p>
      <p className="text-gray-500 text-sm mt-3 leading-snug max-w-[140px] mx-auto">{label}</p>
    </div>
  );
}

function StatsSection() {
  const { ref, inView } = useInView(0.2);

  return (
    <section className="py-28 bg-[#060606] border-y border-white/5 relative overflow-hidden">
      {/* Subtle bg glow */}
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-blue-500/5 pointer-events-none" />

      <div className="relative max-w-5xl mx-auto px-6">
        <div
          ref={ref}
          className={cn(
            "text-center mb-16 transition-all duration-700",
            inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8",
          )}
        >
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight">
            Numbers that matter
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <StatCard value={100} suffix="+" label="Jobs scraped per daily run" />
          <StatCard value={5} suffix="min" label="From setup to first message draft" />
          <StatCard value={8} suffix="" label="Pipeline stages tracked" />
          <StatCard value={24} suffix="/7" label="Automated — always running" />
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CtaSection() {
  const { ref, inView } = useInView(0.2);
  const { data: session } = useSession();

  return (
    <section className="py-36 bg-[#030303] relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[#030303]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] rounded-full bg-emerald-500/12 blur-[120px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[200px] rounded-full bg-blue-500/8 blur-[80px] pointer-events-none" />
      </div>

      <div
        ref={ref}
        className={cn(
          "relative z-10 max-w-2xl mx-auto px-6 text-center transition-all duration-700",
          inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10",
        )}
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-xs text-emerald-400 mb-8">
          <Zap className="h-3 w-3" />
          Get started in 2 minutes
        </div>

        <h2 className="text-5xl md:text-6xl font-black text-white tracking-tight leading-tight mb-6">
          Stop applying.<br />
          <span className="bg-gradient-to-r from-emerald-400 to-blue-400 bg-clip-text text-transparent">
            Start automating.
          </span>
        </h2>

        <p className="text-gray-400 text-lg mb-10 max-w-md mx-auto leading-relaxed">
          Set your criteria once. AI handles the rest — every single day.
        </p>

        <Link
          href={session ? "/dashboard" : "/register"}
          className="group relative inline-flex items-center gap-2.5 bg-white text-black font-bold px-8 py-4 rounded-2xl text-base hover:bg-gray-100 transition-all shadow-2xl shadow-white/10 hover:shadow-white/20 hover:-translate-y-0.5"
        >
          {/* Shimmer */}
          <span className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
            <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out" />
          </span>
          <Sparkles className="h-5 w-5" />
          {session ? "Open Dashboard" : "Create your free account"}
          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
        </Link>

        <p className="text-gray-600 text-xs mt-5">No credit card required. Free to start.</p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-[#030303] py-10">
      <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="rounded-md bg-emerald-500/20 p-1">
            <BrainCircuit className="h-4 w-4 text-emerald-400" />
          </div>
          <span className="text-sm font-semibold text-white">AI Job Hunter</span>
        </div>
        <p className="text-xs text-gray-600">Built with Claude AI · Einherji</p>
      </div>
    </footer>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="bg-[#030303] min-h-screen">
      <Nav />
      <Hero />
      <Marquee />
      <HowItWorks />
      <FeaturesSection />
      <StatsSection />
      <CtaSection />
      <Footer />
    </div>
  );
}
