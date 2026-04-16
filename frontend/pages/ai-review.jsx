/**
 * TeamForge — AI Review Page
 *
 * Full-page AI project reviewer with:
 * - Project selector
 * - Deadline warning generator
 * - Full project review (code quality, gaps, UX, competitive analysis)
 * - Rendered markdown output
 */

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, Zap, AlertTriangle, Loader, ChevronDown } from "lucide-react";
import api from "../lib/api";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function AIReviewPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [reviewText, setReviewText] = useState("");
  const [warningText, setWarningText] = useState("");
  const [daysRemaining, setDaysRemaining] = useState(null);
  const [loadingReview, setLoadingReview] = useState(false);
  const [loadingWarning, setLoadingWarning] = useState(false);

  useEffect(() => {
    api.get("/projects").then(({ data }) => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
    });
  }, []);

  const runReview = async () => {
    if (!selectedProject) return;
    setLoadingReview(true);
    setReviewText("");
    try {
      const { data } = await api.post("/ai/review", { project_id: selectedProject.id });
      setReviewText(data.review);
    } catch (err) {
      toast.error("AI review failed. Check your API key.");
    } finally {
      setLoadingReview(false);
    }
  };

  const runDeadlineWarning = async () => {
    if (!selectedProject) return;
    setLoadingWarning(true);
    setWarningText("");
    try {
      const { data } = await api.post("/ai/deadline-warning", { project_id: selectedProject.id });
      setWarningText(data.warning);
      setDaysRemaining(data.days_remaining);
    } catch (err) {
      toast.error("Deadline warning failed. Check your API key.");
    } finally {
      setLoadingWarning(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-600 to-accent-purple flex items-center justify-center">
            <Bot size={20} className="text-white" />
          </div>
          AI Review Suite
        </h1>
        <p className="text-white/40 text-sm mt-2 ml-13">
          Gemini-powered project analysis, deadline warnings, and architectural insights
        </p>
      </div>

      {/* Project Selector */}
      <div className="card mb-6">
        <label className="text-xs font-semibold text-white/40 uppercase tracking-wider block mb-3">
          Select Project
        </label>
        <div className="relative">
          <select
            value={selectedProject?.id || ""}
            onChange={(e) => setSelectedProject(projects.find((p) => p.id === Number(e.target.value)))}
            className="input-field appearance-none pr-10 cursor-pointer"
            id="ai-project-select"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id} className="bg-surface-2">
                {p.name} — {p.completion_pct?.toFixed(0)}% complete
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" />
        </div>

        {selectedProject && (
          <div className="flex flex-wrap gap-4 mt-4 text-sm text-white/60">
            <span>📅 Deadline: {selectedProject.deadline ? new Date(selectedProject.deadline).toLocaleDateString() : "Not set"}</span>
            <span>📊 Completion: {selectedProject.completion_pct?.toFixed(0)}%</span>
            {selectedProject.stack && <span>🛠 Stack: {selectedProject.stack}</span>}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Deadline Warning Card */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-accent-amber/15 flex items-center justify-center">
              <AlertTriangle size={18} className="text-accent-amber" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Deadline Warning</h3>
              <p className="text-xs text-white/40">Sprint risk analysis & plan</p>
            </div>
          </div>
          <button
            onClick={runDeadlineWarning}
            disabled={loadingWarning || !selectedProject}
            className="w-full btn-primary flex items-center justify-center gap-2 mb-4"
            id="run-deadline-warning"
          >
            {loadingWarning ? <Loader size={16} className="animate-spin" /> : <AlertTriangle size={16} />}
            Generate Warning
          </button>

          {warningText && (
            <div className="bg-accent-amber/5 border border-accent-amber/20 rounded-xl p-4 text-sm text-white/80 leading-relaxed">
              {daysRemaining !== null && (
                <p className="text-xs text-accent-amber font-medium mb-2">
                  ⏱ {daysRemaining.toFixed(1)} days remaining
                </p>
              )}
              <p className="whitespace-pre-wrap">{warningText}</p>
            </div>
          )}
        </div>

        {/* Run Review */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-brand-500/15 flex items-center justify-center">
              <Bot size={18} className="text-brand-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Project Review</h3>
              <p className="text-xs text-white/40">Architecture, gaps & competitive analysis</p>
            </div>
          </div>
          <button
            onClick={runReview}
            disabled={loadingReview || !selectedProject}
            className="w-full btn-primary flex items-center justify-center gap-2"
            id="run-ai-review"
          >
            {loadingReview ? <Loader size={16} className="animate-spin" /> : <Zap size={16} />}
            Run Full Review
          </button>

          <p className="text-xs text-white/30 mt-3 text-center">
            Covers architecture · gaps · UX · competitors
          </p>
        </div>
      </div>

      {/* Review Output */}
      {(loadingReview || reviewText) && (
        <div className="card">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
            Review Output
          </h3>
          {loadingReview ? (
            <div className="flex items-center gap-3 py-8 justify-center">
              <Loader size={20} className="text-brand-400 animate-spin" />
              <span className="text-white/50 text-sm">Gemini is reviewing your project…</span>
            </div>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none animate-fade-in">
              <ReactMarkdown>{reviewText}</ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

AIReviewPage.title = "AI Review";
