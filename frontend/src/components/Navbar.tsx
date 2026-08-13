"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Droplet, LogIn, User, LogOut, UserCheck, Home, MessageSquare, Bot, Users, ShieldAlert } from "lucide-react";
import { User as UserType } from "@/services/api";

export type NavTab = "home" | "feed" | "messages" | "ai" | "registry" | "logs";

interface NavbarProps {
  activeTab: NavTab;
  setActiveTab: (tab: NavTab) => void;
  currentUser: UserType | null;
  onOpenAuth?: () => void;
  onOpenRegister?: () => void;
  onLogout?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode }[] = [
    { id: "home", label: "Home", icon: <Home className="w-5 h-5" /> },
    { id: "messages", label: "Messages", icon: <MessageSquare className="w-5 h-5" /> },
    { id: "ai", label: "Emergency AI", icon: <Bot className="w-5 h-5" /> },
    { id: "registry", label: "Registry", icon: <Users className="w-5 h-5" /> },
    { id: "logs", label: "Audit Logs", icon: <ShieldAlert className="w-5 h-5" /> },
  ];

  return (
    <>
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Brand Logo Header */}
          <div className="flex items-center gap-2.5 cursor-pointer shrink-0" onClick={() => setActiveTab("home")}>
            <div className="w-9 h-9 rounded-full bg-rose-700 flex items-center justify-center text-white shadow-sm shadow-rose-700/30">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <div>
              <span className="font-extrabold text-lg sm:text-xl tracking-tight text-rose-700 block leading-none">
                Smart Blood Hub
              </span>
              <span className="text-[9px] sm:text-[10px] text-slate-500 font-semibold tracking-tight block mt-0.5">
                AI Emergency Network
              </span>
            </div>
          </div>

          {/* Desktop Center Navigation Links */}
          <nav className="hidden md:flex items-center gap-6 lg:gap-8">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`py-2 text-sm font-semibold transition-all relative cursor-pointer ${
                  activeTab === item.id
                    ? "text-rose-700 font-bold border-b-2 border-rose-700"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Action Profile / Login */}
          <div className="flex items-center gap-3 relative">
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="w-9 h-9 rounded-full bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 shadow-xs"
                  title={`Logged in as ${currentUser.name}`}
                >
                  <User className="w-5 h-5" />
                </button>

                {/* User Dropdown Menu */}
                {isDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-slate-200 shadow-xl p-3 space-y-2 z-50 animate-fade-in">
                    <Link
                      href="/profile"
                      onClick={() => setIsDropdownOpen(false)}
                      className="block p-2.5 rounded-xl hover:bg-rose-50/60 border-b border-slate-100 transition-all cursor-pointer group"
                      title="Click to view & edit your profile"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-xs text-slate-900 group-hover:text-rose-700 transition-colors truncate">
                          {currentUser.name}
                        </p>
                        <UserCheck className="w-3.5 h-3.5 text-slate-400 group-hover:text-rose-600 transition-colors" />
                      </div>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{currentUser.email}</p>
                      <div className="mt-1.5 flex items-center gap-1">
                        <span className="px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 font-bold text-[10px]">
                          {currentUser.blood_group || "O+"} Donor
                        </span>
                      </div>
                    </Link>

                    <button
                      onClick={() => {
                        setIsDropdownOpen(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition-all cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Log Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-700/20 flex items-center gap-1.5"
              >
                <LogIn className="w-4 h-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar (Visible on mobile/tablet screens < 768px) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-t border-slate-200 py-1.5 px-2 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center gap-0.5 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
                isActive
                  ? "text-rose-700 font-bold bg-rose-50/80"
                  : "text-slate-500 hover:text-slate-900 font-medium"
              }`}
            >
              {item.icon}
              <span className="text-[10px] tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
