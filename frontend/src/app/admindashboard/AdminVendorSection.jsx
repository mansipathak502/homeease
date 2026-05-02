"use client";
import { useState, useEffect, useCallback } from "react";
import { api } from "@/lib/api";
import {
  Search, CheckCircle, XCircle, Eye, Trash2, RefreshCw,
  Briefcase, Mail, MapPin, TrendingUp, AlertCircle, X,
  Users, Truck, Navigation, Star, Phone, Globe,
  Award, Activity, BarChart2, ShieldCheck, Clock,
} from "lucide-react";
import { FullTrackModal } from "@/components/admin/AdminTrackingPanel";

const fmt = (n) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n ?? 0);

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ text, type }) {
  if (!text) return null;
  return (
    <div className={`fixed top-5 right-5 z-[9999] flex items-center gap-2 px-4 py-3 rounded-xl shadow-2xl text-sm font-semibold border backdrop-blur-sm transition-all
      ${type === "error" ? "bg-red-950/90 border-red-700 text-red-200" : "bg-emerald-950/90 border-emerald-700 text-emerald-200"}`}>
      {type === "error" ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
      {text}
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, sub, accent = "#CC0000" }) {
  return (
    <div className="relative overflow-hidden rounded-xl p-4 flex flex-col gap-1"
      style={{ background: "linear-gradient(135deg,#1c1c1c,#161616)", border: "1px solid #2a2a2a" }}>
      <div className="absolute top-0 right-0 w-16 h-16 rounded-bl-full opacity-10"
        style={{ background: accent }} />
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide uppercase" style={{ color: "#666" }}>{label}</span>
        <div className="p-1.5 rounded-lg" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <Icon className="w-3.5 h-3.5" style={{ color: accent }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-white leading-none mt-1">{value}</p>
      {sub && <p className="text-xs" style={{ color: "#555" }}>{sub}</p>}
    </div>
  );
}

// ── Vendor Detail Modal ───────────────────────────────────────────────────────
function VendorModal({ vendor, onClose, onApprove, onReject, onDelete }) {
  const s = vendor.stats ?? {};
  const cancelRate = parseFloat(s.cancelRate ?? 0);

  let extraFields = [];
  if (vendor.additional_info) {
    try {
      const parsed = typeof vendor.additional_info === "string"
        ? JSON.parse(vendor.additional_info) : vendor.additional_info;
      extraFields = Object.entries(parsed).filter(([k]) => k.trim());
    } catch { /* ignore */ }
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ background: "#111", border: "1px solid #2a2a2a" }}>

        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 flex justify-between items-start rounded-t-2xl"
          style={{ background: "#111", borderBottom: "1px solid #222" }}>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-white">{vendor.business_name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${vendor.is_approved ? "bg-emerald-900/60 text-emerald-400 border border-emerald-800" : "bg-amber-900/60 text-amber-400 border border-amber-800"}`}>
                {vendor.is_approved ? "● Active" : "○ Pending"}
              </span>
            </div>
            <p className="text-xs mt-0.5" style={{ color: "#CC0000" }}>{vendor.service_category}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" style={{ color: "#666" }} />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Stats Row */}
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: "Bookings", val: s.totalBookings ?? 0, color: "#3B82F6" },
              { label: "Completed", val: s.completedJobs ?? 0, color: "#10B981" },
              { label: "Rating", val: s.avgRating ? `${parseFloat(s.avgRating).toFixed(1)}★` : "—", color: "#F59E0B" },
              { label: "Earnings", val: fmt(s.totalEarnings ?? 0), color: "#CC0000" },
            ].map(({ label, val, color }) => (
              <div key={label} className="rounded-xl p-3 text-center" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                <p className="text-base font-bold" style={{ color }}>{val}</p>
                <p className="text-xs mt-0.5" style={{ color: "#555" }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["Owner", vendor.owner_name],
              ["Email", vendor.email],
              ["Phone", vendor.phone],
              ["Joined", fmtDate(vendor.created_at)],
              ["Experience", `${vendor.years_in_business ?? "—"} yrs`],
              ["Pricing", vendor.pricing ?? "—"],
            ].map(([label, val]) => (
              <div key={label} className="rounded-lg p-2.5" style={{ background: "#1a1a1a", border: "1px solid #222" }}>
                <p style={{ color: "#555" }}>{label}</p>
                <p className="text-white font-medium mt-0.5">{val}</p>
              </div>
            ))}
          </div>

          {/* Address */}
          <div className="rounded-lg p-3 text-xs" style={{ background: "#1a1a1a", border: "1px solid #222" }}>
            <p style={{ color: "#555" }} className="mb-0.5">Address</p>
            <p className="text-white">{vendor.address}, {vendor.city}, {vendor.state} — {vendor.zip_code}</p>
          </div>

          {vendor.description && (
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: "#555" }}>Description</p>
              <p className="text-xs leading-relaxed" style={{ color: "#999" }}>{vendor.description}</p>
            </div>
          )}

          {cancelRate > 20 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold"
              style={{ background: "#2a0a0a", border: "1px solid #5a1a1a", color: "#f87171" }}>
              <AlertCircle className="w-4 h-4" /> High cancel rate: {cancelRate.toFixed(1)}% ⚠️
            </div>
          )}

          {extraFields.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {extraFields.map(([k, v]) => (
                <div key={k} className="rounded-lg px-3 py-2 text-xs" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                  <p style={{ color: "#555" }}>{k}</p>
                  <p className="font-semibold text-white mt-0.5">{v}</p>
                </div>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2" style={{ borderTop: "1px solid #222" }}>
            {!vendor.is_approved && (
              <button onClick={() => onApprove(vendor.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                style={{ background: "#064e3b", color: "#34d399", border: "1px solid #065f46" }}>
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </button>
            )}
            {!vendor.is_approved && (
              <button onClick={() => onReject(vendor.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all hover:opacity-90"
                style={{ background: "#451a03", color: "#fb923c", border: "1px solid #7c2d12" }}>
                <XCircle className="w-3.5 h-3.5" /> Decline
              </button>
            )}
            <button onClick={() => onDelete(vendor.id)}
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

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AdminVendorSection({ onStatsChange }) {
  const [vendors, setVendors]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter]     = useState("all");
  const [search, setSearch]     = useState("");
  const [toast, setToast]       = useState({ text: "", type: "" });
  const [trackingVendorId, setTrackingVendorId]       = useState(null);
  const [vendorActiveBooking, setVendorActiveBooking] = useState(null);
  const [loadingBooking, setLoadingBooking]           = useState(false);

  const showToast = (text, type = "success") => {
    setToast({ text, type });
    setTimeout(() => setToast({ text: "", type: "" }), 3000);
  };

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const [vendorsRes, statsRes] = await Promise.all([
        api.admin.getVendors(),
        api.admin.getVendorStats(),
      ]);
      const statsMap = {};
      if (statsRes?.success) statsRes.stats.forEach((s) => { statsMap[s.vendor_id] = s; });
      const merged = (vendorsRes ?? []).map((v) => ({ ...v, stats: statsMap[v.id] ?? {} }));
      setVendors(merged);
      if (onStatsChange) onStatsChange({
        totalVendors: merged.length,
        pendingVendors: merged.filter((v) => !v.is_approved).length,
        approvedVendors: merged.filter((v) => v.is_approved).length,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [onStatsChange]);

  useEffect(() => { loadVendors(); }, [loadVendors]);

  useEffect(() => {
    if (!trackingVendorId) return;
    setLoadingBooking(true);
    api.admin.getBookings({ vendorId: trackingVendorId, status: "en_route" })
      .then((res) => {
        const active = res.bookings?.find((b) =>
          ["en_route", "arrived", "in_service", "approved"].includes(b.status));
        setVendorActiveBooking(active || null);
      })
      .catch(() => setVendorActiveBooking(null))
      .finally(() => setLoadingBooking(false));
  }, [trackingVendorId]);

  const handleApprove = async (id) => {
    const res = await api.admin.approveVendor(id);
    if (res.success) { showToast("Vendor approved ✓"); setSelected(null); loadVendors(); }
    else showToast(res.message ?? "Error", "error");
  };
  const handleReject = async (id) => {
    if (!confirm("Decline this vendor application?")) return;
    const res = await api.admin.rejectVendor(id);
    if (res.success) { showToast("Vendor declined"); setSelected(null); loadVendors(); }
    else showToast(res.message ?? "Error", "error");
  };
  const handleDelete = async (id) => {
    if (!confirm("Permanently delete this vendor?")) return;
    const res = await api.admin.deleteVendor(id);
    if (res.success) { showToast("Vendor deleted"); setSelected(null); loadVendors(); }
    else showToast(res.message ?? "Error", "error");
  };

  const pending  = vendors.filter((v) => !v.is_approved).length;
  const approved = vendors.filter((v) => v.is_approved).length;
  const topEarner = [...vendors].sort((a, b) => (b.stats?.totalEarnings ?? 0) - (a.stats?.totalEarnings ?? 0))[0];

  const visible = vendors.filter((v) => {
    const matchFilter = filter === "all" || (filter === "pending" && !v.is_approved) || (filter === "approved" && v.is_approved);
    const q = search.toLowerCase();
    const matchSearch = !q || v.business_name?.toLowerCase().includes(q) || v.owner_name?.toLowerCase().includes(q)
      || v.email?.toLowerCase().includes(q) || v.service_category?.toLowerCase().includes(q) || v.city?.toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  return (
    <div className="space-y-4">
      <Toast {...toast} />

      {/* ── Summary Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Vendors"    value={vendors.length} icon={Briefcase}   sub="registered" />
        <StatCard label="Pending Review"   value={pending}        icon={Clock}       sub="awaiting approval" accent="#F59E0B" />
        <StatCard label="Active Vendors"   value={approved}       icon={ShieldCheck} sub="approved"   accent="#10B981" />
        <StatCard label="Top Earner"       value={topEarner?.business_name?.split(" ")[0] ?? "—"} icon={TrendingUp}
          sub={topEarner ? fmt(topEarner.stats?.totalEarnings ?? 0) : "no data"} accent="#8B5CF6" />
      </div>

      {/* ── Search & Filter Bar ── */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center p-3 rounded-xl"
        style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: "#555" }} />
          <input type="text" placeholder="Search vendors, owners, cities..." value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-2 text-sm rounded-lg outline-none"
            style={{ background: "#111", border: "1px solid #2a2a2a", color: "#fff" }} />
        </div>
        <div className="flex gap-1 p-1 rounded-lg" style={{ background: "#111" }}>
          {[
            { key: "all",      label: `All (${vendors.length})` },
            { key: "pending",  label: `Pending (${pending})` },
            { key: "approved", label: `Active (${approved})` },
          ].map(({ key, label }) => (
            <button key={key} onClick={() => setFilter(key)}
              className="px-3 py-1.5 rounded-md text-xs font-semibold transition-all"
              style={filter === key ? { background: "#CC0000", color: "#fff" } : { color: "#666" }}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={loadVendors} className="p-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ border: "1px solid #2a2a2a" }}>
          <RefreshCw className="w-4 h-4" style={{ color: "#666" }} />
        </button>
      </div>

      {/* ── Vendor Grid ── */}
      {loading ? (
        <div className="py-24 text-center text-sm" style={{ color: "#444" }}>
          <RefreshCw className="w-6 h-6 mx-auto mb-2 animate-spin" style={{ color: "#CC0000" }} />
          Loading vendors...
        </div>
      ) : visible.length === 0 ? (
        <div className="py-24 text-center rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <Briefcase className="w-10 h-10 mx-auto mb-2" style={{ color: "#2a2a2a" }} />
          <p className="text-sm" style={{ color: "#444" }}>No vendors found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visible.map((vendor) => {
            const s = vendor.stats ?? {};
            const cancelRate = parseFloat(s.cancelRate ?? 0);
            const rating = s.avgRating ? parseFloat(s.avgRating).toFixed(1) : null;

            return (
              <div key={vendor.id} className="group relative rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "#161616", border: "1px solid #242424" }}
                onMouseEnter={(e) => e.currentTarget.style.borderColor = "#3a3a3a"}
                onMouseLeave={(e) => e.currentTarget.style.borderColor = "#242424"}>

                {/* Top accent line */}
                <div className="h-0.5 w-full" style={{ background: vendor.is_approved ? "linear-gradient(90deg,#10B981,#059669)" : "linear-gradient(90deg,#F59E0B,#D97706)" }} />

                <div className="p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h3 className="text-sm font-bold text-white truncate">{vendor.business_name}</h3>
                      </div>
                      <p className="text-xs font-medium" style={{ color: "#CC0000" }}>{vendor.service_category}</p>
                      <p className="text-xs mt-0.5 flex items-center gap-1" style={{ color: "#555" }}>
                        <MapPin className="w-2.5 h-2.5" /> {vendor.city}, {vendor.state}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${vendor.is_approved ? "text-emerald-400" : "text-amber-400"}`}
                        style={{ background: vendor.is_approved ? "#064e3b44" : "#451a0344", border: `1px solid ${vendor.is_approved ? "#065f46" : "#92400e"}` }}>
                        {vendor.is_approved ? "Active" : "Pending"}
                      </span>
                      {rating && (
                        <span className="flex items-center gap-0.5 text-xs font-bold" style={{ color: "#F59E0B" }}>
                          <Star className="w-2.5 h-2.5 fill-current" /> {rating}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Owner info */}
                  <div className="flex items-center gap-1.5 mb-3 text-xs" style={{ color: "#666" }}>
                    <Users className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{vendor.owner_name}</span>
                    <span style={{ color: "#333" }}>·</span>
                    <Mail className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>

                  {/* Stats Row */}
                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    <div className="rounded-lg p-2 text-center" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                      <p className="text-sm font-bold text-white">{s.totalBookings ?? 0}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#555", fontSize: "10px" }}>Bookings</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                      <p className="text-sm font-bold" style={{ color: "#10B981" }}>{s.completedJobs ?? 0}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#555", fontSize: "10px" }}>Completed</p>
                    </div>
                    <div className="rounded-lg p-2 text-center" style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                      <p className="text-sm font-bold" style={{ color: cancelRate > 20 ? "#f87171" : "#666" }}>
                        {cancelRate.toFixed(0)}%
                      </p>
                      <p className="text-xs mt-0.5" style={{ color: "#555", fontSize: "10px" }}>Cancel</p>
                    </div>
                  </div>

                  {/* Earnings */}
                  <div className="flex items-center justify-between px-3 py-2 rounded-lg mb-3"
                    style={{ background: "#1e1e1e", border: "1px solid #2a2a2a" }}>
                    <span className="text-xs" style={{ color: "#555" }}>Total Earnings</span>
                    <span className="text-sm font-bold text-white">{fmt(s.totalEarnings ?? 0)}</span>
                  </div>

                  {/* High cancel rate warning */}
                  {cancelRate > 20 && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg mb-2 text-xs font-medium"
                      style={{ background: "#2a0a0a", color: "#f87171", border: "1px solid #5a1a1a" }}>
                      <AlertCircle className="w-3 h-3" /> High cancel rate
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1.5">
                    <button onClick={() => setSelected(vendor)}
                      className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all hover:opacity-90"
                      style={{ background: "#CC0000", color: "#fff" }}>
                      <Eye className="w-3 h-3" /> Details
                    </button>

                    {vendor.is_approved && (
                      <button onClick={() => setTrackingVendorId(vendor.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all hover:opacity-90"
                        style={{ background: "#1a1a1a", color: "#F97316", border: "1px solid #7c2d12" }}>
                        <Navigation className="w-3 h-3" /> Track
                      </button>
                    )}

                    {!vendor.is_approved && (
                      <button onClick={() => handleApprove(vendor.id)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all hover:opacity-90"
                        style={{ background: "#064e3b", color: "#34d399", border: "1px solid #065f46" }}>
                        <CheckCircle className="w-3 h-3" /> Approve
                      </button>
                    )}

                    {!vendor.is_approved && (
                      <button onClick={() => handleReject(vendor.id)}
                        className="py-2 px-3 rounded-lg text-xs font-bold transition-all hover:opacity-90"
                        style={{ background: "#1a1a1a", color: "#F59E0B", border: "1px solid #92400e" }}>
                        Decline
                      </button>
                    )}

                    <button onClick={() => handleDelete(vendor.id)}
                      className="py-2 px-2.5 rounded-lg text-xs transition-all hover:opacity-90"
                      style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a" }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modals ── */}
      {selected && (
        <VendorModal vendor={selected} onClose={() => setSelected(null)}
          onApprove={handleApprove} onReject={handleReject} onDelete={handleDelete} />
      )}

      {trackingVendorId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-2xl p-6 text-center shadow-2xl"
            style={{ background: "#111", border: "1px solid #2a2a2a" }}>
            {loadingBooking ? (
              <>
                <RefreshCw className="w-8 h-8 mx-auto mb-3 animate-spin" style={{ color: "#CC0000" }} />
                <p className="text-white text-sm font-semibold">Finding active booking...</p>
              </>
            ) : vendorActiveBooking ? (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: "#1a1a1a", border: "1px solid #7c2d12" }}>
                  <Navigation className="w-5 h-5" style={{ color: "#F97316" }} />
                </div>
                <p className="text-white font-bold mb-1">Active Booking Found</p>
                <p className="text-xs mb-4" style={{ color: "#666" }}>
                  #{vendorActiveBooking.id} · {vendorActiveBooking.service_name} · {vendorActiveBooking.new_time || vendorActiveBooking.time}
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setTrackingVendorId(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold transition-all hover:opacity-90"
                    style={{ background: "#F97316", color: "#fff" }}>
                    View on Map
                  </button>
                  <button onClick={() => setTrackingVendorId(null)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                    style={{ background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3"
                  style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}>
                  <Truck className="w-5 h-5" style={{ color: "#444" }} />
                </div>
                <p className="text-white font-bold mb-1">No Active Booking</p>
                <p className="text-xs mb-4" style={{ color: "#555" }}>
                  This vendor has no active or en-route booking right now.
                </p>
                <button onClick={() => setTrackingVendorId(null)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold"
                  style={{ background: "#1a1a1a", color: "#666", border: "1px solid #2a2a2a" }}>
                  Close
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}