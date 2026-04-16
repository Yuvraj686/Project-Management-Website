/**
 * TeamForge — Chat Page
 *
 * Select a project → select or create a chat room → real-time messaging.
 */

import { useState, useEffect } from "react";
import { Plus, MessageSquare, Lock, Globe, Loader } from "lucide-react";
import api from "../lib/api";
import ChatWindow from "../components/ChatWindow";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function ChatPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/projects").then(({ data }) => {
      setProjects(data);
      if (data.length > 0) setSelectedProject(data[0]);
      setLoading(false);
    }).catch(() => { toast.error("Failed to load projects"); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    // Fetch chat rooms for the selected project
    // For demo, we create a default general room if none exist
    fetchOrCreateRoom(selectedProject.id);
  }, [selectedProject]);

  const fetchOrCreateRoom = async (projectId) => {
    try {
      // Try to get the room by project — using a simplified approach
      // In production, you'd have GET /projects/{id}/rooms
      const { data } = await api.post(`/projects/${projectId}/rooms`, {
        project_id: projectId,
        name: "general",
        is_private: false,
      }).catch(async () => {
        // If 409 or error, return empty
        return { data: null };
      });

      if (data) {
        setRooms([data]);
        setSelectedRoom(data);
      }
    } catch {
      // Swallow — room creation is best-effort
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader size={24} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-6rem)]">
      <div className="flex h-full gap-5">
        {/* Sidebar: projects + rooms */}
        <div className="w-64 flex-shrink-0 space-y-4">
          {/* Projects */}
          <div className="card p-4">
            <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Projects</p>
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

          {/* Rooms */}
          {selectedProject && (
            <div className="card p-4">
              <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-3">Channels</p>
              <div className="space-y-1">
                {rooms.length === 0 && (
                  <p className="text-xs text-white/30 px-3 py-2">No channels yet</p>
                )}
                {rooms.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRoom(r)}
                    className={clsx(
                      "w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2 transition-all",
                      selectedRoom?.id === r.id
                        ? "bg-brand-600/20 text-brand-400 border border-brand-500/20"
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                  >
                    {r.is_private ? <Lock size={12} /> : <Globe size={12} />}
                    #{r.name || "general"}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Chat window */}
        <div className="flex-1 min-w-0">
          {selectedRoom ? (
            <ChatWindow roomId={selectedRoom.id} roomName={selectedRoom.name || "general"} />
          ) : (
            <div className="h-full flex items-center justify-center card">
              <div className="text-center">
                <MessageSquare size={40} className="text-white/20 mx-auto mb-4" />
                <p className="text-white/40 text-sm">Select a channel to start chatting</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ChatPage.title = "Team Chat";
