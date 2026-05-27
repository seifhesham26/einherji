"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Settings,
  Briefcase,
  Users,
  MessageSquare,
  KanbanSquare,
  BrainCircuit,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/criteria", label: "Criteria", icon: Settings },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border bg-card flex flex-col h-screen sticky top-0">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border flex items-center gap-2">
        <div className="rounded-md bg-primary/10 p-1 shrink-0">
          <BrainCircuit className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight truncate">AI Job Hunter</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
              pathname === href || (href === "/dashboard" && pathname === "/")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>

      {/* Settings link */}
      <div className="px-2 pb-2">
        <Link
          href="/settings"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
            pathname === "/settings"
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
          )}
        >
          <Settings className="h-4 w-4 shrink-0" />
          Settings
        </Link>
      </div>

      {/* User profile */}
      <div className="px-3 py-3 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-xs font-semibold text-primary">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{user?.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground truncate">{user?.email ?? ""}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
            title="Sign out"
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
