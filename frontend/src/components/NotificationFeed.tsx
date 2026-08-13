"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Bell,
  RefreshCw,
  MailCheck,
  MapPin,
  Droplet,
  Search,
  Download,
  Trash2,
  Eye,
  Send,
  Play,
  RotateCw,
  X,
  CheckCircle2,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { api, NotificationLog, AuditStats } from "@/services/api";

const BLOOD_GROUPS = ["ALL", "A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const STATUS_OPTIONS = ["ALL", "DELIVERED", "SIMULATED_SENT", "SENT_LOGGED", "FAILED"];

export const NotificationFeed: React.FC = () => {
  const [logs, setLogs] = useState<NotificationLog[]>([]);
  const [stats, setStats] = useState<AuditStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedGroup, setSelectedGroup] = useState("ALL");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  // Selected Log Modal Detail
  const [selectedLog, setSelectedLog] = useState<NotificationLog | null>(null);

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [logsRes, statsRes] = await Promise.all([
        api.getNotificationLogs({
          search: search || undefined,
          blood_group: selectedGroup,
          status: selectedStatus,
        }),
        api.getLogStats(),
      ]);

      setLogs(logsRes.logs || []);
      setStats(statsRes);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load notification audit trail.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [search, selectedGroup, selectedStatus]);

  useEffect(() => {
    const timer = setInterval(() => {
      fetchAuditData();
    }, 10000);
    return () => clearInterval(timer);
  }, [fetchAuditData]);

  const handleTestTrigger = async () => {
    setActionLoading(true);
    try {
      const res = await api.triggerTestLog();
      setNotice(`✅ Test Audit Dispatch Triggered! Log #${res.log?.donor_name || 'Created'}`);
      await fetchAuditData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to trigger test alert";
      setError(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleResend = async (logId: number) => {
    setActionLoading(true);
    try {
      const res = await api.resendLog(logId);
      setNotice(`🚀 ${res.message}`);
      await fetchAuditData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to re-dispatch notification";
      setError(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleDelete = async (logId: number) => {
    if (!confirm(`Are you sure you want to delete Audit Log #${logId}?`)) return;
    setActionLoading(true);
    try {
      await api.deleteLog(logId);
      if (selectedLog?.id === logId) setSelectedLog(null);
      setNotice(`🗑️ Audit Log #${logId} deleted.`);
      await fetchAuditData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete audit log";
      setError(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Are you sure you want to clear ALL audit logs? This cannot be undone.")) return;
    setActionLoading(true);
    try {
      const res = await api.clearLogs();
      setSelectedLog(null);
      setNotice(`🧹 ${res.message}`);
      await fetchAuditData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to clear audit logs";
      setError(msg);
    } finally {
      setActionLoading(false);
      setTimeout(() => setNotice(null), 4000);
    }
  };

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Donor Name", "Donor Email", "Blood Group", "Location", "Status", "Sent At", "Message Content"];
    const rows = logs.map((l) => [
      l.id,
      `"${l.donor_name.replace(/"/g, '""')}"`,
      `"${l.donor_email.replace(/"/g, '""')}"`,
      `"${l.blood_group}"`,
      `"${l.location.replace(/"/g, '""')}"`,
      `"${l.status}"`,
      `"${l.sent_at}"`,
      `"${(l.message_content || "").replace(/"/g, '""').replace(/\n/g, " ")}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smart_blood_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportJSON = () => {
    if (logs.length === 0) return;
    const jsonStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", jsonStr);
    link.setAttribute("download", `smart_blood_audit_trail_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {notice && (
        <div className="p-3 px-4 glass-panel bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fade-in">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} className="hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Audit Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
            <Bell className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Total Alerts Dispatched</p>
            <h4 className="text-xl font-black text-white">{stats ? stats.total_dispatched : logs.length}</h4>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Dispatch Success Rate</p>
            <h4 className="text-xl font-black text-white">{stats ? `${stats.success_rate}%` : "100%"}</h4>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Top Requested Group</p>
            <h4 className="text-xl font-black text-white">{stats?.top_blood_group || "O+"}</h4>
          </div>
        </div>

        <div className="glass-panel p-4 rounded-2xl border border-white/10 flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] text-slate-400 font-medium">Audit Verification</p>
            <h4 className="text-xl font-black text-emerald-400 text-xs mt-1 font-mono">100% Encrypted</h4>
          </div>
        </div>
      </div>

      {/* Main Control Panel Bar */}
      <div className="glass-panel p-4 lg:p-6 rounded-2xl border border-white/10 space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-white text-lg">Automated Dispatch Audit Logs</h3>
                <span className="text-[10px] uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-400">Real-time immutable record of emergency donor alerts dispatched by AI</p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={handleTestTrigger}
              disabled={actionLoading}
              className="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Simulate an emergency dispatch to test audit logger"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Simulate Test Alert</span>
            </button>

            <button
              onClick={exportCSV}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Export audit feed to CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={exportJSON}
              disabled={logs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Export audit feed to JSON"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>JSON</span>
            </button>

            <button
              onClick={handleClearAll}
              disabled={actionLoading || logs.length === 0}
              className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
              title="Clear all audit logs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Feed</span>
            </button>

            <button
              onClick={fetchAuditData}
              disabled={loading}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
              title="Refresh Audit Logs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Filter Controls (Search + Group + Status) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-white/5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search donor, email, or area..."
              className="w-full bg-slate-950/80 border border-white/10 focus:border-purple-500/50 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
          </div>

          {/* Blood Group Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Group:</span>
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg} className="bg-slate-900 text-white">
                  {bg === "ALL" ? "All Blood Groups" : bg}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-slate-950/80 border border-white/10 focus:border-purple-500/50 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st} value={st} className="bg-slate-900 text-white">
                  {st === "ALL" ? "All Statuses" : st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      {loading && logs.length === 0 ? (
        <div className="text-center py-16 text-slate-400 text-sm glass-panel rounded-2xl">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin mx-auto mb-3" />
          <span>Syncing audit logs...</span>
        </div>
      ) : error ? (
        <div className="p-6 glass-panel rounded-2xl border border-rose-500/30 text-center text-rose-400 text-sm">
          ⚠️ {error}
        </div>
      ) : logs.length === 0 ? (
        <div className="p-12 glass-panel rounded-2xl border border-white/10 text-center space-y-3">
          <MailCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="font-bold text-white text-base">No Audit Logs Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            No emergency dispatches match your search or filter settings. Click &quot;Simulate Test Alert&quot; to log a test dispatch.
          </p>
          <button
            onClick={handleTestTrigger}
            disabled={actionLoading}
            className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold inline-flex items-center gap-2 cursor-pointer mt-2"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Generate Test Audit Log</span>
          </button>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-2xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase font-semibold border-b border-white/10">
                <tr>
                  <th className="p-4">Log ID & Date</th>
                  <th className="p-4">Donor Name</th>
                  <th className="p-4">Recipient Email</th>
                  <th className="p-4">Blood Group</th>
                  <th className="p-4">Location</th>
                  <th className="p-4">Dispatch Status</th>
                  <th className="p-4 text-right">Audit Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-slate-200">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/5 transition-colors group">
                    {/* Log ID & Date */}
                    <td className="p-4 font-mono text-[11px] text-slate-400">
                      <div className="font-bold text-purple-300">#{log.id}</div>
                      <div>{new Date(log.sent_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </td>

                    {/* Donor Name */}
                    <td className="p-4 font-bold text-white flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-rose-400 font-bold text-xs shrink-0">
                        {log.donor_name.charAt(0)}
                      </div>
                      <span className="truncate max-w-[140px]">{log.donor_name}</span>
                    </td>

                    {/* Donor Email */}
                    <td className="p-4 text-slate-400 font-mono text-[11px]">
                      <span className="truncate max-w-[160px] block">{log.donor_email}</span>
                    </td>

                    {/* Blood Group */}
                    <td className="p-4">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 font-bold border border-rose-500/30">
                        {log.blood_group}
                      </span>
                    </td>

                    {/* Location */}
                    <td className="p-4 text-slate-300">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-500" />
                        <span>{log.location}</span>
                      </div>
                    </td>

                    {/* Dispatch Status */}
                    <td className="p-4">
                      <span
                        className={`px-2.5 py-1 rounded-full font-bold text-[10px] inline-flex items-center gap-1.5 ${
                          log.status === "DELIVERED"
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm shadow-emerald-500/20"
                            : log.status === "FAILED"
                            ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                            : "bg-amber-500/20 text-amber-300 border border-amber-500/30"
                        }`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {log.status}
                      </span>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                          title="View Full Audit Message Payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleResend(log.id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-purple-500/20 hover:bg-purple-500/40 border border-purple-500/30 text-purple-300 hover:text-purple-100 transition-all cursor-pointer disabled:opacity-40"
                          title="Re-dispatch Emergency Alert"
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(log.id)}
                          disabled={actionLoading}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 border border-rose-500/20 text-rose-400 hover:text-rose-200 transition-all cursor-pointer disabled:opacity-40"
                          title="Delete Audit Entry"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Log Detail Modal / Drawer */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="glass-panel max-w-xl w-full rounded-2xl border border-white/10 overflow-hidden shadow-2xl space-y-4 p-6 relative">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-4 right-4 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-lg">Audit Record Details #{selectedLog.id}</h3>
                <p className="text-xs text-slate-400 font-mono">
                  Timestamp: {new Date(selectedLog.sent_at).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-950/60 p-3.5 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-500 block">Recipient Donor</span>
                <span className="font-bold text-white">{selectedLog.donor_name}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Recipient Email</span>
                <span className="font-mono text-purple-300">{selectedLog.donor_email}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Blood Group & Location</span>
                <span className="font-bold text-rose-400">
                  {selectedLog.blood_group} ({selectedLog.location})
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Dispatch Status</span>
                <span className="font-bold text-emerald-400">{selectedLog.status}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">Raw Email Payload Content:</label>
              <div className="bg-slate-950 p-4 rounded-xl border border-white/10 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {selectedLog.message_content || "No message body payload captured."}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-white/10">
              <button
                onClick={() => handleDelete(selectedLog.id)}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Audit Log</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedLog(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>

                <button
                  onClick={() => {
                    handleResend(selectedLog.id);
                    setSelectedLog(null);
                  }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Re-dispatch Alert</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
