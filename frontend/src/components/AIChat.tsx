"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Bot, Send, Plus, Sparkles, Users, ShieldCheck, Copy, Check } from "lucide-react";
import { api, AIChatResponse, User as UserType } from "@/services/api";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  data?: AIChatResponse;
}

interface AIChatProps {
  currentUser: UserType | null;
  onOpenAuth: () => void;
}

const QUICK_PROMPTS = [
  "Find available O+ donors in Sylhet",
  "Check emergency blood supply status",
  "How does AI donor matching work?",
  "What blood groups are compatible with A+?",
];

export const AIChat: React.FC<AIChatProps> = ({ currentUser, onOpenAuth }) => {
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: "Hello! I am your AI Emergency Dispatch Assistant. Connected live to MongoDB Atlas & Gmail SMTP dispatch engine. How can I assist you with donor matching or hospital blood logistics today?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const handleCopyText = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch {
      // ignore
    }
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load user-wise chat history from MongoDB Atlas on mount
  const fetchHistory = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getAIChatHistory(currentUser.id);
      if (res.history && res.history.length > 0) {
        const loadedMsgs: ChatMessage[] = [];
        res.history.forEach((item, idx: number) => {
          loadedMsgs.push({
            id: `user-${idx}`,
            sender: "user",
            text: item.message,
            timestamp: item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
          });
          loadedMsgs.push({
            id: `ai-${idx}`,
            sender: "ai",
            text: item.reply,
            timestamp: item.created_at
              ? new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
            data: {
              reply: item.reply,
              matching_count: item.matching_count || 0,
              notifications_sent: 0,
              donors: item.donors || [],
            },
          });
        });
        setMessages(loadedMsgs);
      }
    } catch {
      // ignore
    }
  }, [currentUser]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchHistory();
    }, 100);
    return () => clearTimeout(timer);
  }, [fetchHistory]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSendQuery = async (queryText: string) => {
    if (!currentUser) {
      onOpenAuth();
      return;
    }

    const query = queryText.trim();
    if (!query || loading) return;

    const userMsgId = `usr-${query.length}-${messages.length + 1}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendAIChat(query, currentUser.id);
      const aiMsgId = `ai-${query.length}-${messages.length + 2}`;
      const aiMsg: ChatMessage = {
        id: aiMsgId,
        sender: "ai",
        text: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        data: res,
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      const msgText = err instanceof Error ? err.message : "Failed to reach AI engine. Please verify backend connection.";
      const errorMsgId = `err-${query.length}-${messages.length + 2}`;
      const errorMsg: ChatMessage = {
        id: errorMsgId,
        sender: "ai",
        text: `⚠️ AI Assistant Error: ${msgText}`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    handleSendQuery(input);
  };

  if (!currentUser) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
        <Bot className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-extrabold text-slate-900 text-xl">Emergency AI Assistant</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please log in to your account to chat with the AI Emergency Coordinator and save your donor search history.
        </p>
        <button
          onClick={onOpenAuth}
          className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-6 py-3 rounded-2xl cursor-pointer shadow-md transition-all"
        >
          Log In / Register
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Quick Action AI Prompts & Info (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-200 border-l-4 border-l-rose-700 shadow-xs space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 shrink-0">
                <Sparkles className="w-5 h-5 text-rose-700" />
              </div>
              <div>
                <h2 className="font-extrabold text-slate-900 text-lg tracking-tight">
                  Emergency AI Assistant
                </h2>
                <p className="text-xs text-slate-500">
                  Real-time NLP Donor Matching & Logistics
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ask AI to locate compatible blood donors, calculate urgency priorities, or explain compatibility guidelines.
            </p>

            <div className="pt-2 border-t border-slate-100 space-y-2">
              <span className="text-[11px] font-bold text-slate-500 block">Suggested Quick Commands:</span>
              <div className="space-y-2">
                {QUICK_PROMPTS.map((prompt, idx) => (
                  <button
                    key={idx}
                    disabled={loading}
                    onClick={() => handleSendQuery(prompt)}
                    className="w-full text-left p-3 rounded-2xl bg-slate-50 hover:bg-rose-50 hover:border-rose-200 border border-slate-200 text-slate-700 hover:text-rose-900 text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
                  >
                    💡 {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* AI Capability Banner */}
          <div className="bg-gradient-to-br from-slate-900 to-rose-950 p-6 rounded-3xl text-white space-y-3 shadow-md">
            <div className="flex items-center gap-2 text-rose-300 font-bold text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Real-time Verified Intelligence</span>
            </div>
            <h3 className="font-bold text-sm text-white">Direct Integration with Database</h3>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Queries run against MongoDB Atlas live records to provide instant donor counts and location availability.
            </p>
          </div>
        </div>

        {/* Right Column: Interactive Chat Window (7 Cols) */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col h-[650px]">
          {/* Header */}
          <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-700 text-white flex items-center justify-center shadow-xs shrink-0">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Emergency AI Coordinator</h3>
                <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 badge-pulse" />
                  Logged in as {currentUser.name}
                </p>
              </div>
            </div>

            <button
              onClick={() => setMessages([messages[0]])}
              className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
              title="Clear Conversation"
            >
              Clear
            </button>
          </div>

          {/* Messages Scroll Area */}
          <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"} gap-3`}>
                  {!isUser && (
                    <div className="w-8 h-8 rounded-full bg-rose-700 text-white flex items-center justify-center font-bold text-xs shrink-0 self-start mt-1">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div className="max-w-[82%] space-y-2">
                    <div
                      className={`p-4 rounded-2xl text-xs leading-relaxed ${
                        isUser
                          ? "bg-rose-700 text-white rounded-tr-none shadow-xs font-medium"
                          : "bg-slate-100 text-slate-800 rounded-tl-none font-medium"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="whitespace-pre-wrap flex-1">{msg.text}</p>
                        <button
                          onClick={() => handleCopyText(msg.id, msg.text)}
                          className="p-1 rounded-lg hover:bg-black/10 transition-all shrink-0 cursor-pointer"
                          title="Copy text"
                        >
                          {copiedMsgId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5 opacity-70 hover:opacity-100" />
                          )}
                        </button>
                      </div>

                      {/* Render Live AI Match Summary Card if returned */}
                      {msg.data && msg.data.matching_count !== undefined && msg.data.matching_count > 0 && (
                        <div className="mt-3 bg-white p-3 rounded-xl border border-slate-200 space-y-2 text-slate-900 shadow-xs">
                          <div className="flex items-center justify-between text-xs font-bold text-rose-800">
                            <div className="flex items-center gap-1.5">
                              <Users className="w-4 h-4 text-rose-700" />
                              <span>Live Matching Donors Found</span>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px]">
                              {msg.data.matching_count} Donors
                            </span>
                          </div>

                          {msg.data.donors && msg.data.donors.length > 0 && (
                            <div className="space-y-1 pt-1 border-t border-slate-100">
                              {msg.data.donors.slice(0, 3).map((d) => (
                                <div key={d.id} className="flex items-center justify-between text-[11px] text-slate-700">
                                  <span>{d.name} ({d.blood_group})</span>
                                  <span className="text-[10px] text-slate-400">{d.location}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <span className={`text-[10px] text-slate-400 block px-1 ${isUser ? "text-right" : "text-left"}`}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {loading && (
              <div className="flex justify-start gap-3">
                <div className="w-8 h-8 rounded-full bg-rose-700 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  <Bot className="w-4 h-4 animate-spin" />
                </div>
                <div className="p-4 rounded-2xl bg-slate-100 text-slate-500 text-xs font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-rose-700 animate-ping" />
                  <span>AI Coordinator processing query...</span>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Composer */}
          <div className="p-4 bg-white border-t border-slate-100">
            <form onSubmit={handleFormSubmit} className="bg-slate-100/90 rounded-2xl p-2.5 px-4 flex items-center gap-3 border border-slate-200">
              <button type="button" className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                <Plus className="w-5 h-5" />
              </button>

              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Instruct Emergency AI Assistant..."
                className="bg-transparent text-xs text-slate-900 placeholder-slate-500 focus:outline-none flex-1"
              />

              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="bg-rose-700 hover:bg-rose-800 text-white p-2.5 rounded-xl flex items-center justify-center cursor-pointer transition-all disabled:opacity-40 shadow-xs"
              >
                <Send className="w-4 h-4 fill-white" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
