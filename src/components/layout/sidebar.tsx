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
          "w-56 shrink-0 border-r border-border bg-card flex flex-col h-dvh",
          // Off-canvas below md, a normal column from md up.
          "fixed inset-y-0 left-0 z-50 transition-transform duration-200 md:static md:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo */}
        <div className="px-4 py-5 border-b border-border flex items-center gap-2">
          <div className="rounded-md bg-primary/10 p-1 shrink-0">
            <BrainCircuit className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold tracking-tight truncate">AI Job Hunter</span>
          <button
            onClick={onClose}
            className="ml-auto shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:hidden"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav aria-label="Main" className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarLink key={item.href} {...item} pathname={pathname} onNavigate={onClose} />
          ))}
        </nav>

        <div className="px-2 pb-2">
          <SidebarLink
            href="/settings"
            label="Settings"
            icon={Settings}
            pathname={pathname}
            onNavigate={onClose}
          />
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
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
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
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        isActive
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {label}
    </Link>
  );
}
