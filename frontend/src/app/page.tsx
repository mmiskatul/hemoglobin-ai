"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navbar, NavTab } from "@/components/Navbar";
import { SocialFeed } from "@/components/SocialFeed";
import { DirectMessages } from "@/components/DirectMessages";
import { AIChat } from "@/components/AIChat";
import { DonorRegistry } from "@/components/DonorRegistry";
import { NotificationFeed } from "@/components/NotificationFeed";
import { RegisterModal } from "@/components/RegisterModal";
import { User as UserType } from "@/services/api";

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<NavTab>("home");
  const [isRegisterOpen, setIsRegisterOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [selectedChatPartner, setSelectedChatPartner] = useState<{ id: number; name: string } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const stored = localStorage.getItem("auth_user");
        if (stored) {
          setCurrentUser(JSON.parse(stored));
        }
      } catch {
        // ignore
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setCurrentUser(null);
    router.push("/login");
  };

  // Scroll to top when switching tabs
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [activeTab]);

  const handleSelectUserToChat = (userId: number, userName: string) => {
    setSelectedChatPartner({ id: userId, name: userName });
    setActiveTab("messages");
  };

  const handleOpenAuth = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 text-slate-900 font-sans">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onOpenAuth={handleOpenAuth}
        onOpenRegister={() => router.push("/register")}
        onLogout={handleLogout}
      />

      {/* Main Page Container */}
      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-6 pb-20 md:pb-6 flex-1 w-full space-y-6">
        {/* Tab Content Views */}
        <div className="transition-all duration-300">
          {activeTab === "home" && (
            <SocialFeed
              currentUser={currentUser}
              onOpenAuth={handleOpenAuth}
              onSelectUserToChat={handleSelectUserToChat}
            />
          )}

          {activeTab === "messages" && (
            <DirectMessages
              currentUser={currentUser}
              selectedContact={selectedChatPartner}
              onOpenAuth={handleOpenAuth}
            />
          )}

          {activeTab === "ai" && (
            <AIChat currentUser={currentUser} onOpenAuth={handleOpenAuth} />
          )}

          {activeTab === "registry" && (
            <DonorRegistry onOpenRegister={() => setIsRegisterOpen(true)} />
          )}

          {activeTab === "logs" && <NotificationFeed />}
        </div>
      </main>

      {/* Donor Registration Modal */}
      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSuccess={() => {
          setActiveTab("registry");
        }}
      />

      {/* Footer matching reference design */}
      <footer className="border-t border-slate-200 bg-white py-6 px-4 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div>
            &copy; 2024 Smart Blood Hub. AI Emergency Network & Registry.
          </div>

          <div className="flex items-center gap-6 font-medium">
            <a href="#" className="hover:text-rose-700 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-rose-700 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-rose-700 transition-colors">Contact Us</a>
            <a href="#" className="hover:text-rose-700 transition-colors">Help Center</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
