"use client";

import React, { useState } from "react";
import { X, LogIn, UserPlus, Lock, Mail, User } from "lucide-react";
import { api, User as UserType } from "@/services/api";
import { LocationSelector } from "@/components/LocationSelector";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserType) => void;
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [location, setLocation] = useState("Sylhet");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("Donor");

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (mode === "login") {
        const res = await api.loginUser({ email, password });
        onSuccess(res.user);
        onClose();
      } else {
        const res = await api.registerUser({
          name,
          email,
          password,
          blood_group: bloodGroup,
          location,
          phone: phone || "+8801700000000",
          role,
        });
        if (res.user) {
          onSuccess(res.user);
        }
        onClose();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Authentication failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white max-w-md w-full rounded-2xl border border-slate-200 overflow-hidden shadow-2xl space-y-6 p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="flex items-center justify-center gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => {
              setMode("login");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "login"
                ? "bg-rose-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            Log In
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              mode === "register"
                ? "bg-rose-700 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/50"
            }`}
          >
            Create Account
          </button>
        </div>

        <div className="text-center space-y-1">
          <h3 className="font-bold text-slate-900 text-xl">
            {mode === "login" ? "Welcome Back to Smart Blood Hub" : "Join the Emergency Donor Network"}
          </h3>
          <p className="text-xs text-slate-500">
            {mode === "login"
              ? "Log in to manage emergency posts, direct messages, and donation pledges."
              : "Register your profile to post needs and receive instant AI alert dispatches."}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold text-center">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Sarah Khan"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@domain.com"
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
              />
            </div>
          </div>

          {mode === "register" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Blood Group</label>
                  <select
                    value={bloodGroup}
                    onChange={(e) => setBloodGroup(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    {BLOOD_GROUPS.map((bg) => (
                      <option key={bg} value={bg}>
                        {bg}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none"
                  >
                    <option value="Donor">Donor</option>
                    <option value="Requester">Requester</option>
                    <option value="Hospital">Hospital</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801700..."
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>

              {/* Cascading Division -> District -> Upazila Location Selector */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                <LocationSelector onLocationChange={(formatted) => setLocation(formatted)} />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-rose-700 hover:bg-rose-800 py-3 rounded-xl font-bold text-white text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 mt-4 shadow-sm"
          >
            {loading ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : mode === "login" ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In to Account</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Create Network Account</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
