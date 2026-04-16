/**
 * TeamForge — Sidebar Navigation Component
 */

import Link from "next/link";
import { useRouter } from "next/router";
import { logout, getCurrentUser } from "../lib/auth";
import {
  LayoutDashboard,
  MessageSquare,
  GitCommit,
  Bot,
  LogOut,
  Zap,
  User,
} from "lucide-react";
import clsx from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/chat", label: "Team Chat", icon: MessageSquare },
  { href: "/changelog", label: "Changelog", icon: GitCommit },
  { href: "/ai-review", label: "AI Review", icon: Bot },
];

export default function Sidebar() {
  const router = useRouter();
  const user = getCurrentUser();

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-1 border-r border-white/5 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center animate-glow">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">TeamForge</h1>
            <p className="text-xs text-white/40">Project Manager</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = router.pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group",
                active
                  ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              <Icon
                size={18}
                className={clsx(
                  "transition-colors",
                  active ? "text-brand-400" : "text-white/40 group-hover:text-white/70"
                )}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User info & logout */}
      <div className="p-4 border-t border-white/5">
        <div className="flex items-center gap-3 px-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
            {user?.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.name || "User"}</p>
            <p className="text-xs text-white/40 truncate">{user?.email || ""}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200"
        >
          <LogOut size={16} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
