/**
 * TeamForge — Chat Window Component
 *
 * Real-time WebSocket chat pane for a project room.
 * - Connects to the backend WS /ws/chat/{roomId}
 * - Displays messages with sender name and timestamp
 * - System messages (GitHub pushes, deadline warnings) shown inline
 */

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { Send, Zap, AlertTriangle, GitCommit } from "lucide-react";
import { connectToRoom } from "../lib/socket";
import { getToken, getCurrentUser } from "../lib/auth";
import clsx from "clsx";

export default function ChatWindow({ roomId, roomName = "General" }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [alias, setAlias] = useState(() => {
    if (typeof window !== "undefined") return localStorage.getItem("teamforge_alias") || "";
    return "";
  });
  const [connected, setConnected] = useState(false);
  const bottomRef = useRef(null);
  const wsRef = useRef(null);
  const token = getToken();
  const currentUser = getCurrentUser();

  useEffect(() => {
    if (!roomId || !token) return;

    const ws = connectToRoom(roomId, token, (msg) => {
      setMessages((prev) => [...prev, msg]);
    });
    wsRef.current = ws;
    setConnected(true);

    return () => {
      ws.close();
      setConnected(false);
    };
  }, [roomId, token]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAliasChange = (e) => {
    setAlias(e.target.value);
    localStorage.setItem("teamforge_alias", e.target.value);
  };

  const sendMessage = () => {
    let trimmed = input.trim();
    if (!trimmed || !wsRef.current) return;
    
    if (alias) {
      trimmed = `[${alias}] ` + trimmed;
    }
    
    wsRef.current.send(trimmed);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-2 rounded-2xl border border-white/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-surface-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-brand-600/30 flex items-center justify-center">
            <Zap size={16} className="text-brand-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">#{roomName}</h3>
            <p className="text-xs text-white/40">Team chat</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/40">
          <div className={clsx("w-2 h-2 rounded-full", connected ? "bg-accent-green" : "bg-accent-red")} />
          {connected ? "Connected" : "Disconnected"}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-white/30 text-sm">
            No messages yet. Start the conversation!
          </div>
        )}

        {messages.map((msg, index) => {
          const isSystem = msg.type === "system" || msg.type === "deadline_warning";
          // Use loose equality in case of string vs int ID mismatch
          const isSelf = msg.sender_id == currentUser?.id;

          if (isSystem) {
            return (
              <div key={index} className="flex justify-center py-2">
                <div className={clsx(
                  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider px-4 py-1.5 rounded-full border",
                  msg.type === "deadline_warning"
                    ? "bg-accent-amber/10 border-accent-amber/20 text-accent-amber"
                    : "bg-brand-500/10 border-brand-500/20 text-brand-400"
                )}>
                  {msg.type === "deadline_warning" ? <AlertTriangle size={12} /> : <GitCommit size={12} />}
                  <span>{msg.content}</span>
                </div>
              </div>
            );
          }

          return (
            <div
              key={index}
              className={clsx(
                "flex w-full gap-3 animate-fade-in mb-4", 
                isSelf ? "flex-row-reverse" : "flex-row"
              )}
            >
              {/* Avatar */}
              <div className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-lg transition-transform hover:scale-110",
                isSelf ? "bg-brand-500" : "bg-surface-3 border border-white/10"
              )}>
                {(msg.sender_name || "U")[0].toUpperCase()}
              </div>

              {/* Message Content */}
              <div className={clsx(
                "flex flex-col gap-1.5 max-w-[80%] lg:max-w-[70%]", 
                isSelf ? "items-end" : "items-start"
              )}>
                <div className={clsx(
                  "flex items-center gap-2 text-[10px] font-bold text-white/30 uppercase tracking-widest",
                  isSelf && "flex-row-reverse"
                )}>
                  <span className="text-white/60">{isSelf ? "You" : (msg.sender_name || "Unknown")}</span>
                  {msg.timestamp && (
                    <span className="font-medium opacity-50">
                      {format(new Date(msg.timestamp), "HH:mm")}
                    </span>
                  )}
                </div>
                <div
                  className={clsx(
                    "px-4 py-2.5 rounded-2xl text-sm leading-relaxed shadow-sm transition-all",
                    isSelf
                      ? "bg-brand-600 text-white rounded-tr-none border border-brand-500/20"
                      : "bg-surface-3 text-white/90 border border-white/5 rounded-tl-none"
                  )}
                >
                  {msg.content}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-white/5 bg-surface-1">
        <div className="flex items-end gap-3">
          <input
            value={alias}
            onChange={handleAliasChange}
            placeholder="Alias (opt)"
            className="w-24 bg-surface-0 border border-white/10 rounded-xl px-3 py-3 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all font-medium"
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message... (Enter to send)"
            rows={1}
            className="flex-1 bg-surface-0 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-brand-500/50 transition-all"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="w-10 h-10 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all duration-200 hover:scale-105"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
