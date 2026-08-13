"use client";

import React from "react";
import { Sparkles, MessageSquare, Bot, ArrowRight, CheckCircle2, Send } from "lucide-react";

interface LandingSectionProps {
  onNavigateToSocial: () => void;
  onNavigateToAI: () => void;
  onOpenRegister: () => void;
  onOpenAuth: () => void;
}

export const LandingSection: React.FC<LandingSectionProps> = ({
  onNavigateToSocial,
  onNavigateToAI,
  onOpenRegister,
  onOpenAuth,
}) => {
  return (
    <div className="space-y-12 py-6">
      {/* Main Hero Banner */}
      <div className="bg-white p-8 lg:p-14 rounded-3xl border border-slate-200 text-center space-y-6 shadow-sm relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-rose-100/60 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-rose-50/80 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold">
          <Sparkles className="w-4 h-4" />
          <span>AI-Powered Emergency Social Network</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-900 tracking-tight leading-tight max-w-4xl mx-auto">
          Connect, Post Need & <span className="text-rose-700">Instantly Alert Donors</span>
        </h1>

        <p className="text-slate-600 text-base max-w-2xl mx-auto leading-relaxed font-medium">
          A real-time emergency social network. Post your blood requirements, let AI analyze and dispatch alerts to local matching donors, and connect directly via private 1-on-1 messaging.
        </p>

        {/* CTA Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={onNavigateToSocial}
            className="bg-rose-700 hover:bg-rose-800 text-white px-8 py-4 rounded-2xl text-sm font-extrabold flex items-center gap-3 cursor-pointer shadow-md shadow-rose-700/20 transition-all hover:scale-105 w-full sm:w-auto justify-center"
          >
            <MessageSquare className="w-5 h-5" />
            <span>Post & Browse Emergency Feed</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onNavigateToAI}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 px-8 py-4 rounded-2xl text-sm font-bold transition-all flex items-center gap-3 cursor-pointer w-full sm:w-auto justify-center"
          >
            <Bot className="w-5 h-5 text-rose-700" />
            <span>Emergency AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs hover:border-rose-300 transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold">
            <MessageSquare className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">1. Social Emergency Feed</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Post urgent blood requirements publicly. The community can pledge donations, comment, and connect directly.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs hover:border-rose-300 transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold">
            <Bot className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">2. Automated AI Analysis</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Our AI engine instantly scans each post content, locates matching verified donors in MongoDB, and dispatches email alerts.
          </p>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-3 shadow-xs hover:border-rose-300 transition-all">
          <div className="w-12 h-12 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 font-bold">
            <Send className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">3. Direct 1-on-1 Messaging</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Requesters and donors can chat privately, exchange location details, coordinate hospital arrivals, and pledge support.
          </p>
        </div>
      </div>

      {/* Impact Card */}
      <div className="bg-white p-8 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xs">
        <div className="space-y-2 text-left">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-xs uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Instant Community Response</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900">Ready to help or post a need?</h3>
          <p className="text-xs text-slate-600 max-w-xl">
            Join thousands of active donors across regions. Register your account to receive automated alert notifications when someone needs your blood type.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={onOpenAuth}
            className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all cursor-pointer"
          >
            Log In / Sign Up
          </button>
          <button
            onClick={onOpenRegister}
            className="bg-rose-700 hover:bg-rose-800 text-white px-6 py-3 rounded-xl text-xs font-bold cursor-pointer shadow-sm shadow-rose-700/20"
          >
            Become a Donor
          </button>
        </div>
      </div>
    </div>
  );
};
