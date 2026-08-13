"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Droplet, ArrowLeft, Mail, KeyRound, Loader2, Copy, Check, ArrowRight } from "lucide-react";
import { api } from "@/services/api";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetCode, setResetCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.forgotPassword(email);
      setResetCode(res.otp_demo);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to find account. Please check your email.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = async () => {
    if (!resetCode) return;
    await navigator.clipboard.writeText(resetCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleContinue = () => {
    const params = new URLSearchParams({ email });
    if (resetCode) params.set("code", resetCode);
    router.push(`/reset-password?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/80 py-4 px-6 lg:px-12 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-rose-700 flex items-center justify-center text-white shadow-sm">
              <Droplet className="w-5 h-5 fill-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-rose-700">Smart Blood Hub</span>
          </Link>
          <Link href="/login" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-16 relative">
        {/* Background blobs */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-rose-100/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/3 w-64 h-64 bg-slate-100/50 rounded-full blur-3xl" />
        </div>

        <div className="bg-white/90 backdrop-blur-md max-w-md w-full p-8 lg:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100 space-y-7">

          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-rose-700 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">1</span>
              </div>
              <span className="text-xs font-bold text-rose-700">Find Account</span>
            </div>
            <div className="h-px w-8 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${resetCode ? "bg-rose-700 border-rose-700" : "bg-slate-100 border-slate-200"}`}>
                <span className={`text-[10px] font-black ${resetCode ? "text-white" : "text-slate-400"}`}>2</span>
              </div>
              <span className={`text-xs font-bold ${resetCode ? "text-rose-700" : "text-slate-400"}`}>Get Code</span>
            </div>
            <div className="h-px w-8 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 text-[10px] font-black">3</span>
              </div>
              <span className="text-xs font-bold text-slate-400">New Password</span>
            </div>
          </div>

          {/* Icon + Title */}
          <div className="text-center space-y-2">
            <div className="relative mx-auto w-14 h-14">
              <div className="absolute inset-0 rounded-2xl bg-rose-100 blur-lg opacity-60" />
              <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shadow-sm">
                <KeyRound className="w-7 h-7" />
              </div>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Forgot Password?</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
              {resetCode
                ? "Your reset code is ready. Use it on the next step to set a new password."
                : "Enter the email address linked to your account and we will generate a reset code."}
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold text-center">
              {error}
            </div>
          )}

          {/* STEP 1: Email Form */}
          {!resetCode && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md shadow-rose-200 hover:-translate-y-0.5 active:translate-y-0"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>Searching...</span></>
                ) : (
                  <><KeyRound className="w-4 h-4" /><span>Send Reset Code</span></>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Reset Code Display */}
          {resetCode && (
            <div className="space-y-5">
              {/* Prominent Code Card */}
              <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/60 p-6 text-center space-y-3 shadow-sm">
                <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Your Password Reset Code</p>
                <div className="text-4xl font-black tracking-[0.3em] text-rose-700 font-mono select-all">
                  {resetCode}
                </div>
                <p className="text-xs text-rose-500">Click the code to select and copy it</p>
                <button
                  type="button"
                  onClick={copyCode}
                  className="inline-flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>

              {/* Info Note */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-600 text-xs text-center leading-relaxed">
                This code is valid for one use only. Have it ready for the next step.
              </div>

              {/* Continue Button */}
              <button
                type="button"
                onClick={handleContinue}
                className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md shadow-rose-200 hover:-translate-y-0.5"
              >
                <ArrowRight className="w-4 h-4" />
                <span>Continue to Reset Password</span>
              </button>

              {/* Try different email */}
              <button
                type="button"
                onClick={() => setResetCode(null)}
                className="w-full text-xs text-slate-500 hover:text-rose-700 font-medium transition-colors cursor-pointer"
              >
                Try a different email address
              </button>
            </div>
          )}

          {/* Footer link */}
          {!resetCode && (
            <div className="text-center text-xs text-slate-500 border-t border-slate-100 pt-4">
              Remember your password?{" "}
              <Link href="/login" className="font-bold text-rose-700 hover:underline">
                Log In
              </Link>
            </div>
          )}
        </div>
      </main>

      <footer className="py-6 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
        &copy; 2024 Smart Blood Hub. AI Emergency Network &amp; Registry.
      </footer>
    </div>
  );
}