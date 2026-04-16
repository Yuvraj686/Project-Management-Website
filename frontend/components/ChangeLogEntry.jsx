/**
 * TeamForge — Changelog Entry Component
 *
 * Displays a single changelog entry with:
 * - Source badge (GitHub / VS Code / Manual)
 * - AI-generated summary
 * - Expandable raw diff
 * - Author and timestamp
 */

import { useState } from "react";
import { format } from "date-fns";
import { GitCommit, Code2, ChevronDown, ChevronUp, User } from "lucide-react";
import clsx from "clsx";

const SOURCE_CONFIG = {
  github: {
    label: "GitHub",
    icon: GitCommit,
    badge: "bg-accent-purple/15 text-accent-purple border-accent-purple/25",
    dot: "bg-accent-purple",
  },
  vscode: {
    label: "VS Code",
    icon: Code2,
    badge: "bg-accent-cyan/15 text-accent-cyan border-accent-cyan/25",
    dot: "bg-accent-cyan",
  },
  manual: {
    label: "Manual",
    icon: User,
    badge: "bg-white/10 text-white/60 border-white/15",
    dot: "bg-white/40",
  },
};

export default function ChangeLogEntry({ entry }) {
  const [expanded, setExpanded] = useState(false);
  const config = SOURCE_CONFIG[entry.source] || SOURCE_CONFIG.manual;
  const Icon = config.icon;

  return (
    <div className="bg-surface-2 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all duration-200 animate-fade-in">
      {/* Header */}
      <div className="flex items-start gap-4">
        {/* Timeline dot */}
        <div className="flex flex-col items-center pt-1 flex-shrink-0">
          <div className={clsx("w-2.5 h-2.5 rounded-full", config.dot)} />
          <div className="w-px flex-1 bg-white/5 mt-2 min-h-[20px]" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span
              className={clsx(
                "flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border",
                config.badge
              )}
            >
              <Icon size={11} />
              {config.label}
            </span>

            {entry.author && (
              <span className="text-xs text-white/40 flex items-center gap-1">
                <User size={11} />
                {entry.author}
              </span>
            )}

            {entry.commit_sha && (
              <span className="text-xs text-white/30 font-mono">#{entry.commit_sha}</span>
            )}

            {entry.file_path && (
              <span className="text-xs text-white/30 font-mono truncate max-w-[200px]">
                {entry.file_path}
              </span>
            )}

            <span className="text-xs text-white/30 ml-auto">
              {format(new Date(entry.created_at), "MMM d, yyyy · HH:mm")}
            </span>
          </div>

          {/* AI Summary */}
          <p className="text-sm text-white/80 leading-relaxed">{entry.summary}</p>

          {/* Expand raw diff */}
          {entry.raw_diff && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1.5 text-xs text-white/40 hover:text-white/70 mt-3 transition-colors"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {expanded ? "Hide diff" : "View raw diff"}
            </button>
          )}

          {expanded && entry.raw_diff && (
            <pre className="mt-3 p-4 bg-surface-0 border border-white/5 rounded-xl text-xs font-mono text-white/60 overflow-x-auto whitespace-pre-wrap leading-relaxed animate-slide-up">
              {entry.raw_diff}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
