/**
 * TeamForge — Changelog Page
 *
 * Displays AI-summarised code changes from GitHub and VS Code,
 * filterable by source. Shows expandable raw diffs.
 */

import { useState, useEffect } from "react";
import { GitCommit, Code2, Filter, Loader, RefreshCw } from "lucide-react";
import api from "../lib/api";
import ChangeLogEntry from "../components/ChangeLogEntry";
import toast from "react-hot-toast";
import clsx from "clsx";

const SOURCES = [
  { value: null, label: "All" },
  { value: "github", label: "GitHub", icon: GitCommit },
  { value: "vscode", label: "VS Code", icon: Code2 },
];

export default function ChangelogPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [entries, setEntries] = useState([]);
  const [source, setSource] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    api.get("/projects").then(({ data }) => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
    });
  }, []);

  useEffect(() => {
    if (selectedProject) fetchChangelog();
  }, [selectedProject, source]);

  const fetchChangelog = async (isRefresh = false) => {
    if (!selectedProject) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      const params = source ? `?source=${source}` : "";
      const { data } = await api.get(`/changelog/${selectedProject.id}${params}`);
      setEntries(data);
    } catch {
      toast.error("Failed to load changelog");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Changelog</h1>
          <p className="text-white/40 text-sm mt-1">AI-summarised code changes from GitHub & VS Code</p>
        </div>
        <button
          onClick={() => fetchChangelog(true)}
          disabled={refreshing}
          className="btn-ghost flex items-center gap-2"
          id="refresh-changelog"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      <div className="flex gap-6">
        {/* Filters sidebar */}
        <div className="w-48 flex-shrink-0 space-y-4">
          {/* Project selector */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Project</p>
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-xl text-sm transition-all",
                    selectedProject?.id === p.id
                      ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Source filter */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Filter size={11} />
              Source
            </p>
            <div className="space-y-1">
              {SOURCES.map(({ value, label, icon: Icon }) => (
                <button
                  key={String(value)}
                  onClick={() => setSource(value)}
                  className={clsx(
                    "w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all",
                    source === value
                      ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                      : "text-white/60 hover:text-white hover:bg-white/5"
                  )}
                >
                  {Icon && <Icon size={13} />}
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Entries */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader size={24} className="text-brand-400 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="card flex flex-col items-center justify-center h-64 text-center">
              <GitCommit size={40} className="text-white/20 mb-4" />
              <p className="text-white/40 text-sm">No changelog entries yet</p>
              <p className="text-white/25 text-xs mt-1">
                Set up the GitHub webhook or VS Code extension to see changes here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-xs text-white/40 mb-4">
                {entries.length} entr{entries.length !== 1 ? "ies" : "y"} · sorted newest first
              </p>
              {entries.map((entry) => (
                <ChangeLogEntry key={entry.id} entry={entry} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ChangelogPage.title = "Changelog";
