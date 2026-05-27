import { BrainCircuit, CheckCircle2 } from "lucide-react";
import RegisterForm from "@/components/auth/register-form";

const FEATURES = [
  "Scrape LinkedIn jobs daily on autopilot",
  "Identify hiring managers automatically",
  "AI-crafted, personalised outreach messages",
  "Track every application in one place",
];

export default function RegisterPage() {
  return (
    <div className="min-h-screen grid lg:grid-cols-[1fr_1fr]">
      {/* ── Left branding panel ── */}
      <div className="hidden lg:flex flex-col justify-between bg-[#080808] p-12 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div className="relative flex items-center gap-2">
          <div className="rounded-lg bg-emerald-500/20 p-1.5">
            <BrainCircuit className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-white font-semibold">AI Job Hunter</span>
        </div>

        <div className="relative space-y-8">
          <div className="space-y-3">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Land your next role<br />faster with AI
            </h1>
            <p className="text-slate-400 text-lg leading-relaxed max-w-sm">
              Join and let AI handle the prospecting, outreach, and follow-ups so you can focus on interviews.
            </p>
          </div>

          <ul className="space-y-3">
            {FEATURES.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-sm">{feature}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-slate-600 text-xs">Powered by Claude AI</p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex flex-col items-center justify-center p-8 bg-background">
        <div className="flex items-center gap-2 mb-8 lg:hidden">
          <div className="rounded-lg bg-primary/10 p-1.5">
            <BrainCircuit className="h-5 w-5 text-primary" />
          </div>
          <span className="font-semibold">AI Job Hunter</span>
        </div>
        <RegisterForm />
      </div>
    </div>
  );
}
