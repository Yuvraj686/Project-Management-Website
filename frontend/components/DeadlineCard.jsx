/**
 * TeamForge — Deadline Card Component
 *
 * Displays a project's deadline, completion percentage, and risk level
 * with a progress bar and colour-coded status indicator.
 */

import { formatDistanceToNow, differenceInDays, isPast } from "date-fns";
import { Calendar, AlertTriangle, CheckCircle, Clock } from "lucide-react";
import clsx from "clsx";

function getRiskLevel(daysLeft, pct) {
  if (isPast(new Date()) || daysLeft < 0) return "overdue";
  if (daysLeft <= 2) return "critical";
  if (daysLeft <= 7 && pct < 50) return "high";
  if (daysLeft <= 14 && pct < 30) return "high";
  if (daysLeft <= 7) return "medium";
  return "low";
}

const RISK_CONFIG = {
  overdue: {
    label: "Overdue",
    bar: "bg-accent-red",
    badge: "bg-accent-red/20 text-accent-red border-accent-red/30",
    icon: AlertTriangle,
    border: "border-accent-red/20",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
  },
  critical: {
    label: "Critical",
    bar: "bg-accent-red",
    badge: "bg-accent-red/20 text-accent-red border-accent-red/30",
    icon: AlertTriangle,
    border: "border-accent-red/20",
    glow: "shadow-[0_0_20px_rgba(239,68,68,0.1)]",
  },
  high: {
    label: "At Risk",
    bar: "bg-accent-amber",
    badge: "bg-accent-amber/20 text-accent-amber border-accent-amber/30",
    icon: AlertTriangle,
    border: "border-accent-amber/20",
    glow: "shadow-[0_0_20px_rgba(245,158,11,0.1)]",
  },
  medium: {
    label: "Watch",
    bar: "bg-brand-500",
    badge: "bg-brand-500/20 text-brand-400 border-brand-500/30",
    icon: Clock,
    border: "border-brand-500/20",
    glow: "",
  },
  low: {
    label: "On Track",
    bar: "bg-accent-green",
    badge: "bg-accent-green/20 text-accent-green border-accent-green/30",
    icon: CheckCircle,
    border: "border-accent-green/20",
    glow: "",
  },
};

export default function DeadlineCard({ project, onViewWarning }) {
  const deadline = project.deadline ? new Date(project.deadline) : null;
  const daysLeft = deadline ? differenceInDays(deadline, new Date()) : null;
  const risk = getRiskLevel(daysLeft, project.completion_pct);
  const config = RISK_CONFIG[risk];
  const Icon = config.icon;

  return (
    <div
      className={clsx(
        "bg-surface-2 rounded-2xl p-5 border transition-all duration-300 hover:bg-surface-3 cursor-pointer group",
        config.border,
        config.glow
      )}
      onClick={() => onViewWarning && onViewWarning(project)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate group-hover:text-brand-400 transition-colors">
            {project.name}
          </h3>
          {project.stack && (
            <p className="text-xs text-white/40 mt-0.5 truncate">{project.stack}</p>
          )}
        </div>
        <span
          className={clsx(
            "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border ml-2 flex-shrink-0",
            config.badge
          )}
        >
          <Icon size={12} />
          {config.label}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-white/50 mb-1.5">
          <span>Completion</span>
          <span className="font-medium text-white">{project.completion_pct?.toFixed(0)}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className={clsx("h-full rounded-full transition-all duration-700", config.bar)}
            style={{ width: `${Math.min(100, project.completion_pct || 0)}%` }}
          />
        </div>
      </div>

      {/* Deadline */}
      <div className="flex items-center gap-2 text-xs text-white/50">
        <Calendar size={13} />
        {deadline ? (
          <span>
            {isPast(deadline)
              ? `Overdue by ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""}`
              : `${daysLeft} day${daysLeft !== 1 ? "s" : ""} left — ${formatDistanceToNow(deadline, { addSuffix: true })}`}
          </span>
        ) : (
          <span>No deadline set</span>
        )}
      </div>
    </div>
  );
}
