"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Search, RefreshCw, Eye, Trash2, Ban, CheckCircle,
  X, Users, ShieldAlert, ShieldCheck, Calendar,
  Phone, Mail, MapPin, BookOpen, AlertTriangle,
  Lock, IndianRupee, TrendingUp
} from "lucide-react";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const STATUS_STYLES = {
  pending:   "bg-yellow-900/40 text-yellow-400 border border-yellow-700/40",
  approved:  "bg-blue-900/40 text-blue-400 border border-blue-700/40",
  completed: "bg-green-900/40 text-green-400 border border-green-700/40",
  cancelled: "bg-zinc-800 text-zinc-400 border border-zinc-700",
  rejected:  "bg-red-900/40 text-red-400 border border-red-700/40",
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, accent = "#CC0000", sub }) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "linear-gradient(135deg,#1c1c1c,#161616)", border: "1px solid #2a2a2a" }}>
      <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10"
        style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#555" }}>{label}</span>
        <div className="p-1.5 rounded-lg" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none mt-1">{value}</p>
      {sub && <p className="text-xs" style={{ color: "#555" }}>{sub}</p>}
    </div>
  );
}

// ── Reset Password Modal ───────────────────────────────────────────────────────
function ResetPasswordModal({ user, onClose, onReset }) {
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving]           = useState(false);
  const [msg, setMsg]                 = useState("");

  const handleReset = async () => {
    if (newPassword.length < 6) { setMsg("Password must be at least 6 characters"); return; }
    setSaving(true); setMsg("");
    try {
      const res = await api.admin.resetUserPassword(user.id, newPassword);
      if (res.success) { setMsg("Password reset ✓"); setTimeout(onReset, 800); }
      else setMsg(res.message ?? "Error");
    } catch { setMsg("Network error"); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="w-full max-w-sm rounded-2xl shadow-2xl p-6"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}>
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="font-bold text-white text-sm">Reset Password</h3>
            <p className="text-xs mt-0.5" style={{ color: "#555" }}>
              For <span className="text-white font-semibold">{user.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" style={{ color: "#555" }} />
          </button>
        </div>
        <div className="mb-3">
          <label className="text-xs font-semibold mb-1.5 block" style={{ color: "#555" }}>New Password</label>
          <input type="text" value={newPassword} onChange={e => setNewPassword(e.target.value)}
            placeholder="Min 6 characters"
            className="w-full px-3 py-2 text-sm rounded-xl outline-none"
            style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", color: "#fff" }} />
        </div>
        {msg && (
          <p className={`text-xs font-semibold mb-3 ${msg.includes("✓") ? "text-emerald-400" : "text-red-400"}`}>{msg}</p>
        )}
        <button onClick={handleReset} disabled={saving}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-50"
          style={{ background: "#CC0000", color: "#fff" }}>
          {saving ? "Resetting..." : "Reset Password"}
        </button>
      </div>
    </div>
  );
}

// ── User Detail Modal ─────────────────────────────────────────────────────────
function UserModal({ user, onClose, onBlock, onUnblock, onDelete, onResetPassword }) {
  const [activeTab, setActiveTab] = useState("info");
  const bookings = user.bookings ?? [];

 const totalSpent = (user.bookings ?? []).reduce((s, b) => 
  s + parseFloat(b.final_amount || b.quote_amount || b.advance_amount || 0), 0);
  const completedCount = bookings.filter(b => b.status === "completed").length;
  const cancelledCount = bookings.filter(b => b.status === "cancelled").length;

  const fraudSignals = [];
  if (cancelledCount > 3)                                            fraudSignals.push(`High cancellations (${cancelledCount})`);
  if (bookings.length > 0 && cancelledCount / bookings.length > 0.5) fraudSignals.push("Cancel rate >50%");
  if (user.is_blocked)                                               fraudSignals.push("Currently blocked");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center rounded-t-2xl"
          style={{ background: "#111", borderBottom: "1px solid #222" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
              style={{ background: user.is_blocked ? "#2a0a0a" : "#1a0000", border: `1px solid ${user.is_blocked ? "#5a1a1a" : "#3a0000"}`, color: user.is_blocked ? "#f87171" : "#CC0000" }}>
              {user.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-white">{user.name}</h2>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1
                  ${user.is_blocked ? "text-red-400" : "text-emerald-400"}`}
                  style={{ background: user.is_blocked ? "#2a0a0a" : "#064e3b44", border: `1px solid ${user.is_blocked ? "#5a1a1a" : "#065f46"}` }}>
                  {user.is_blocked ? <><Ban className="w-2.5 h-2.5" /> Blocked</> : <><CheckCircle className="w-2.5 h-2.5" /> Active</>}
                </span>
              </div>
              <p className="text-xs mt-0.5" style={{ color: "#555" }}>Joined {fmtDate(user.created_at)}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" style={{ color: "#555" }} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Total Bookings", value: bookings.length, color: "#3B82F6", bg: "#1e3a5f22" },
              { label: "Total Spent",    value: fmt(totalSpent), color: "#10B981", bg: "#06472a22" },
              { label: "Cancellations",  value: cancelledCount,  color: cancelledCount > 3 ? "#f87171" : "#666", bg: cancelledCount > 3 ? "#2a0a0a" : "#1a1a1a" },
            ].map(({ label, value, color, bg }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: bg, border: "1px solid #2a2a2a" }}>
                <p className="text-lg font-bold" style={{ color }}>{value}</p>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Fraud Signals */}
          {fraudSignals.length > 0 && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{ background: "#2a1500", border: "1px solid #7c3500", color: "#fb923c" }}>
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-bold mb-1">Risk Signals Detected</p>
                {fraudSignals.map((sig, i) => <p key={i}>⚠ {sig}</p>)}
              </div>
            </div>
          )}

          {/* Inner Tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            {[
              { key: "info",     label: "Profile" },
              { key: "bookings", label: `Bookings (${bookings.length})` },
              { key: "payments", label: "Payments" },
            ].map(({ key, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className="flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all"
                style={activeTab === key ? { background: "#CC0000", color: "#fff" } : { color: "#555" }}>
                {label}
              </button>
            ))}
          </div>

          {/* Profile Info */}
          {activeTab === "info" && (
            <div className="grid grid-cols-2 gap-2">
              {[
                ["Name",     user.name,                Mail],
                ["Email",    user.email,               Mail],
                ["Phone",    user.phone ?? "Not provided",    Phone],
                ["Location", user.location ?? "Not provided", MapPin],
                ["User ID",  user.id,                  null],
                ["Joined",   fmtDate(user.created_at), Calendar],
              ].map(([label, val, Icon]) => (
                <div key={label} className="rounded-xl p-3" style={{ background: "#1a1a1a", border: "1px solid #222" }}>
                  <p className="text-xs mb-1 flex items-center gap-1" style={{ color: "#555" }}>
                    {Icon && <Icon className="w-3 h-3" />} {label}
                  </p>
                  <p className="text-xs text-white font-medium break-all">{val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Bookings */}
          {activeTab === "bookings" && (
            <div className="space-y-2">
              {bookings.length === 0 ? (
                <p className="text-center text-xs py-8" style={{ color: "#444" }}>No bookings found</p>
              ) : bookings.map(b => (
                <div key={b.id} className="rounded-xl p-3 flex justify-between items-start"
                  style={{ background: "#1a1a1a", border: "1px solid #222" }}>
                  <div>
                    <p className="text-xs font-bold text-white">{b.service_name ?? "Service"}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{b.vendor_name ?? "Vendor"}</p>
                    <p className="text-xs" style={{ color: "#444" }}>{fmtDate(b.date)}{b.time && ` · ${b.time}`}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[b.status] ?? "bg-zinc-800 text-zinc-400"}`}>
                      {b.status}
                    </span>
                    {b.amount > 0 && <p className="text-xs font-bold text-white mt-1">{fmt(b.amount)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Payments */}
          {activeTab === "payments" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Paid",      val: bookings.filter(b => b.status === "completed").length,             color: "#10B981", bg: "#06472a22" },
                  { label: "Pending",   val: bookings.filter(b => ["pending","approved"].includes(b.status)).length, color: "#F59E0B", bg: "#45260022" },
                  { label: "Cancelled", val: bookings.filter(b => b.status === "cancelled").length,             color: "#f87171", bg: "#2a0a0a" },
                ].map(({ label, val, color, bg }) => (
                  <div key={label} className="rounded-xl p-2.5 text-center" style={{ background: bg, border: "1px solid #2a2a2a" }}>
                    <p className="text-sm font-bold" style={{ color }}>{val}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#555" }}>{label}</p>
                  </div>
                ))}
              </div>
              {bookings.length === 0 ? (
                <p className="text-center text-xs py-6" style={{ color: "#444" }}>No payment history</p>
              ) : bookings.map(b => (
                <div key={b.id} className="flex items-center justify-between rounded-xl p-3"
                  style={{ background: "#1a1a1a", border: "1px solid #222" }}>
                  <div>
                    <p className="text-xs font-semibold text-white">{b.service_name ?? "Service"}</p>
                    <p className="text-xs" style={{ color: "#555" }}>{fmtDate(b.date)} · <span className="capitalize">{b.payment_method ?? "cod"}</span></p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold ${b.status === "completed" ? "text-emerald-400" : b.status === "cancelled" ? "line-through" : "text-amber-400"}`}
                      style={b.status === "cancelled" ? { color: "#444" } : {}}>
                      {fmt(b.amount)}
                    </p>
                    <p className="text-xs capitalize" style={{ color: "#555" }}>{b.payment_status ?? "pending"}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2 flex-wrap" style={{ borderTop: "1px solid #222" }}>
            <button onClick={() => onResetPassword(user)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
              style={{ background: "#1a1a1a", color: "#999", border: "1px solid #2a2a2a" }}>
              <Lock className="w-3.5 h-3.5" /> Reset Password
            </button>
            {user.is_blocked ? (
              <button onClick={() => onUnblock(user.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                style={{ background: "#064e3b", color: "#34d399", border: "1px solid #065f46" }}>
                <ShieldCheck className="w-3.5 h-3.5" /> Unblock
              </button>
            ) : (
              <button onClick={() => onBlock(user.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                style={{ background: "#451a03", color: "#fb923c", border: "1px solid #7c2d12" }}>
                <Ban className="w-3.5 h-3.5" /> Block User
              </button>
            )}
            <button onClick={() => onDelete(user.id)}
              className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
              style={{ background: "#2a0a0a", color: "#f87171", border: "1px solid #5a1a1a" }}>
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────────────
export default function AdminUsersSection() {
  const [users, setUsers]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [search, setSearch]     = useState("");
  const [filter, setFilter]     = useState("all");
  const [toast, setToast]       = useState({ text: "", type: "" });

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 3000);
  };

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const [usersRes, bookingsRes] = await Promise.all([
        api.admin.getUsers(),
        api.admin.getAllBookings()
      ]);
      const usersList = usersRes ?? [];
      const bookingsByUser = {};
      (bookingsRes?.bookings ?? bookingsRes ?? []).forEach(b => {
        if (!bookingsByUser[b.user_id]) bookingsByUser[b.user_id] = [];
        bookingsByUser[b.user_id].push(b);
      });
      setUsers(usersList.map(u => ({ ...u, bookings: bookingsByUser[u.id] ?? [] })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  const handleBlock = async (id) => {
    if (!confirm("Block this user? They won't be able to log in.")) return;
    const res = await api.admin.blockUser(id);
    if (res.success) { showToast("User blocked"); setSelected(null); loadUsers(); }
    else showToast(res.message ?? "Error", "error");
  };

  const handleUnblock = async (id) => {
    const res = await api.admin.unblockUser(id);
    if (res.success) { showToast("User unblocked ✓"); setSelected(null); loadUsers(); }
    else showToast(res.message ?? "Error", "error");
  };

  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this user and all their bookings?")) return;
    const res = await api.admin.deleteUser(id);
    if (res.success) { showToast("User deleted"); setSelected(null); loadUsers(); }
    else showToast(res.message ?? "Error", "error");
  };

  const handleResetPassword = (user) => { setSelected(null); setResetTarget(user); };

  const isFraud = (u) => {
    const cancelled = (u.bookings ?? []).filter(b => b.status === "cancelled").length;
    const total     = (u.bookings ?? []).length;
    return cancelled > 3 || (total > 2 && cancelled / total > 0.5);
  };

  const blocked = users.filter(u => u.is_blocked).length;
  const fraud   = users.filter(u => isFraud(u)).length;

  const visible = users.filter(u => {
    const q = search.toLowerCase();
    const matchSearch = !q || u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)
      || u.phone?.toLowerCase().includes(q) || u.location?.toLowerCase().includes(q);
    const matchFilter = filter === "all" || (filter === "active" && !u.is_blocked)
      || (filter === "blocked" && u.is_blocked) || (filter === "fraud" && isFraud(u));
    return matchSearch && matchFilter;
  });

  return (
    <div className="space-y-4">

      {/* Toast */}
      {toast.text && (
        <div className="fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold border backdrop-blur-sm"
          style={toast.type === "error"
            ? { background: "#2a0a0a", border: "1px solid #5a1a1a", color: "#f87171" }
            : { background: "#064e3b", border: "1px solid #065f46", color: "#34d399" }}>
          {toast.type === "error" ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
          {toast.text}
        </div>
      )}

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Users"   value={users.length}           icon={Users}         accent="#3B82F6" />
        <StatCard label="Active Users"  value={users.length - blocked} icon={ShieldCheck}   accent="#10B981" sub="can login" />
        <StatCard label="Blocked"       value={blocked}                icon={Ban}           accent="#CC0000" sub="restricted" />
        <StatCard label="Fraud Signals" value={fraud}                  icon={AlertTriangle} accent="#F59E0B" sub="needs review" />
      </div>

      {/* ── Search & Filter ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-3 rounded-xl"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#555" }} />
          <input type="text" placeholder="Search by name, email, phone, location..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none"
            style={{ background: "#111", border: "1px solid #2a2a2a", color: "#fff" }} />
        </div>
        <div className="flex gap-1 p-1 rounded-lg flex-wrap" style={{ background: "#111" }}>
          {[
            { key: "all",     label: `All (${users.length})` },
            { key: "active",  label: `Active (${users.length - blocked})` },
            { key: "blocked", label: `Blocked (${blocked})` },
            { key: "fraud",   label: `⚠ Fraud (${fraud})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all whitespace-nowrap"
              style={filter === key ? { background: "#CC0000", color: "#fff" } : { color: "#555" }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={loadUsers} className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: "1px solid #2a2a2a" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "#555" }} />
        </button>
      </div>

      {/* ── Users Table ── */}
      <div className="rounded-xl overflow-hidden" style={{ background: "#161616", border: "1px solid #242424" }}>
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #222" }}>
          <p className="text-sm font-semibold" style={{ color: "#666" }}>
            {loading ? "Loading..." : `${visible.length} users`}
          </p>
        </div>

        {loading ? (
          <div className="py-24 text-center text-sm" style={{ color: "#444" }}>
            <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" style={{ color: "#CC0000" }} />
            Loading users...
          </div>
        ) : visible.length === 0 ? (
          <div className="py-24 text-center">
            <Users className="w-10 h-10 mx-auto mb-2" style={{ color: "#2a2a2a" }} />
            <p className="text-sm" style={{ color: "#444" }}>No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead style={{ background: "#111", borderBottom: "1px solid #222" }}>
                <tr>
                  {["User", "Contact", "Bookings", "Spent", "Status", "Joined", "Actions"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold whitespace-nowrap"
                      style={{ color: "#444" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((user, i) => {
                  const totalSpent = (user.bookings ?? []).reduce((s, b) => 
  s + parseFloat(b.final_amount || b.quote_amount || b.advance_amount || 0), 0);
                  const cancelled  = (user.bookings ?? []).filter(b => b.status === "cancelled").length;
                  const fraud      = isFraud(user);

                  return (
                    <tr key={user.id}
                      className="transition-colors hover:bg-white/[0.02]"
                      style={{
                        borderBottom: "1px solid #1e1e1e",
                        background: user.is_blocked ? "#1a0a0a" : "transparent"
                      }}>

                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                            style={{
                              background: user.is_blocked ? "#2a0a0a" : "#1a0000",
                              border: `1px solid ${user.is_blocked ? "#5a1a1a" : "#3a0000"}`,
                              color: user.is_blocked ? "#f87171" : "#CC0000"
                            }}>
                            {user.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-white">{user.name}</p>
                            {fraud && !user.is_blocked && (
                              <span className="text-xs font-semibold flex items-center gap-0.5" style={{ color: "#fb923c" }}>
                                <AlertTriangle className="w-2.5 h-2.5" /> Risk
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: "#aaa" }}>{user.email}</p>
                        <p className="text-xs" style={{ color: "#555" }}>{user.phone ?? "No phone"}</p>
                      </td>

                      {/* Bookings */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-white">{user.bookings?.length ?? 0}</p>
                        {cancelled > 0 && (
                          <p className="text-xs" style={{ color: cancelled > 3 ? "#f87171" : "#555" }}>
                            {cancelled} cancelled
                          </p>
                        )}
                      </td>

                      {/* Spent */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-white">{fmt(totalSpent)}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 w-fit"
                          style={user.is_blocked
                            ? { background: "#2a0a0a", color: "#f87171", border: "1px solid #5a1a1a" }
                            : { background: "#064e3b44", color: "#34d399", border: "1px solid #065f46" }}>
                          {user.is_blocked
                            ? <><Ban className="w-2.5 h-2.5" /> Blocked</>
                            : <><CheckCircle className="w-2.5 h-2.5" /> Active</>}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="text-xs" style={{ color: "#555" }}>{fmtDate(user.created_at)}</p>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <button onClick={() => setSelected(user)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                            style={{ background: "#CC0000", color: "#fff" }}>
                            <Eye className="w-3 h-3" /> View
                          </button>
                          {user.is_blocked ? (
                            <button onClick={() => handleUnblock(user.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                              style={{ background: "#064e3b", color: "#34d399", border: "1px solid #065f46" }}>
                              <ShieldCheck className="w-3 h-3" /> Unblock
                            </button>
                          ) : (
                            <button onClick={() => handleBlock(user.id)}
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                              style={{ background: "#451a03", color: "#fb923c", border: "1px solid #7c2d12" }}>
                              <Ban className="w-3 h-3" /> Block
                            </button>
                          )}
                          <button onClick={() => handleDelete(user.id)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs transition-all hover:opacity-90"
                            style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selected && (
        <UserModal user={selected} onClose={() => setSelected(null)}
          onBlock={handleBlock} onUnblock={handleUnblock}
          onDelete={handleDelete} onResetPassword={handleResetPassword} />
      )}
      {resetTarget && (
        <ResetPasswordModal user={resetTarget} onClose={() => setResetTarget(null)}
          onReset={() => { setResetTarget(null); loadUsers(); }} />
      )}
    </div>
  );
}