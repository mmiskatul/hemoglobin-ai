"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Droplet,
  ArrowLeft,
  ShieldCheck,
  RefreshCw,
  CheckCircle2,
  MailOpen,
  Loader2,
  Copy,
} from "lucide-react";
import { api } from "@/services/api";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";

  const [email, setEmail] = useState(emailParam);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setTimeout(() => {
      setCountdown((c) => {
        if (c <= 1) setCanResend(true);
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => { inputRefs.current[0]?.focus(); }, []);

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

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");
    if (otpString.length < 6) { setError("Please enter all 6 digits."); return; }
    setLoading(true);
    setError(null);
    try {
      const res = await api.verifyOTP({ email, otp: otpString });
      if (res.token) localStorage.setItem("auth_token", res.token);
      if (res.user) localStorage.setItem("auth_user", JSON.stringify(res.user));
      setVerified(true);
      setTimeout(() => router.push("/"), 2200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Invalid verification code. Please try again.";
      setError(msg);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setResendLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      await api.resendOTP(email);
      setSuccessMsg("A new 6-digit code has been sent to your email.");
      setCountdown(60);
      setCanResend(false);
      setOtp(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to resend. Please try again.";
      setError(msg);
    } finally {
      setResendLoading(false);
    }
  };

  if (verified) {
    return (
      <div className="flex flex-col items-center gap-6 text-center py-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
          <div className="relative w-20 h-20 rounded-full bg-emerald-50 border-2 border-emerald-400 flex items-center justify-center">
            <CheckCircle2 className="w-10 h-10 text-emerald-500" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Account Verified!</h2>
          <p className="text-sm text-slate-500">Welcome to Smart Blood Hub. Redirecting you to the dashboard...</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Redirecting...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      {/* Title */}
      <div className="text-center space-y-3">
        <div className="relative mx-auto w-16 h-16">
          <div className="absolute inset-0 rounded-2xl bg-rose-100 blur-lg opacity-60" />
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-50 to-rose-100 border border-rose-200 flex items-center justify-center text-rose-700 shadow-sm">
            <MailOpen className="w-8 h-8" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Check Your Email</h1>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed max-w-xs mx-auto">
            We sent a 6-digit verification code to{" "}
            <span className="font-bold text-slate-800 break-all">{email || "your email"}</span>.
            Enter it below to activate your account.
          </p>
        </div>
      </div>

      {/* Email notice */}
      <div className="flex items-center gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-700 text-xs">
        <MailOpen className="w-4 h-4 shrink-0" />
        <span>The code was sent to your inbox. Check your spam folder if you did not receive it.</span>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-start gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold text-center">
          {error}
        </div>
      )}

      {/* OTP Input Grid */}
      <form onSubmit={handleVerify} className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-3 px-1">
            <label className="text-xs font-bold text-slate-700">
              Enter Your 6-Digit Code
            </label>
            <button
              type="button"
              onClick={async () => {
                try {
                  const text = await navigator.clipboard.readText();
                  const digits = text.replace(/\D/g, "").slice(0, 6);
                  if (digits.length === 6) {
                    setOtp(digits.split(""));
                    setError(null);
                  }
                } catch {
                  // ignore
                }
              }}
              className="text-xs font-bold text-rose-700 hover:text-rose-800 flex items-center gap-1.5 p-1 px-2 rounded-lg bg-rose-50 border border-rose-200 transition-all cursor-pointer"
              title="1-Click Paste Code from Clipboard"
            >
              <Copy className="w-3.5 h-3.5 text-rose-700" />
              <span>Paste Code</span>
            </button>
          </div>
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
                  digit
                    ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm"
                    : "border-slate-200 focus:border-rose-400 focus:bg-white"
                } ${error ? "border-rose-300 bg-rose-50/30" : ""}`}
                aria-label={`Digit ${i + 1}`}
              />
            ))}
          </div>
        </div>

        {!emailParam && (
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-700 block">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@domain.com"
              className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={loading || otp.join("").length < 6}
          id="verify-otp-btn"
          className="w-full bg-rose-700 hover:bg-rose-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl text-sm flex items-center justify-center gap-2.5 cursor-pointer transition-all shadow-md shadow-rose-200 hover:-translate-y-0.5 active:translate-y-0"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /><span>Verifying...</span></>
          ) : (
            <><ShieldCheck className="w-4 h-4" /><span>Verify &amp; Activate Account</span></>
          )}
        </button>
      </form>

      {/* Resend + Edit */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
        <div>
          {canResend ? (
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading}
              id="resend-otp-btn"
              className="flex items-center gap-1.5 font-bold text-rose-700 hover:text-rose-900 transition-colors cursor-pointer disabled:opacity-60"
            >
              {resendLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Resend Code</span>
            </button>
          ) : (
            <span className="text-slate-400">
              Resend in <span className="font-bold text-slate-600 tabular-nums">{countdown}s</span>
            </span>
          )}
        </div>
        <Link href="/register" className="text-slate-500 hover:text-rose-700 font-medium transition-colors">
          Back to Register
        </Link>
      </div>
    </div>
  );
}

export default function VerifyPage() {
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
          <Link href="/" className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-rose-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Home</span>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-6 py-16 relative">
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-rose-100/30 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-slate-100/50 rounded-full blur-3xl" />
        </div>

        <div className="bg-white/90 backdrop-blur-md max-w-md w-full p-8 lg:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-100">
          <div className="flex items-center justify-center gap-2 mb-8">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <span className="text-xs font-bold text-emerald-600">Register</span>
            </div>
            <div className="h-px w-8 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-rose-700 flex items-center justify-center">
                <span className="text-white text-[10px] font-black">2</span>
              </div>
              <span className="text-xs font-bold text-rose-700">Verify Email</span>
            </div>
            <div className="h-px w-8 bg-slate-200" />
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200 flex items-center justify-center">
                <span className="text-slate-400 text-[10px] font-black">3</span>
              </div>
              <span className="text-xs font-bold text-slate-400">Dashboard</span>
            </div>
          </div>

          <Suspense fallback={
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
            </div>
          }>
            <VerifyForm />
          </Suspense>
        </div>
      </main>

      <footer className="py-6 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
        &copy; 2024 Smart Blood Hub. AI Emergency Network &amp; Registry.
      </footer>
    </div>
  );
}