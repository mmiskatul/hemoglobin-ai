"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Droplet, Mail, Lock, User, UserPlus, ArrowLeft, Phone } from "lucide-react";
import { api } from "@/services/api";
import { LocationSelector } from "@/components/LocationSelector";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [phone, setPhone] = useState("");
  const [location, setLocation] = useState("Sylhet Sadar, Sylhet");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await api.registerUser({
        name,
        email,
        password,
        blood_group: bloodGroup,
        location,
        phone: phone || "+8801700000000",
      });

      if (res.requires_verification) {
        // Redirect to the clean verification page with email only
        const params = new URLSearchParams({ email: res.email || email });
        router.push(`/verify?${params.toString()}`);
      } else {
        router.push("/");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Registration failed. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 lg:px-12">
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

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-6 py-12">
        <div className="bg-white max-w-3xl w-full p-8 lg:p-12 rounded-3xl border border-slate-200 shadow-sm space-y-8">
          {/* Header text */}
          <div className="text-center space-y-2 max-w-xl mx-auto">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-700 mx-auto">
              <UserPlus className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Create Your Account</h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Join the AI Emergency Network &amp; Registry as a Donor, Requester, or Hospital.
            </p>
          </div>

          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-bold text-center">
              ?? {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 2-Column Grid Layout for Personal Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Miskatul Masabi"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

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

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Phone Number</label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +8801711000000"
                    className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Blood Group</label>
                <select
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-3 py-3 text-xs text-slate-900 focus:outline-none"
                >
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading Bangladesh Location Selector */}
            <div className="p-5 bg-slate-50/70 rounded-2xl border border-slate-200 space-y-3">
              <h4 className="font-bold text-xs text-slate-800">Select Specific Location</h4>
              <LocationSelector onLocationChange={(formatted) => setLocation(formatted)} />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-rose-700 hover:bg-rose-800 text-white font-bold py-4 rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer transition-all shadow-sm"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account &amp; Send Verification Email</span>
                </>
              )}
            </button>
          </form>

          {/* Toggle link to login page */}
          <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
            <span>Already have an account? </span>
            <Link href="/login" className="font-bold text-rose-700 hover:underline">
              Log In
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
