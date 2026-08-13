"use client";

import React, { useEffect, useState } from "react";
import { Users, Send, ShieldCheck, Zap } from "lucide-react";
import { api, OverviewStats } from "@/services/api";

interface HeroStatsProps {
  totalDonors: number;
  totalLogs: number;
}

export const HeroStats: React.FC<HeroStatsProps> = ({ totalDonors, totalLogs }) => {
  const [stats, setStats] = useState<OverviewStats | null>(null);

  const fetchLiveStats = async () => {
    try {
      const data = await api.getOverviewStats();
      setStats(data);
    } catch {
      // Fallback
    }
  };

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLiveStats();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const displayDonors = stats ? stats.total_donors : totalDonors;
  const displayDispatches = stats ? stats.total_dispatched : totalLogs;
  const availableDonors = stats ? stats.available_donors : 0;
  const successRate = stats ? `${stats.success_rate}%` : "100%";

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      <div className="bg-white p-4 lg:p-5 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700">
          <Users className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-slate-500 font-medium">Registered Donors</p>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 badge-pulse" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">{displayDonors}</h4>
          <p className="text-[10px] text-emerald-600 font-bold">{availableDonors} Available Now</p>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-5 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700">
          <Send className="w-6 h-6" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className="text-xs text-slate-500 font-medium">Dispatched Alerts</p>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500 badge-pulse" />
          </div>
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">{displayDispatches}</h4>
          <p className="text-[10px] text-purple-700 font-bold">Real-Time Audited</p>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-5 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
        <div className="p-3 rounded-xl bg-cyan-50 border border-cyan-100 text-cyan-700">
          <Zap className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Dispatch Speed</p>
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">&lt; 0.8s</h4>
          <p className="text-[10px] text-cyan-700 font-bold">Instant Alert Trigger</p>
        </div>
      </div>

      <div className="bg-white p-4 lg:p-5 rounded-2xl flex items-center gap-4 border border-slate-200 shadow-xs hover:border-rose-300 transition-all">
        <div className="p-3 rounded-xl bg-purple-50 border border-purple-100 text-purple-700">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium">Success Delivery</p>
          <h4 className="text-2xl font-black text-slate-900 tracking-tight">{successRate}</h4>
          <p className="text-[10px] text-emerald-600 font-bold">Encrypted Protocol</p>
        </div>
      </div>
    </div>
  );
};
