"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/lib/useSession";
import {
  LayoutGrid,
  AlertTriangle,
  GitPullRequestArrow,
  Server,
  Bell,
  ShieldCheck,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/changes", label: "Changes", icon: GitPullRequestArrow },
  { href: "/assets", label: "Assets · CMDB", icon: Server },
  { href: "/settings/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/audit", label: "Audit log", icon: ShieldCheck, adminOnly: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSession();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="flex min-h-screen">
      <aside className="w-64 shrink-0 border-r border-border bg-surface flex flex-col">
        <div className="px-5 py-5 border-b border-border">
          <div className="font-display text-lg font-semibold tracking-tight">Vantage</div>
          <div className="text-xs text-muted font-mono-tag">ITSM CONSOLE</div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.filter((item) => !item.adminOnly || user?.role === "admin").map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-surface-raised text-text"
                    : "text-muted hover:text-text hover:bg-surface-raised/60"
                }`}
                style={active ? { boxShadow: "inset 2px 0 0 var(--accent)" } : undefined}
              >
                <Icon size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        {user && (
          <div className="px-3 py-4 border-t border-border">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-raised">
              <div
                className="h-7 w-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{user.name}</div>
                <div className="text-xs text-muted font-mono-tag">{user.role}</div>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="text-muted hover:text-text"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        )}
      </aside>
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  );
}
