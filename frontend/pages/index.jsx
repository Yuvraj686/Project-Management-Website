/**
 * TeamForge — Login / Register Page (index.jsx)
 *
 * Landing page for unauthenticated users.
 * Supports both login and registration with animated toggle.
 */

import { useState } from "react";
import { useRouter } from "next/router";
import { login, register } from "../lib/auth";
import toast from "react-hot-toast";
import { Zap, Mail, Lock, User, ArrowRight, Loader } from "lucide-react";

export default function IndexPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [form, setForm] = useState({ email: "", name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
      } else {
        await register(form.email, form.name, form.password);
      }
      toast.success("Welcome to TeamForge! 🚀");
      router.push("/dashboard");
    } catch (err) {
      const msg = err.response?.data?.detail || "Something went wrong";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] bg-brand-900/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] bg-accent-purple/10 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-purple mb-4 animate-glow shadow-lg">
            <Zap size={30} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">TeamForge</h1>
          <p className="text-white/50 mt-1 text-sm">Real-time collaborative project management</p>
        </div>

        {/* Card */}
        <div className="bg-surface-1 border border-white/8 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {/* Toggle */}
          <div className="flex bg-surface-0 rounded-xl p-1 mb-8">
            {["login", "register"].map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
                  mode === m
                    ? "bg-brand-600 text-white shadow-md"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name (register only) */}
            {mode === "register" && (
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input-field pl-10"
                  id="register-name"
                />
              </div>
            )}

            {/* Email */}
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="email"
                placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                className="input-field pl-10"
                id="auth-email"
              />
            </div>

            {/* Password */}
            <div className="relative">
              <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
                minLength={8}
                className="input-field pl-10"
                id="auth-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base mt-2"
              id="auth-submit"
            >
              {loading ? (
                <Loader size={18} className="animate-spin" />
              ) : (
                <>
                  {mode === "login" ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/30 mt-6">
            By continuing, you agree to TeamForge&apos;s Terms of Service.
          </p>
        </div>

        {/* Features */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { label: "Real-time Chat", color: "text-accent-cyan" },
            { label: "AI Reviews", color: "text-accent-purple" },
            { label: "GitHub Sync", color: "text-accent-green" },
          ].map(({ label, color }) => (
            <div key={label} className="text-center p-3 bg-surface-1/50 rounded-xl border border-white/5">
              <p className={`text-xs font-medium ${color}`}>{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

IndexPage.title = "Sign In";
