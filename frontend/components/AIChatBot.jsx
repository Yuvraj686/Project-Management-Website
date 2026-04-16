/**
 * TeamForge — AI Chatbot Component
 *
 * Floating AI assistant panel. The user can ask questions about their
 * selected project and receive context-aware Gemini responses.
 * Auto-injects: project name, stack, deadline, completion %.
 */

import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Bot, X, Send, Minimize2, Maximize2, Loader } from "lucide-react";
import api from "../lib/api";
import clsx from "clsx";

export default function AIChatBot({ project }) {
  const [open, setOpen] = useState(false);
  const [minimised, setMinimised] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (open && messages.length === 0 && project) {
      setMessages([{
        role: "assistant",
        content: `👋 Hi! I'm your AI assistant for **${project.name}**.\n\nI know your project is **${project.completion_pct?.toFixed(0)}% complete** with a deadline on **${project.deadline ? new Date(project.deadline).toLocaleDateString() : "no date set"}**.\n\nAsk me anything — architecture review, sprint planning, risk analysis, or code suggestions!`,
      }]);
    }
  }, [open, project]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading || !project) return;

    const userMsg = { role: "user", content: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const { data } = await api.post("/ai/review", {
        project_id: project.id,
        extra_context: trimmed,
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.review }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "⚠️ Unable to reach the AI service. Please check your connection and API key.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-2xl bg-gradient-to-br from-brand-600 to-accent-purple shadow-lg hover:scale-110 transition-all duration-200 flex items-center justify-center z-50 animate-glow"
          title="Open AI Assistant"
        >
          <Bot size={24} className="text-white" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <div
          className={clsx(
            "fixed bottom-6 right-6 z-50 bg-surface-1 border border-white/10 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300",
            minimised ? "w-72 h-14" : "w-96 h-[600px]"
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-surface-2 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center">
                <Bot size={14} className="text-white" />
              </div>
              <span className="text-sm font-semibold text-white">AI Assistant</span>
              {project && <span className="text-xs text-white/40 truncate ml-1">· {project.name}</span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMinimised(!minimised)}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                {minimised ? <Maximize2 size={14} /> : <Minimize2 size={14} />}
              </button>
              <button
                onClick={() => { setOpen(false); setMinimised(false); }}
                className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {!minimised && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
                {messages.map((msg, i) => (
                  <div key={i} className={clsx("flex gap-2 animate-fade-in", msg.role === "user" ? "justify-end" : "justify-start")}>
                    {msg.role === "assistant" && (
                      <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Bot size={12} className="text-white" />
                      </div>
                    )}
                    <div
                      className={clsx(
                        "max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        msg.role === "user"
                          ? "bg-brand-600 text-white rounded-tr-sm"
                          : "bg-surface-3 text-white/90 border border-white/5 rounded-tl-sm"
                      )}
                    >
                      {msg.role === "assistant" ? (
                        <ReactMarkdown className="prose prose-invert prose-sm max-w-none">
                          {msg.content}
                        </ReactMarkdown>
                      ) : (
                        msg.content
                      )}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2 justify-start animate-fade-in">
                    <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-brand-500 to-accent-purple flex items-center justify-center flex-shrink-0">
                      <Bot size={12} className="text-white" />
                    </div>
                    <div className="bg-surface-3 border border-white/5 px-4 py-3 rounded-2xl rounded-tl-sm">
                      <Loader size={16} className="text-brand-400 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="px-4 py-3 border-t border-white/5 bg-surface-2">
                <div className="flex gap-2">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder={project ? "Ask about your project..." : "Select a project first"}
                    disabled={!project || loading}
                    className="flex-1 bg-surface-0 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50 disabled:opacity-50 transition-all"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading || !project}
                    className="w-9 h-9 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 flex items-center justify-center transition-all hover:scale-105"
                  >
                    <Send size={14} className="text-white" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
