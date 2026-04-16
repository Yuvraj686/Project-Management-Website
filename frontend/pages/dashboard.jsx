/**
 * TeamForge — Dashboard Page
 *
 * Shows:
 * - Project overview cards
 * - At-risk deadlines
 * - New project creation modal
 * - File upload panel
 * - Floating AI chatbot
 */

import { useState, useEffect } from "react";
import { Plus, FolderOpen, Loader, X, Calendar } from "lucide-react";
import api from "../lib/api";
import DeadlineCard from "../components/DeadlineCard";
import FileUpload from "../components/FileUpload";
import AIChatBot from "../components/AIChatBot";
import toast from "react-hot-toast";
import { getCurrentUser } from "../lib/auth";

export default function DashboardPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewProject, setShowNewProject] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", stack: "", deadline: "" });
  const [creating, setCreating] = useState(false);
  const [inviteUserId, setInviteUserId] = useState("");
  const [inviteRole, setInviteRole] = useState("dev");
  const [inviting, setInviting] = useState(false);
  const user = getCurrentUser();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data } = await api.get("/projects");
      setProjects(data);
      if (data.length > 0 && !selectedProject) setSelectedProject(data[0]);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const { data } = await api.post("/projects", {
        ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      setProjects((prev) => [data, ...prev]);
      setSelectedProject(data);
      setShowNewProject(false);
      setForm({ name: "", description: "", stack: "", deadline: "" });
      toast.success("Project created!");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create project");
    } finally {
      setCreating(false);
    }
  };

  const inviteMember = async (e) => {
    e.preventDefault();
    if (!inviteUserId) return;
    setInviting(true);
    try {
      await api.post(`/projects/${selectedProject.id}/members`, {
        user_id: parseInt(inviteUserId),
        role: inviteRole,
      });
      toast.success("Member invited successfully!");
      setInviteUserId("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to invite member");
    } finally {
      setInviting(false);
    }
  };

  const atRiskProjects = projects.filter((p) => {
    if (!p.deadline) return false;
    const days = (new Date(p.deadline) - new Date()) / 86400000;
    return days <= 7 && days >= 0;
  });

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.name?.split(" ")[0] || "there"} 👋
          </h1>
          <p className="text-white/40 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? "s" : ""} · {atRiskProjects.length} at risk
          </p>
        </div>
        <button
          onClick={() => setShowNewProject(true)}
          className="btn-primary flex items-center gap-2"
          id="new-project-btn"
        >
          <Plus size={16} />
          New Project
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader size={24} className="text-brand-400 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <FolderOpen size={48} className="text-white/20 mb-4" />
          <h3 className="text-lg font-semibold text-white/60">No projects yet</h3>
          <p className="text-white/40 text-sm mt-1 mb-6">Create your first project to get started</p>
          <button onClick={() => setShowNewProject(true)} className="btn-primary">
            Create Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Projects list */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-sm font-semibold text-white/50 uppercase tracking-wider">All Projects</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {projects.map((project) => (
                <DeadlineCard
                  key={project.id}
                  project={project}
                  onViewWarning={(p) => setSelectedProject(p)}
                />
              ))}
            </div>
          </div>

          {/* Right: Details + Upload */}
          <div className="space-y-5">
            {/* Selected project details */}
            {selectedProject && (
              <div className="card">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
                  Project Details
                </h3>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-white/40">Name</p>
                    <p className="text-sm font-medium text-white">{selectedProject.name}</p>
                  </div>
                  {selectedProject.description && (
                    <div>
                      <p className="text-xs text-white/40">Description</p>
                      <p className="text-sm text-white/70">{selectedProject.description}</p>
                    </div>
                  )}
                  {selectedProject.stack && (
                    <div>
                      <p className="text-xs text-white/40">Stack</p>
                      <div className="flex flex-wrap gap-1.5 mt-1">
                        {selectedProject.stack.split(",").map((s) => (
                          <span key={s} className="text-xs px-2 py-0.5 bg-brand-500/20 text-brand-400 rounded-full border border-brand-500/20">
                            {s.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-white/40 mb-1.5">Progress</p>
                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-700"
                        style={{ width: `${selectedProject.completion_pct || 0}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/40 mt-1">{selectedProject.completion_pct?.toFixed(0)}% complete</p>
                  </div>
                  
                  {/* Invite Member */}
                  <div className="pt-4 mt-2 border-t border-white/5">
                    <p className="text-xs text-white/40 mb-2">Invite Member (by User ID)</p>
                    <form onSubmit={inviteMember} className="flex items-center gap-2">
                        <input 
                            type="number"
                            value={inviteUserId}
                            onChange={(e) => setInviteUserId(e.target.value)}
                            placeholder="User ID (e.g. 2)"
                            className="bg-surface-0 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-white/30 w-full focus:outline-none focus:ring-1 focus:ring-brand-500"
                        />
                        <select 
                            value={inviteRole}
                            onChange={(e) => setInviteRole(e.target.value)}
                            className="bg-surface-0 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
                        >
                            <option value="dev">Dev</option>
                            <option value="designer">Designer</option>
                            <option value="pm">PM</option>
                            <option value="viewer">Viewer</option>
                        </select>
                        <button type="submit" disabled={inviting} className="btn-primary py-1.5 px-3 text-xs whitespace-nowrap">
                            {inviting ? "Wait..." : "Invite"}
                        </button>
                    </form>
                  </div>
                </div>
              </div>
            )}

            {/* File upload */}
            <div className="card">
              <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">
                Upload Assets
              </h3>
              <FileUpload onUploadComplete={(file) => toast.success(`${file.filename} uploaded to S3`)} />
            </div>
          </div>
        </div>
      )}

      {/* New Project Modal */}
      {showNewProject && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-1 rounded-3xl border border-white/10 p-8 w-full max-w-lg shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white">New Project</h2>
              <button onClick={() => setShowNewProject(false)} className="p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={createProject} className="space-y-4">
              <div>
                <label className="text-xs text-white/50 font-medium block mb-1.5">Project Name *</label>
                <input
                  type="text"
                  placeholder="e.g. TeamForge MVP"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input-field"
                  id="project-name-input"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 font-medium block mb-1.5">Description</label>
                <textarea
                  placeholder="What is this project about?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="input-field resize-none"
                  id="project-desc-input"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 font-medium block mb-1.5">Tech Stack</label>
                <input
                  type="text"
                  placeholder="e.g. Next.js, FastAPI, PostgreSQL"
                  value={form.stack}
                  onChange={(e) => setForm({ ...form, stack: e.target.value })}
                  className="input-field"
                  id="project-stack-input"
                />
              </div>
              <div>
                <label className="text-xs text-white/50 font-medium block mb-1.5">Deadline</label>
                <input
                  type="datetime-local"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                  className="input-field"
                  id="project-deadline-input"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewProject(false)} className="flex-1 btn-ghost">
                  Cancel
                </button>
                <button type="submit" disabled={creating} className="flex-1 btn-primary flex items-center justify-center gap-2" id="create-project-submit">
                  {creating ? <Loader size={16} className="animate-spin" /> : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Chatbot */}
      <AIChatBot project={selectedProject} />
    </div>
  );
}

DashboardPage.title = "Dashboard";
