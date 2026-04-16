import { useEffect, useState } from "react";
import { LogOut, User as UserIcon, Mail, Hash } from "lucide-react";
import { getCurrentUser, logout } from "../lib/auth";

export default function ProfilePage() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto py-12 animate-fade-in">
      <h1 className="text-2xl font-bold text-white mb-8">Your Profile</h1>
      
      <div className="card space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center text-2xl font-bold text-white shadow-lg">
            {user.name?.[0]?.toUpperCase() || "U"}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{user.name}</h2>
            <p className="text-sm text-white/50">TeamForge Member</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-surface-0 border border-white/5 rounded-xl p-4 flex items-start gap-3">
            <UserIcon className="text-brand-400 mt-0.5" size={18} />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Full Name</p>
              <p className="text-sm text-white font-medium">{user.name}</p>
            </div>
          </div>
          
          <div className="bg-surface-0 border border-white/5 rounded-xl p-4 flex items-start gap-3">
            <Mail className="text-brand-400 mt-0.5" size={18} />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Email Address</p>
              <p className="text-sm text-white font-medium">{user.email}</p>
            </div>
          </div>

          <div className="bg-surface-0 border border-white/5 rounded-xl p-5 flex items-start gap-3 md:col-span-2">
            <Hash className="text-brand-400 mt-0.5" size={20} />
            <div>
              <p className="text-xs text-white/40 uppercase tracking-wider font-semibold mb-1">Your User ID</p>
              <p className="text-3xl font-black text-brand-300 font-mono tracking-tight">{user.id}</p>
              <p className="text-xs text-white/40 mt-2">
                Give this User ID to project owners so they can easily invite you directly to their projects via the dashboard.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 mt-6 border-t border-white/5 flex justify-end">
          <button
            onClick={logout}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-red/10 text-accent-red hover:bg-accent-red/20 border border-accent-red/20 transition-all font-medium"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}

ProfilePage.title = "Profile";
