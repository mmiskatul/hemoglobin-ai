"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Droplet,
  User,
  Mail,
  Phone,
  MapPin,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Heart,
  Edit3,
  Save,
  Activity,
  Sparkles,
} from "lucide-react";
import { api } from "@/services/api";
import { LocationSelector } from "@/components/LocationSelector";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export default function ProfilePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [userId, setUserId] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("O+");
  const [location, setLocation] = useState("Sylhet Sadar, Sylhet");
  const [role, setRole] = useState("Donor");
  const [isAvailable, setIsAvailable] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [isVerified, setIsVerified] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [cloudinaryNotice, setCloudinaryNotice] = useState<string | null>(null);

  const fetchProfile = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getUserProfileDetail(id);
      setName(data.name || "");
      setEmail(data.email || "");
      setPhone(data.phone || "");
      setBloodGroup(data.blood_group || "O+");
      setLocation(data.location || "Sylhet Sadar, Sylhet");
      setRole(data.role || "Donor");
      setIsAvailable(data.is_available ?? true);
      setAvatarUrl(data.avatar_url || "");
      setBio(data.bio || "");
      setIsVerified(data.is_verified ?? true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load profile details";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      const storedUserStr = localStorage.getItem("auth_user");
      if (!storedUserStr) {
        router.push("/register");
        return;
      }
      try {
        const storedUser = JSON.parse(storedUserStr);
        const id = storedUser.id || 1;
        setUserId(id);
        fetchProfile(id);
      } catch {
        router.push("/register");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    setError(null);
    setCloudinaryNotice(null);

    try {
      const res = await api.uploadAvatar(file);
      setAvatarUrl(res.url);
      setCloudinaryNotice(
        res.provider === "Cloudinary"
          ? "🎉 Profile picture uploaded directly to Cloudinary!"
          : "✨ Avatar image uploaded successfully!"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Avatar upload failed. Please try again.";
      setError(msg);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const payload = {
        name,
        phone,
        location,
        blood_group: bloodGroup,
        is_available: isAvailable,
        avatar_url: avatarUrl,
        bio,
      };

      const res = await api.updateUserProfileDetail(userId, payload);
      setSuccessMsg("🎉 Profile updated successfully!");

      // Update localStorage auth_user item
      const storedUserStr = localStorage.getItem("auth_user");
      if (storedUserStr) {
        const parsed = JSON.parse(storedUserStr);
        const updatedUser = { ...parsed, ...res };
        localStorage.setItem("auth_user", JSON.stringify(updatedUser));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save profile changes.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-rose-700">
          <Loader2 className="w-10 h-10 animate-spin" />
          <span className="text-sm font-bold tracking-tight">Loading Profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-rose-50/20 font-sans flex flex-col justify-between">
      {/* Navbar Header */}
      <header className="bg-white/90 backdrop-blur-md border-b border-slate-200 py-4 px-6 lg:px-12 sticky top-0 z-20 shadow-sm">
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
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 lg:p-12 space-y-8">
        {/* Banner Hero Card */}
        <div className="relative bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 rounded-3xl p-8 text-white shadow-xl overflow-hidden border border-slate-800">
          <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
            {/* Avatar Container with Cloudinary Upload */}
            <div className="relative group shrink-0">
              <div className="w-28 h-28 rounded-full border-4 border-white/20 bg-slate-800 flex items-center justify-center overflow-hidden shadow-lg relative">
                {avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={avatarUrl}
                    alt={name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-tr from-rose-700 to-rose-500 flex items-center justify-center text-white text-3xl font-black">
                    {name ? name.slice(0, 2).toUpperCase() : "SB"}
                  </div>
                )}

                {uploadingAvatar && (
                  <div className="absolute inset-0 bg-slate-900/80 flex items-center justify-center text-white">
                    <Loader2 className="w-7 h-7 animate-spin text-rose-400" />
                  </div>
                )}
              </div>

              {/* Upload Trigger Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Change Avatar via Cloudinary"
                className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-md border-2 border-white cursor-pointer transition-all hover:scale-110"
              >
                <Camera className="w-4 h-4" />
              </button>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFileChange}
                className="hidden"
              />
            </div>

            {/* User Metadata */}
            <div className="text-center md:text-left space-y-2 flex-1">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight">{name || "User Profile"}</h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Hero
                  </span>
                )}
              </div>

              <p className="text-xs text-slate-300 flex items-center justify-center md:justify-start gap-1.5">
                <Mail className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                <span>{email}</span>
              </p>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 pt-2">
                <span className="bg-rose-600/90 text-white font-extrabold text-xs px-3 py-1 rounded-xl shadow-sm flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 fill-white" /> {bloodGroup} Blood Group
                </span>

                <span className="bg-slate-800 text-slate-200 font-bold text-xs px-3 py-1 rounded-xl border border-slate-700 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> {role} Profile
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Feedback Alerts */}
        {cloudinaryNotice && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cloudinaryNotice}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Profile Settings Form */}
        <form onSubmit={handleSaveProfile} className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm space-y-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-rose-600" />
                Edit Profile Details
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Update your contact details, location, blood group, and donor availability status.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Full Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Email (Readonly) */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Email Address (Verified)</label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl pl-10 pr-4 py-3 text-xs cursor-not-allowed"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+8801700000000"
                  className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            {/* Blood Group Selector */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none font-bold"
              >
                {BLOOD_GROUPS.map((bg) => (
                  <option key={bg} value={bg}>
                    {bg} Blood Type
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Cascading 4-Level Location Selector */}
          <div className="space-y-2 pt-2">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-rose-600" />
              <span>Location (Division ➔ District ➔ Upazila ➔ Union/Ward)</span>
            </label>
            <LocationSelector
              onLocationChange={(val: string) => setLocation(val)}
            />
          </div>

          {/* Bio / Hero Statement */}
          <div className="space-y-1 pt-2">
            <label className="text-xs font-bold text-slate-700 block">About Me / Hero Statement</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell fellow heroes and emergency requesters about your availability..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-rose-500 rounded-xl px-4 py-3 text-xs text-slate-900 focus:outline-none"
            />
          </div>



          {/* Active Donor Availability Toggle */}
          <div className="p-5 bg-rose-50/50 border border-rose-200/80 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-600" />
                <span className="text-xs font-extrabold text-slate-900">
                  Ready &amp; Available for Emergency Blood Requests
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                When enabled, the AI emergency matching engine can contact you directly via email when blood is needed in {location}.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-4">
              <input
                type="checkbox"
                checked={isAvailable}
                onChange={(e) => setIsAvailable(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-600"></div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Link
              href="/"
              className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 font-bold text-xs transition-colors"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={saving}
              className="bg-rose-700 hover:bg-rose-800 disabled:opacity-50 text-white font-bold px-7 py-3 rounded-xl text-xs flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-rose-200 hover:-translate-y-0.5 active:translate-y-0"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Profile...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Profile Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Footer */}
      <footer className="py-6 px-6 text-center text-xs text-slate-400 border-t border-slate-100">
        &copy; 2024 Smart Blood Hub. AI Emergency Network &amp; Registry.
      </footer>
    </div>
  );
}
