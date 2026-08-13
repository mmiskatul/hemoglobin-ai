"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Droplet, Mail, Lock, LogIn, ArrowLeft, ShieldAlert } from "lucide-react";
import { api } from "@/services/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unverified, setUnverified] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setUnverified(false);

    try {
      const res = await api.loginUser({ email, password });
      // Store token + user
      if (res.token) localStorage.setItem("auth_token", res.token);
      if (res.user) localStorage.setItem("auth_user", JSON.stringify(res.user));
      router.push("/");
    } catch (err: unknown) {
      const msg: string = err instanceof Error ? err.message : "Invalid credentials. Please try again.";
      // Detect unverified account error from the backend
      if (msg.toLowerCase().includes("not verified") || msg.toLowerCase().includes("otp")) {
        setUnverified(true);
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoVerify = () => {
    const params = new URLSearchParams({ email });
    router.push(`/verify?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-rose-700 flex items-center justify-center text-white shadow-sm">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-rose-700">
              Smart Blood Hub
            </span>
          </Link>

          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      {/* Main Login Form Container */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="bg-white max-w-md w-full p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          {/* Header text */}
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mx-auto">
              <LogIn className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Log In to Your Account</h1>
            <p className="text-xs text-slate-500">
              Access emergency posts, direct messages, and real-time donor dispatches.
            </p>
          </div>

          {/* Unverified Account Banner */}
          {unverified && (
            <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl space-y-3">
              <div className="flex items-start gap-3">
                <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-amber-800">Account Not Yet Verified</p>
                  <p className="text-xs text-amber-700 mt-0.5">
                    Your account needs email verification before you can log in.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGoVerify}
                className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                Verify My Email Now
              </button>
            </div>
          )}

          {error && !unverified && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-center">
              ?? {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-bold text-rose-700 hover:underline"
              >
                Forgot Password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-3.5 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Log In</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle link to register page */}
          <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
            <span>Don&apos;t have an account? </span>
            <Link href="/register" className="font-bold text-rose-700 hover:underline">
              Create Account
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-6 text-center text-xs text-slate-500">
        &copy; 2024 Smart Blood Hub. AI Emergency Network &amp; Registry.
      </footer>
    </div>
  );
}
