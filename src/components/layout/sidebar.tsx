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
  Building2,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSession, signOut } from "@/lib/auth-client";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/criteria", label: "Criteria", icon: Settings },
  { href: "/companies", label: "Companies", icon: Building2 },
  { href: "/jobs", label: "Jobs", icon: Briefcase },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/tracker", label: "Tracker", icon: KanbanSquare },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();

  const user = session?.user;
  const initials = user?.name
    ? user.name.split(" ").map((namePart) => namePart[0]).join("").slice(0, 2).toUpperCase()
    : "?";

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Dimmed backdrop, mobile only — tapping it closes the drawer. */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
          aria-hidden
        />
      )}

      <aside
        // Announced as a dialog only while it's a drawer. From md up it's a
        // permanent column and calling it a dialog would be a lie.
        {...(isOpen ? { role: "dialog", "aria-modal": true, "aria-label": "Main menu" } : {})}
        className={cn(
          "w-56 shrink-0 border-r border-sky-100/90 dark:border-sky-900/40 bg-card/85 backdrop-blur-xl flex flex-col h-dvh",
          // Off-canvas below md, a normal column from md up.
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-sky-100/80 dark:border-sky-900/40 flex items-center gap-2.5">
          <div className="rounded-lg bg-gradient-to-br from-sky-500 to-cyan-600 p-1.5 shadow-[0_0_12px_rgba(14,165,233,0.35)] shrink-0">
            <BrainCircuit className="h-4 w-4 text-white" />
          </div>
          <span className="console-mono text-xs font-bold uppercase tracking-[0.18em] text-slate-900 dark:text-slate-100 truncate">
            Einherji
          </span>
          <span className="relative flex h-1.5 w-1.5 ml-auto">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-sky-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-sky-500" />
          </span>
          <button
            onClick={onClose}
            className="ml-2 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-sky-50 dark:hover:bg-sky-950/50 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 px-2.5 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarLink key={item.href} {...item} pathname={pathname} onNavigate={onClose} />
          ))}
        </nav>

        <div className="px-2.5 pb-2">
          <SidebarLink
            href="/settings"
            label="Settings"
            icon={Settings}
            pathname={pathname}
            onNavigate={onClose}
          />
        </div>

        {/* User profile */}
        <div className="px-3 py-3 border-t border-sky-100/80 dark:border-sky-900/40 bg-sky-50/40 dark:bg-sky-950/20">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-sky-500/20 to-cyan-500/20 border border-sky-200/80 dark:border-sky-800/80 flex items-center justify-center shrink-0 shadow-2xs">
              <span className="console-mono text-xs font-semibold text-sky-700 dark:text-sky-300">{initials}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate text-slate-900 dark:text-slate-100">{user?.name ?? "—"}</p>
              <p className="text-[11px] text-muted-foreground truncate">{user?.email ?? ""}</p>
            </div>
            <button
              onClick={handleSignOut}
              className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-sky-100/60 dark:hover:bg-sky-900/40 hover:text-sky-700 dark:hover:text-sky-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

interface SidebarLinkProps {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pathname: string;
  onNavigate: () => void;
}

/**
 * One nav row. Extracted because Settings is pinned to the bottom rather than
 * sitting in the list, and the two copies of this markup had already diverged.
 */
function SidebarLink({ href, label, icon: Icon, pathname, onNavigate }: SidebarLinkProps) {
  // Prefix match, so a detail route under a section keeps its parent lit. Exact
  // match meant /jobs/some-id highlighted nothing at all.
  const isActive =
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === "/dashboard" && pathname === "/");

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive
          ? "bg-sky-50/90 text-sky-700 dark:bg-sky-950/70 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 shadow-[inset_3px_0_0_#0ea5e9,0_1px_4px_rgba(14,165,233,0.06)] font-semibold"
          : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-sky-50/50 dark:hover:bg-sky-950/30",
      )}
    >
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive
            ? "text-sky-600 dark:text-sky-400 drop-shadow-[0_0_6px_rgba(56,189,248,0.4)]"
            : "text-slate-400 dark:text-slate-500",
        )}
      />
      {label}
    </Link>
  );
}
