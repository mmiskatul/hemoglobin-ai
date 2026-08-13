"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Send, Search, Phone, MoreVertical, Plus, MessageSquare, AlertCircle } from "lucide-react";
import { api, DirectMessage, Conversation, User as UserType } from "@/services/api";

interface DirectMessagesProps {
  currentUser: UserType | null;
  selectedContact: { id: number; name: string } | null;
  onOpenAuth: () => void;
}

export const DirectMessages: React.FC<DirectMessagesProps> = ({
  currentUser,
  selectedContact,
  onOpenAuth,
}) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activePartner, setActivePartner] = useState<{ id: number; name: string } | null>(
    () => selectedContact || null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchingChats, setFetchingChats] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);

  const fetchConversations = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await api.getConversations(currentUser.id);
      const convList = res.conversations || [];
      setConversations(convList);

      if (!activePartner && convList.length > 0) {
        setActivePartner({ id: convList[0].id, name: convList[0].name });
      }
    } catch {
      setConversations([]);
    }
  }, [currentUser, activePartner]);

  const fetchChatHistory = useCallback(async () => {
    if (!currentUser || !activePartner) return;
    setFetchingChats(true);
    try {
      const res = await api.getChatHistory(currentUser.id, activePartner.id);
      setMessages(res.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setFetchingChats(false);
    }
  }, [currentUser, activePartner]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchChatHistory();
    }, 3000);
    return () => clearInterval(interval);
  }, [fetchChatHistory]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      onOpenAuth();
      return;
    }
    if (!activePartner || !input.trim() || loading) return;

    const textToSend = input.trim();
    setInput("");
    setLoading(true);

    try {
      const res = await api.sendDirectMessage({
        sender_id: currentUser.id,
        sender_name: currentUser.name,
        receiver_id: activePartner.id,
        receiver_name: activePartner.name,
        message: textToSend,
      });

      // Append new message live
      if (res.data) {
        setMessages((prev) => [...prev, res.data]);
      } else {
        await fetchChatHistory();
      }
      await fetchConversations();
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const filteredConversations = conversations.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!currentUser) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-4 shadow-sm">
        <MessageSquare className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-extrabold text-slate-900 text-xl">Direct Emergency Messaging</h3>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Please log in to your account to send and receive direct messages with emergency requesters and donors.
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
    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs flex flex-col md:flex-row h-[680px]">
      {/* Left Inbox Sidebar */}
      <div className={`w-full md:w-80 bg-slate-50/70 border-r border-slate-200 flex flex-col ${activePartner ? "hidden md:flex" : "flex"}`}>
        {/* Inbox Header */}
        <div className="p-5 flex items-center justify-between pb-3">
          <h2 className="font-extrabold text-slate-900 text-2xl tracking-tight">Inbox</h2>
          <span className="px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-extrabold">
            {conversations.length} Active
          </span>
        </div>

        {/* Search Messages Input */}
        <div className="px-5 pb-4">
          <div className="bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none w-full"
            />
          </div>
        </div>

        {/* Contacts List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 space-y-2">
              <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
              <p className="font-bold text-slate-600">No conversations found</p>
              <p className="text-[11px] leading-relaxed">
                Click &quot;Direct Chat&quot; on any emergency post to message requesters directly!
              </p>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isActive = activePartner?.id === c.id;
              return (
                <div
                  key={c.id}
                  onClick={() => setActivePartner({ id: c.id, name: c.name })}
                  className={`p-4 transition-all cursor-pointer flex items-start gap-3 relative ${
                    isActive ? "bg-white shadow-xs font-semibold" : "hover:bg-slate-100/60"
                  }`}
                >
                  <div className="relative shrink-0">
                    <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-slate-900 text-xs truncate">{c.name}</h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {c.last_sent_at
                          ? new Date(c.last_sent_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : ""}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{c.last_message}</p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Main Chat Window */}
      <div className={`flex-1 flex flex-col justify-between bg-white ${activePartner ? "flex" : "hidden md:flex"}`}>
        {activePartner ? (
          <>
            {/* Header */}
            <div className="p-4 px-6 border-b border-slate-200 bg-white flex items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActivePartner(null)}
                  className="md:hidden text-rose-700 font-bold text-xs flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 rounded-xl hover:bg-rose-100 transition-all cursor-pointer shrink-0"
                >
                  ← Inbox
                </button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold text-xs">
                    {activePartner.name.charAt(0)}
                  </div>
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute bottom-0 right-0 border-2 border-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">{activePartner.name}</h3>
                  <p className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 badge-pulse" />
                    Live Direct Channel
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-600">
                <button className="p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                  <Phone className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-xl hover:bg-slate-100 transition-all cursor-pointer">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Feed */}
            <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50/40">
              {fetchingChats && messages.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Loading chat history...
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-16 text-slate-400 text-xs space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="font-bold text-slate-700">No messages in this chat yet</p>
                  <p className="text-[11px]">Type a message below to start coordinating!</p>
                </div>
              ) : (
                messages.map((m) => {
                  const isMe = currentUser ? m.sender_id === currentUser.id : false;
                  const isUrgent = m.message.includes("URGENT") || m.message.includes("⚠️");

                  return (
                    <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"} gap-2`}>
                      {!isMe && (
                        <div className="w-7 h-7 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px] flex items-center justify-center shrink-0 self-start mt-1">
                          {m.sender_name ? m.sender_name.charAt(0) : "U"}
                        </div>
                      )}

                      <div className="max-w-[78%] space-y-1">
                        <div
                          className={`p-4 rounded-2xl text-xs leading-relaxed ${
                            isMe
                              ? "bg-rose-700 text-white rounded-tr-none shadow-xs font-medium"
                              : isUrgent
                              ? "bg-rose-50 border border-rose-200 text-rose-950 rounded-tl-none font-semibold shadow-xs"
                              : "bg-slate-100 text-slate-800 rounded-tl-none font-medium"
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>
                        </div>

                        <span className={`text-[10px] text-slate-400 block px-1 ${isMe ? "text-right" : "text-left"}`}>
                          {m.sent_at
                            ? new Date(m.sent_at).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom Input Composer */}
            <div className="p-4 bg-white border-t border-slate-100">
              <form onSubmit={handleSend} className="bg-slate-100/90 rounded-2xl p-2.5 px-4 flex items-center gap-3 border border-slate-200">
                <button type="button" className="text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
                  <Plus className="w-5 h-5" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={`Message ${activePartner.name}...`}
                  className="bg-transparent text-xs text-slate-900 placeholder-slate-400 focus:outline-none flex-1"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || loading}
                  className="w-9 h-9 rounded-xl bg-rose-700 hover:bg-rose-800 text-white flex items-center justify-center transition-all disabled:opacity-40 cursor-pointer shadow-xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400 space-y-3">
            <MessageSquare className="w-12 h-12 text-slate-300" />
            <h3 className="font-bold text-slate-700 text-sm">Select a Conversation</h3>
            <p className="text-xs text-slate-400 max-w-sm">
              Choose a contact from the inbox list or click &quot;Direct Chat&quot; on any emergency post in the home feed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
