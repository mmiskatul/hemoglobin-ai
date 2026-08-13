"use client";

import React, { useState, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Droplet, ArrowLeft, ShieldCheck, Lock, Eye, EyeOff,
  CheckCircle2, Loader2, KeyRound, Copy, Check
} from "lucide-react";
import { api } from "@/services/api";

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const codeParam = searchParams.get("code") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState<string[]>(() => {
    if (codeParam && codeParam.length === 6) {
      const digits = codeParam.split("").slice(0, 6);
      return [...digits, ...Array(6 - digits.length).fill("")];
    }
    return ["", "", "", "", "", ""];
  });
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Focus input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);
    if (digit && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const paste = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const newOtp = ["", "", "", "", "", ""];
    paste.split("").forEach((ch, i) => { if (i < 6) newOtp[i] = ch; });
    setOtp(newOtp);
    inputRefs.current[Math.min(paste.length, 5)]?.focus();
  };

  const copyCode = async () => {
    if (!codeParam) return;
    await navigator.clipboard.writeText(codeParam);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const passwordStrength = (pwd: string) => {
    if (pwd.length === 0) return null;
    if (pwd.length < 6) return { level: "weak", color: "bg-rose-400", label: "Too short" };
    if (pwd.length < 8) return { level: "fair", color: "bg-amber-400", label: "Fair" };
    if (/[A-Z]/.test(pwd) && /[0-9]/.test(pwd)) return { level: "strong", color: "bg-emerald-500", label: "Strong" };
    return { level: "good", color: "bg-sky-400", label: "Good" };
  };

  const strength = passwordStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) { setError("Please enter the full 6-digit reset code."); return; }
    if (newPassword !== confirmPassword) { setError("Passwords do not match."); return; }
    if (newPassword.length < 6) { setError("Password must be at least 6 characters."); return; }

    setLoading(true);
    setError(null);
    try {
      await api.resetPassword({ email, otp: otpString, new_password: newPassword });
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to reset password. Please try again.";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Success state
  if (success) {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-6">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Password Reset!</h2>
          <p className="text-sm text-slate-500">Your password has been updated. Redirecting to login...</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting to Login...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 w-full">
      {/* Title */}
      <div className="text-center space-y-2">
        <div className="relative mx-auto w-14 h-14">
          <div className="absolute inset-0 rounded-2xl bg-rose-100 blur-lg opacity-60" />
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shadow-sm">
            <Lock className="w-7 h-7" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Set New Password</h1>
          {email && (
            <p className="text-xs text-slate-500 mt-1">
              Resetting password for <span className="font-bold text-slate-800">{email}</span>
            </p>
          )}
        </div>
      </div>

      {/* Code reminder card */}
      {codeParam && (
        <div className="rounded-2xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100/60 p-4 flex items-center justify-between gap-3">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-rose-600 uppercase tracking-wider">Your Reset Code</p>
            <p className="text-2xl font-black tracking-[0.3em] text-rose-700 font-mono select-all">{codeParam}</p>
          </div>
          <button
            type="button"
            onClick={copyCode}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-xl transition-all cursor-pointer shrink-0"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* OTP Input */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-3 text-center">
            Enter Your 6-Digit Reset Code
          </label>
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className={`w-11 h-14 text-center text-xl font-black rounded-xl border-2 bg-slate-50 text-slate-900 focus:outline-none transition-all duration-150 ${
                  digit ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm" : "border-slate-200 focus:border-rose-400 focus:bg-white"
                } ${error ? "border-rose-300 bg-rose-50/30" : ""}`}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {/* New Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showNew ? "text" : "password"}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Min. 6 characters"
              className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-10 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {/* Strength bar */}
          {strength && (
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${
                  strength.level === "weak" ? "w-1/4" : strength.level === "fair" ? "w-2/4" : strength.level === "good" ? "w-3/4" : "w-full"
                }`} />
              </div>
              <span className={`text-xs font-bold ${
                strength.level === "weak" ? "text-rose-500" : strength.level === "fair" ? "text-amber-500" : strength.level === "good" ? "text-sky-500" : "text-emerald-500"
              }`}>{strength.label}</span>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 block">Confirm New Password</label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type={showConfirm ? "text" : "password"}
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              className={`w-full bg-slate-50 border focus:outline-none rounded-xl pl-10 pr-10 py-3.5 text-xs text-slate-900 placeholder-slate-400 transition-colors ${
                confirmPassword && newPassword !== confirmPassword
                  ? "border-rose-300 bg-rose-50/30"
                  : confirmPassword && newPassword === confirmPassword
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-slate-200 focus:border-rose-500"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            {confirmPassword && newPassword === confirmPassword && (
              <CheckCircle2 className="w-4 h-4 absolute right-10 top-1/2 -translate-y-1/2 text-emerald-500" />
            )}
          </div>
        </div>

        {/* Email fallback */}
        {!emailParam && (
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.join("").length < 6 || newPassword.length < 6 || newPassword !== confirmPassword}
          className="w-full bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md shadow-rose-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Resetting Password...</span></>
          ) : (
            <><ShieldCheck className="w-4 h-4" /><span>Reset My Password</span></>
          )}
        </button>
      </form>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <Link href="/forgot-password" className="text-slate-500 hover:text-rose-700 font-medium transition-colors flex items-center gap-1">
          <KeyRound className="w-3.5 h-3.5" />
          Get New Code
        </Link>
        <Link href="/login" className="font-bold text-rose-700 hover:underline">
          Back to Login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/30 flex flex-col font-sans">
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
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-100/25 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-slate-100/50 rounded-full blur-3xl" />
        </div>

        <div className="bg-white/90 backdrop-blur-md max-w-md w-full p-8 lg:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100">
          {/* Step indicator */}
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-600">Find Account</span>
            </div>
            <div className="h-px w-8 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-600">Got Code</span>
            </div>
            <div className="h-px w-8 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-rose-700 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">3</span>
              </div>
              <span className="text-xs font-bold text-rose-700">New Password</span>
            </div>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          }>
            <ResetForm />
          </Suspense>
        </div>
      </main>

      <footer className="py-6 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
        &copy; 2024 Smart Blood Hub. AI Emergency Network &amp; Registry.
      </footer>
    </div>
  );
}