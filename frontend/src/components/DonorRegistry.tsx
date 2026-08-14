"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Search, MapPin, Phone, Mail, Droplet, UserPlus, Trash2, Power, RefreshCw, X } from "lucide-react";
import { api, DonorResponse } from "@/services/api";

interface DonorRegistryProps {
  onOpenRegister: () => void;
}

const BLOOD_GROUPS = ["ALL", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

export const DonorRegistry: React.FC<DonorRegistryProps> = ({ onOpenRegister }) => {
  const [donors, setDonors] = useState<DonorResponse[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>("ALL");
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const fetchDonors = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(null);
    try {
      const res = await api.listDonors(selectedGroup, locationSearch);
      setDonors(res.donors || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load donors";
      setError(msg);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [selectedGroup, locationSearch]);

  useEffect(() => {
    fetchDonors(true);
    const timer = setInterval(() => {
      fetchDonors(false);
    }, 5000);
    return () => clearInterval(timer);
  }, [fetchDonors]);

  const handleToggleAvailability = async (donorId: number, currentName: string) => {
    setActionLoading(true);
    try {
      const res = await api.toggleDonorAvailability(donorId);
      setNotice(`⚡ Availability updated for ${currentName}: ${res.donor.is_available ? "Available Now" : "Busy"}`);
      await fetchDonors(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to toggle status";
      setError(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleDeleteDonor = async (donorId: number, name: string) => {
    if (!confirm(`Are you sure you want to remove donor '${name}' from the registry?`)) return;
    setActionLoading(true);
    try {
      const res = await api.deleteDonor(donorId);
      setNotice(`🗑️ ${res.message}`);
      await fetchDonors(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to remove donor";
      setError(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notice Toast */}
      {notice && (
        <div className="p-3 px-4 glass-panel bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Header Bar */}
      <div className="glass-panel p-4 lg:p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-white text-lg flex items-center gap-2">
                <Droplet className="w-5 h-5 text-rose-500 fill-rose-500" />
                <span>Verified Donor Registry</span>
              </h3>
              <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">Search and locate active blood donors with real-time status management</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchDonors(true)}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Registry"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onOpenRegister}
              className="red-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white flex items-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Register New Donor</span>
            </button>
          </div>
        </div>

        {/* Filters Controls */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Blood Group Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 md:pb-0 scrollbar-none">
            {BLOOD_GROUPS.map((bg) => (
              <button
                key={bg}
                onClick={() => setSelectedGroup(bg)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  selectedGroup === bg
                    ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                    : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                }`}
              >
                {bg}
              </button>
            ))}
          </div>

          {/* Location Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={locationSearch}
              onChange={(e) => setLocationSearch(e.target.value)}
              placeholder="Search by city or area..."
              className="w-full bg-slate-950/80 border border-white/10 focus:border-rose-500/50 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Registry Grid */}
      {loading && donors.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm glass-panel rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-rose-500 border-t-transparent animate-spin mx-auto mb-3" />
          <span>Fetching matching registered donors...</span>
        </div>
      ) : error ? (
        <div className="p-6 glass-panel rounded-2xl border border-rose-500/30 text-center text-rose-400 text-sm">
          ⚠️ {error}
        </div>
      ) : donors.length === 0 ? (
        <div className="p-12 glass-panel rounded-2xl border border-white/10 text-center space-y-3">
          <Droplet className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-base">No Donors Match Your Search Criteria</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Try adjusting your blood type filter or location search. Alternatively, register as a new donor!
          </p>
          <button
            onClick={onOpenRegister}
            className="red-glow-btn px-4 py-2 rounded-xl text-xs font-bold text-white inline-flex items-center gap-2 cursor-pointer mt-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Be the First Donor</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {donors.map((d) => (
            <div
              key={d.id}
              className="glass-panel glass-panel-hover p-5 rounded-2xl space-y-4 flex flex-col justify-between border border-white/10 relative group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="font-bold text-white text-base">{d.name}</h4>
                  <div className="flex items-center gap-1 text-slate-400 text-xs mt-1">
                    <MapPin className="w-3.5 h-3.5 text-rose-400" />
                    <span>{d.location}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-red-500 text-white font-extrabold text-sm shadow-md shadow-rose-600/30">
                    {d.blood_group}
                  </span>
                  <button
                    onClick={() => handleToggleAvailability(d.id, d.name)}
                    disabled={actionLoading}
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 cursor-pointer transition-all ${
                      d.is_available
                        ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40"
                        : "bg-slate-500/20 hover:bg-slate-500/30 text-slate-400 border border-slate-500/40"
                    }`}
                    title="Click to toggle live donor availability"
                  >
                    <Power className="w-3 h-3" />
                    <span>{d.is_available ? "Available Now" : "Busy"}</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 space-y-2 text-xs text-slate-300">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" /> Phone:
                  </span>
                  <span className="font-medium text-white">{d.phone}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> Email:
                  </span>
                  <span className="font-medium text-white truncate max-w-[160px]">{d.email}</span>
                </div>
              </div>

              {/* Delete Donor Action Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => handleDeleteDonor(d.id, d.name)}
                  disabled={actionLoading}
                  className="text-[11px] text-slate-500 hover:text-rose-400 flex items-center gap-1 transition-colors cursor-pointer"
                  title="Remove donor profile"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove Profile</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
