import { useState, useEffect } from "react";
import { Plus, MessageSquare, Lock, Globe, Loader, User, Hash } from "lucide-react";
import api from "../lib/api";
import ChatWindow from "../components/ChatWindow";
import { getCurrentUser } from "../lib/auth";
import toast from "react-hot-toast";
import clsx from "clsx";

export default function ChatPage() {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    api.get("/projects").then(({ data }) => {
      setProjects(data);
      
      const queryParams = new URLSearchParams(window.location.search);
      const projId = queryParams.get("project");
      
      if (projId) {
        const found = data.find(p => p.id === parseInt(projId));
        if (found) setSelectedProject(found);
        else if (data.length > 0) setSelectedProject(data[0]);
      } else if (data.length > 0) {
        setSelectedProject(data[0]);
      }
      
      setLoading(false);
    }).catch(() => {
      toast.error("Failed to load projects");
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!selectedProject) return;
    refreshRooms(selectedProject.id);
  }, [selectedProject]);

  const refreshRooms = async (projectId) => {
    try {
      // 1. Fetch project members (for DMs)
      const { data: mems } = await api.get(`/projects/${projectId}/members`);
      setMembers(mems.filter(m => m.user_id !== currentUser?.id));

      // 2. Fetch or Create #general channel
      const { data: generalRoom } = await api.post(`/projects/${projectId}/rooms`, {
        project_id: projectId,
        name: "general",
        is_private: false,
      });

      // 3. List all rooms for this project
      const { data: allRooms } = await api.get(`/projects/${projectId}/rooms`);
      
      setChannels(allRooms.filter(r => !r.is_private));
      setSelectedRoom(generalRoom);
    } catch (err) {
      console.error(err);
      toast.error("Error setting up project chat");
    }
  };

  const openDM = async (member) => {
    try {
      const { data } = await api.post(`/projects/${selectedProject.id}/rooms`, {
        project_id: selectedProject.id,
        name: `${currentUser.name}, ${member.name}`,
        is_private: true,
        member_ids: [currentUser.id, member.user_id]
      });
      setSelectedRoom(data);
    } catch (err) {
      toast.error("Failed to start DM");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader size={32} className="text-brand-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto h-[calc(100vh-8rem)]">
      <div className="flex h-full gap-5">
        {/* Sidebar */}
        <div className="w-72 flex-shrink-0 flex flex-col gap-4">
          {/* Projects Selector */}
          <div className="card p-4">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-3 px-1">Active Projects</p>
            <div className="space-y-1">
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedProject(p)}
                  className={clsx(
                    "w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all group",
                    selectedProject?.id === p.id
                      ? "bg-brand-600/20 text-brand-400 border border-brand-500/20 shadow-sm"
                      : "text-white/50 hover:text-white hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <div className={clsx("w-1.5 h-1.5 rounded-full transition-all", selectedProject?.id === p.id ? "bg-brand-400" : "bg-white/10 group-hover:bg-white/30")} />
                    {p.name}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Channels & DMs */}
          <div className="card p-2 flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
            <div className="p-2">
               <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-2">Channels</p>
               <div className="space-y-1 mb-6">
                 {channels.map((c) => (
                   <button
                     key={c.id}
                     onClick={() => setSelectedRoom(c)}
                     className={clsx(
                       "w-full text-left px-3 py-2 rounded-xl text-sm flex items-center justify-between group transition-all",
                       selectedRoom?.id === c.id
                         ? "bg-brand-600/10 text-brand-400"
                         : "text-white/40 hover:text-white hover:bg-white/5"
                     )}
                   >
                     <div className="flex items-center gap-2.5">
                       <Hash size={14} className={clsx("transition-colors", selectedRoom?.id === c.id ? "text-brand-400" : "text-white/20 group-hover:text-white/40")} />
                       {c.name}
                     </div>
                   </button>
                 ))}
               </div>

               <p className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] mb-4 px-2">Team Members</p>
               <div className="space-y-1">
                 {members.map((m) => {
                   // Find if there's a selected DM room for this member
                   const isActive = selectedRoom?.is_private && selectedRoom?.member_ids.includes(m.user_id.toString());
                   return (
                     <button
                       key={m.id}
                       onClick={() => openDM(m)}
                       className={clsx(
                         "w-full text-left px-3 py-2 rounded-xl text-sm flex items-center gap-2.5 transition-all group",
                         isActive
                           ? "bg-brand-600/10 text-brand-400"
                           : "text-white/40 hover:text-white hover:bg-white/5"
                       )}
                     >
                        <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center relative flex-shrink-0">
                          <User size={12} className={clsx("transition-colors", isActive ? "text-brand-400" : "text-white/20 group-hover:text-white/40")} />
                          <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-green border-2 border-surface-1" />
                        </div>
                       <span className="truncate">{m.name}</span>
                     </button>
                   );
                 })}
               </div>
            </div>
          </div>
        </div>

        {/* Chat window */}
        <div className="flex-1 min-w-0">
          {selectedRoom ? (
            <ChatWindow 
              roomId={selectedRoom.id} 
              roomName={selectedRoom.is_private ? "Direct Message" : selectedRoom.name} 
            />
          ) : (
            <div className="h-full flex items-center justify-center card bg-surface-1/50 backdrop-blur-sm border-dashed border-2 border-white/5">
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-white/5 flex items-center justify-center mx-auto mb-6">
                   <MessageSquare size={32} className="text-white/10" />
                </div>
                <h3 className="text-white font-semibold mb-2">Your Team Forge Feed</h3>
                <p className="text-white/30 text-sm max-w-[240px] mx-auto leading-relaxed">
                  Select a channel or a team member to start collaborating.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

ChatPage.title = "Collaboration Hub";
