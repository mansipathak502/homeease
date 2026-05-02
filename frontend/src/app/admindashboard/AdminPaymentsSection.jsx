"use client";
import { useState, useEffect } from "react";
import {
  IndianRupee, CheckCircle, Clock, AlertCircle,
  TrendingUp, Users, RefreshCw, Edit2, X, Check,
} from "lucide-react";

const C = "#CC0000";
const fmt = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

const Badge = ({ status }) => {
  const cfg = {
    paid:         { bg: "#052E16", text: "#4ADE80" },
    pending:      { bg: "#2D2200", text: "#FCD34D" },
    accepted:     { bg: "#052E16", text: "#4ADE80" },
    rejected:     { bg: "#2A0A0A", text: "#F1948A" },
    pending_user: { bg: "#2D2200", text: "#FCD34D" },
    completed:    { bg: "#052E16", text: "#4ADE80" },
    cancelled:    { bg: "#1A1A1A", text: "#888" },
  }[status] || { bg: "#1A1A1A", text: "#888" };
  return (
    <span style={{ background: cfg.bg, color: cfg.text, padding: "2px 8px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
      {status || "—"}
    </span>
  );
};

export default function AdminPaymentsSection() {
  const [payments, setPayments]   = useState([]);
  const [summary, setSummary]     = useState(null);
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);
  const [editCommission, setEditCommission] = useState({ bookingId: null, value: "" });
  const [globalCommission, setGlobalCommission] = useState("");
  const [filter, setFilter]       = useState("all");
  const [currentGlobalCommission, setCurrentGlobalCommission] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const getToken = () => localStorage.getItem("token");

const fetchData = async () => {
  setLoading(true);
  try {
    const h = { Authorization: `Bearer ${getToken()}` };
    const [pRes, sRes, gcRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payments`, { headers: h }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payments/summary`, { headers: h }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payments/global-commission`, { headers: h }),
    ]);
    if (pRes.ok) setPayments(await pRes.json());
    if (sRes.ok) setSummary(await sRes.json());
    if (gcRes.ok) {
      const gc = await gcRes.json();
      setCurrentGlobalCommission(gc.commission_pct);
    }
  } catch { showToast("Failed to load", "error"); }
  finally { setLoading(false); }
};

  useEffect(() => { fetchData(); }, []);

  // ── Mark vendor payout done ──────────────────────────────────────────────
  const markPayoutDone = async (id) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payments/${id}/payout-done`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      const data = await res.json();
      if (data.success) { showToast("Payout marked done ✅"); fetchData(); }
      else showToast(data.message || "Failed", "error");
    } catch { showToast("Failed", "error"); }
  };

  // ── Save per-booking commission ──────────────────────────────────────────
  const saveCommission = async (id) => {
    const pct = Number(editCommission.value);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      showToast("Enter a valid % (0–100)", "error"); return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payments/${id}/commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ commission_pct: pct }),
      });
      const data = await res.json();
      if (data.success) {
        // Show recalculated amounts
        const admin  = data.summary?.adminEarning  ?? 0;
        const vendor = data.summary?.vendorPayout  ?? 0;
        showToast(`Commission set to ${pct}% — Admin: ${fmt(admin)}, Vendor: ${fmt(vendor)}`);
        setEditCommission({ bookingId: null, value: "" });
        fetchData();
      } else showToast(data.message || "Failed", "error");
    } catch { showToast("Failed", "error"); }
  };

  // ── Apply global commission to all pending bookings ──────────────────────
  const applyGlobalCommission = async () => {
    const pct = Number(globalCommission);
    if (!globalCommission || isNaN(pct) || pct < 0 || pct > 100) {
      showToast("Enter a valid % (0–100)", "error"); return;
    }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/payments/global-commission`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ commission_pct: pct }),
      });
      const data = await res.json();
      if (data.success) { showToast(data.message || `Global commission set to ${pct}%`); setGlobalCommission(""); fetchData(); }
      else showToast(data.message || "Failed", "error");
    } catch { showToast("Failed", "error"); }
  };

  // ── Filter logic ─────────────────────────────────────────────────────────
  const filtered =
    filter === "all"            ? payments :
    filter === "paid"           ? payments.filter(p => p.final_payment_status === "paid") :
    filter === "pending_payout" ? payments.filter(p => p.payout_status === "pending" && p.final_payment_status === "paid") :
                                  payments.filter(p => p.quote_status === "pending_user");

  const s = { background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: 16 };

  // ── Amount helpers ────────────────────────────────────────────────────────
  // final_amount = quote_amount accepted by user (this is the total agreed price)
  // advance_amount = ₹99 booking fee (already paid, part of total)
  // remaining = final_amount - advance_amount  ← vendor collects this on-site
  // admin_earning = final_amount × commission_pct / 100
  // vendor_payout = final_amount - admin_earning
  const getAmounts = (p) => {
    const finalAmt    = Number(p.final_amount   || p.quote_amount || 0);
    const advanceAmt  = Number(p.advance_amount || 99);
    const commPct     = Number(p.commission_pct || 10);
    const adminEarn   = Number(p.admin_earning  || Math.round(finalAmt * commPct / 100));
    const vendorPay   = Number(p.vendor_payout  || finalAmt - adminEarn);
    const remaining   = Math.max(0, finalAmt - advanceAmt);
    return { finalAmt, advanceAmt, commPct, adminEarn, vendorPay, remaining };
  };

  if (loading) return (
    <div style={{ textAlign: "center", padding: 60, color: "#666" }}>
      <RefreshCw style={{ width: 28, height: 28, margin: "0 auto 8px", animation: "spin 1s linear infinite", color: C }} />
      <p style={{ fontSize: 13 }}>Loading payments...</p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div style={{ fontFamily: "system-ui,sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 20, right: 20, zIndex: 100, padding: "10px 18px", borderRadius: 10, fontSize: 13, fontWeight: 700, color: "#fff", backgroundColor: toast.type === "success" ? "#059669" : C, boxShadow: "0 8px 24px rgba(0,0,0,0.5)", maxWidth: 400 }}>
          {toast.msg}
        </div>
      )}

      {/* ── Summary Cards ── */}
      {summary && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 20 }}>
          {[
            { label: "Admin Earned",       value: fmt(summary.adminTotalEarning),   color: C,         icon: TrendingUp  },
            { label: "Vendor Payouts",     value: fmt(summary.vendorTotalPayout),   color: "#3B82F6", icon: Users       },
            { label: "Pending Payouts",    value: fmt(summary.pendingVendorPayout), color: "#F59E0B", icon: Clock       },
            { label: "Paid Transactions",  value: payments.filter(p => p.final_payment_status === "paid").length, color: "#10B981", icon: CheckCircle },
          ].map(({ label, value, color, icon: Icon }) => (
            <div key={label} style={{ ...s, borderTop: `2px solid ${color}` }}>
              <Icon style={{ width: 16, height: 16, color, marginBottom: 6 }} />
              <p style={{ fontSize: 20, fontWeight: 800, color: "#fff", margin: 0 }}>{value}</p>
              <p style={{ fontSize: 11, color: "#666", margin: "2px 0 0" }}>{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Global Commission ── */}
      <div style={{ ...s, marginBottom: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0", margin: 0 }}>Global Commission</p>
          <p style={{ fontSize: 11, color: "#666", margin: "2px 0 0" }}>Apply % to all bookings where final payment is not yet recorded</p>
           {currentGlobalCommission !== null && (
    <p style={{ fontSize: 12, color: "#4ADE80", margin: "6px 0 0", fontWeight: 700 }}>
      ✅ Currently set: {currentGlobalCommission}%
    </p>
  )}
  {currentGlobalCommission === null && (
    <p style={{ fontSize: 12, color: "#F59E0B", margin: "6px 0 0" }}>
      ⚠️ No global commission set yet
    </p>
  )}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginLeft: "auto" }}>
          <input type="number" min="0" max="100" value={globalCommission}
            onChange={e => setGlobalCommission(e.target.value)}
            placeholder="e.g. 15"
            style={{ width: 80, padding: "7px 10px", borderRadius: 8, border: "1px solid #3a3a3a", background: "#111", color: "#fff", fontSize: 13, outline: "none" }}
          />
          <span style={{ color: "#666", fontSize: 13 }}>%</span>
          <button onClick={applyGlobalCommission} disabled={!globalCommission}
            style={{ padding: "7px 16px", borderRadius: 8, background: C, color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, opacity: globalCommission ? 1 : 0.5 }}>
            Apply to All
          </button>
        </div>
      </div>

      {/* ── Filter Tabs ── */}
      <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
        {[
          { key: "all",            label: `All (${payments.length})` },
          { key: "paid",           label: `Paid (${payments.filter(p => p.final_payment_status === "paid").length})` },
          { key: "pending_payout", label: `Pending Payout (${payments.filter(p => p.payout_status === "pending" && p.final_payment_status === "paid").length})` },
          { key: "quote_pending",  label: `Quote Pending (${payments.filter(p => p.quote_status === "pending_user").length})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            style={{ padding: "5px 12px", borderRadius: 999, fontSize: 11, fontWeight: 700, border: `1px solid ${filter === f.key ? C : "#2a2a2a"}`, background: filter === f.key ? `${C}22` : "transparent", color: filter === f.key ? "#F1948A" : "#666", cursor: "pointer" }}>
            {f.label}
          </button>
        ))}
        <button onClick={fetchData} style={{ marginLeft: "auto", padding: "5px 10px", borderRadius: 8, border: "1px solid #2a2a2a", background: "transparent", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
          <RefreshCw style={{ width: 12, height: 12 }} /> Refresh
        </button>
      </div>

      {/* ── Payment Records ── */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "48px 0", color: "#444", fontSize: 13 }}>No payments found</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {filtered.map(p => {
            const { finalAmt, advanceAmt, commPct, adminEarn, vendorPay, remaining } = getAmounts(p);
            return (
              <div key={p.id} style={{ ...s, padding: 0, overflow: "hidden" }}>

                {/* ── Header ── */}
                <div style={{ padding: "12px 16px", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10, borderBottom: "1px solid #2a2a2a" }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: "#f0f0f0" }}>{p.vendor_name || "—"}</span>
                      <span style={{ fontSize: 11, color: "#555" }}>→</span>
                      <span style={{ fontSize: 12, color: "#aaa" }}>{p.customer_name || "—"}</span>
                    </div>
                    <div style={{ fontSize: 11, color: "#555" }}>
                      {p.service_name} · {p.date} · #{(p.id || "").slice(0, 10)}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                    <Badge status={p.quote_status || "—"} />
                    <Badge status={p.final_payment_status || "—"} />
                    <Badge status={p.payout_status || "—"} />
                    {p.final_payment_method && (
                      <span style={{ fontSize: 11, color: "#aaa", background: "#111", border: "1px solid #2a2a2a", padding: "2px 8px", borderRadius: 999 }}>
                        {p.final_payment_method === "cash" ? "💵 Cash" : "💳 Online"}
                      </span>
                    )}
                  </div>
                </div>

                {/* ── Amount Breakdown ── */}
                <div style={{ padding: "12px 16px", background: "#141414" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 10 }}>
                    {[
                      ["Advance Paid",  finalAmt > 0 ? fmt(advanceAmt)  : "—",         "#FCD34D"],
                      ["Total Agreed",  finalAmt > 0 ? fmt(finalAmt)    : "—",         "#4ADE80"],
                      ["Remaining",     finalAmt > 0 ? fmt(remaining)   : "—",         "#F97316"],
                      ["Commission",    `${commPct}%`,                                  "#C4B5FD"],
                      ["Admin Earns",   finalAmt > 0 ? fmt(adminEarn)   : "—",         C],
                      ["Vendor Gets",   finalAmt > 0 ? fmt(vendorPay)   : "—",         "#93C5FD"],
                    ].map(([label, val, color]) => (
                      <div key={label}>
                        <p style={{ fontSize: 9, color: "#555", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{val}</p>
                      </div>
                    ))}
                  </div>

                  {/* ── Visual breakdown bar (only when final amount is set) ── */}
                  {finalAmt > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 6, borderRadius: 3, background: "#2a2a2a", overflow: "hidden", display: "flex" }}>
                        <div style={{ width: `${(adminEarn / finalAmt) * 100}%`, background: C, transition: "width 0.4s" }} title={`Admin: ${fmt(adminEarn)}`} />
                        <div style={{ width: `${(vendorPay / finalAmt) * 100}%`, background: "#93C5FD", transition: "width 0.4s" }} title={`Vendor: ${fmt(vendorPay)}`} />
                      </div>
                      <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
                        <span style={{ fontSize: 10, color: "#888" }}><span style={{ color: C }}>■</span> Admin {commPct}%</span>
                        <span style={{ fontSize: 10, color: "#888" }}><span style={{ color: "#93C5FD" }}>■</span> Vendor {(100 - commPct).toFixed(0)}%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Actions Row ── */}
                <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>

                  {/* Edit commission */}
                  {editCommission.bookingId === p.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <input type="number" min="0" max="100" value={editCommission.value}
                        onChange={e => setEditCommission({ bookingId: p.id, value: e.target.value })}
                        style={{ width: 60, padding: "5px 8px", borderRadius: 6, border: "1px solid #3a3a3a", background: "#111", color: "#fff", fontSize: 12, outline: "none" }}
                      />
                      <span style={{ color: "#555", fontSize: 12 }}>%</span>
                      <button onClick={() => saveCommission(p.id)}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "#059669", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                        <Check style={{ width: 12, height: 12 }} />
                      </button>
                      <button onClick={() => setEditCommission({ bookingId: null, value: "" })}
                        style={{ padding: "5px 10px", borderRadius: 6, background: "#2a2a2a", color: "#aaa", border: "none", cursor: "pointer", fontSize: 11 }}>
                        <X style={{ width: 12, height: 12 }} />
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => setEditCommission({ bookingId: p.id, value: String(p.commission_pct || 10) })}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 10px", borderRadius: 6, border: "1px solid #3a3a3a", background: "transparent", color: "#888", cursor: "pointer", fontSize: 11, fontWeight: 700 }}>
                      <Edit2 style={{ width: 11, height: 11 }} /> Edit %
                    </button>
                  )}

                  {/* Payout status / action */}
                  {p.payout_status === "pending" && p.final_payment_status === "paid" && (
                    <button onClick={() => markPayoutDone(p.id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 12px", borderRadius: 6, background: "#059669", color: "#fff", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, marginLeft: "auto" }}>
                      <CheckCircle style={{ width: 12, height: 12 }} /> Mark Payout Done
                    </button>
                  )}
                  {p.payout_status === "paid" && (
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#4ADE80", fontWeight: 700 }}>✅ Payout Done</span>
                  )}
                  {!p.final_payment_status && (
                    <span style={{ marginLeft: "auto", fontSize: 11, color: "#F59E0B" }}>⏳ Awaiting service completion</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}