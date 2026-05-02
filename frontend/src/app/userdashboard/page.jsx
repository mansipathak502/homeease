

"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Search, Star, MapPin, Phone, Mail, Calendar, Clock,
  Heart, LogOut, User, Bell, IndianRupee, Shield, X,
  CheckCircle, XCircle, AlertCircle, ChevronRight,
  FileText, Loader2, Navigation, ArrowUpRight,
} from "lucide-react";
import ServiceRecommendPopup from "@/components/ServiceRecommendPopup";
import StablePopup from "@/components/StablePopup";

const gp = (v, camel, snake, fallback = "") =>
  ((v?.[camel] || v?.[snake] || fallback) ?? "").toString();

const STATUS_CFG = {
  pending:       { bg: "#2a2200", text: "#f0b429", dot: "#f0b429", label: "Pending"        },
  pending_visit: { bg: "#2a2200", text: "#f0b429", dot: "#f0b429", label: "Pending Visit"  },
  approved:      { bg: "#001a2e", text: "#4da6ff", dot: "#4da6ff", label: "Approved"       },
  confirmed:     { bg: "#001a2e", text: "#4da6ff", dot: "#4da6ff", label: "Confirmed"      },
  completed:     { bg: "#001a0a", text: "#4caf7d", dot: "#4caf7d", label: "Completed"      },
  rejected:      { bg: "#1f0508", text: "#f07070", dot: "#f07070", label: "Rejected"       },
  cancelled:     { bg: "#1e1e1e", text: "#888888", dot: "#666666", label: "Cancelled"      },
  rescheduled:   { bg: "#1a0a2e", text: "#b388ff", dot: "#9c6af7", label: "Rescheduled"   },
};

const StatusBadge = ({ status }) => {
  const cfg = STATUS_CFG[status?.toLowerCase()] || { bg: "#1e1e1e", text: "#888", dot: "#666", label: status };
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.dot }} />
      {cfg.label}
    </span>
  );
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return isNaN(d) ? dateStr : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

const Btn = ({ onClick, style, hoverStyle, className = "", children, disabled }) => {
  const [hov, setHov] = useState(false);
  return (
    <button onClick={onClick} disabled={disabled} className={className}
      style={{ ...style, ...(hov ? hoverStyle : {}) }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      {children}
    </button>
  );
};

export default function UserDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("bookings");
  const [vendors, setVendors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [cancelReason, setCancelReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ show: false, msg: "", type: "success" });
  const [popupUser, setPopupUser] = useState(null);
  

  // Quote state
  const [quoteModal, setQuoteModal] = useState({ open: false, booking: null });
  const [quoteAction, setQuoteAction] = useState(null); // 'accept' | 'reject'

   const showToast = (msg, type = "success") => {
    setToast({ show: true, msg, type });
    setTimeout(() => setToast({ show: false, msg: "", type: "success" }), 3500);
  };

   const fetchData = async () => {
    try {
      setLoading(true);
      const [vd, bd, fd, pd] = await Promise.all([
        api.vendors.getApproved(),
        api.user.getBookings(),
        api.user.getFavorites(),
        api.user.getProfile(),
      ]);
      setVendors(Array.isArray(vd) ? vd : []);
      setBookings(Array.isArray(bd) ? bd : []);
      setFavorites(Array.isArray(fd) ? fd : []);
      setUserData(pd || null);
      setPopupUser(prev => prev || pd || {}); 
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };
    useEffect(() => {
    if (localStorage.getItem("userType") !== "user") { router.push("/login"); return; }
    fetchData();
    // Poll for quote updates every 15s
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  //   if (loading) return (
  //   <div className="min-h-screen flex items-center justify-center" 
  //     style={{ background: "#0f0f0f" }}>
  //     <ServiceRecommendPopup key="popup" user={
  //       (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })()
  //     } />
  //     <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#C0202A" }} />
  //   </div>
  // );

 
  // Bookings with pending quotes
  const pendingQuotes = bookings.filter(b => b.quote_status === "pending_user");

  const toggleFavorite = async (vendorId) => {
    try {
      const isFav = favorites.some(f => (f.vendor_id || f.vendorId) === vendorId);
      isFav ? await api.user.removeFavorite(vendorId) : await api.user.addFavorite(vendorId);
      fetchData();
      showToast(isFav ? "Removed from favorites" : "Added to favorites");
    } catch { showToast("Failed to update favorites", "error"); }
  };

  const handleCancelOpen = (booking) => { setCancelModal({ open: true, booking }); setCancelReason(""); };
  const handleCancelConfirm = async () => {
    if (!cancelReason.trim()) { showToast("Please provide a cancellation reason", "error"); return; }
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/bookings/${cancelModal.booking.id}/cancel`, {        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: cancelReason }),
      });
      if (!res.ok) throw new Error("Failed");
      showToast("Booking cancelled");
      setCancelModal({ open: false, booking: null });
      setSelectedBooking(null);
      fetchData();
    } catch { showToast("Failed to cancel", "error"); }
    finally { setActionLoading(false); }
  };

  // ── Handle Quote Response ──────────────────────────────────
  const handleQuoteResponse = async (bookingId, action) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/bookings/${bookingId}/quote-response`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(action === "accept"
          ? `✅ Quote accepted! Service will proceed. Amount: ₹${data.amount}`
          : "❌ Quote rejected. Booking cancelled.");
        setQuoteModal({ open: false, booking: null });
        fetchData();
      } else showToast(data.message || "Failed", "error");
    } catch { showToast("Network error", "error"); }
    finally { setActionLoading(false); }
  };

  const handleLogout = () => { localStorage.clear(); router.push("/login"); };

if (loading) return (
  <div className="min-h-screen flex items-center justify-center" style={{ background: "#0f0f0f" }}>
    <ServiceRecommendPopup key="popup" user={
      (() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } })()
    } />
    <Loader2 className="w-10 h-10 animate-spin" style={{ color: "#C0202A" }} />
  </div>
);



     

  return (
    <div className="min-h-screen mt-20" style={{ background: "#0f0f0f" }}>
<ServiceRecommendPopup key="popup" user={popupUser || {}} />
      <style>{`@keyframes slideDown{from{transform:translateY(-100%);opacity:0}to{transform:translateY(0);opacity:1}} @keyframes ringPulse{0%{box-shadow:0 0 0 0 rgba(192,32,42,0.7)}70%{box-shadow:0 0 0 16px rgba(192,32,42,0)}100%{box-shadow:0 0 0 0 rgba(192,32,42,0)}}`}</style>

      {/* Toast */}
      {toast.show && (
        <div className="fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white"
          style={{ background: toast.type === "success" ? "#1a1a1a" : "#C0202A", border: "1px solid #333" }}>
          {toast.type === "success" ? <CheckCircle className="w-4 h-4" style={{ color: "#4caf7d" }} /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── PRICE QUOTE ALERT (Zomato-style) ── */}
      {pendingQuotes.length > 0 && (
        <div style={{ position: "fixed", top: 90, left: "50%", transform: "translateX(-50%)", zIndex: 90, width: "min(460px,calc(100vw - 24px))", animation: "slideDown 0.4s ease" }}>
          {pendingQuotes.map(bk => (
            <div key={bk.id} style={{ backgroundColor: "#0D0D0D", border: "2px solid #C0202A", borderRadius: 16, padding: 20, marginBottom: 10, boxShadow: "0 16px 48px rgba(192,32,42,0.4)" }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ width: 50, height: 50, borderRadius: "50%", backgroundColor: "#C0202A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, animation: "ringPulse 1.5s infinite" }}>
                  <IndianRupee style={{ width: 22, height: 22, color: "#fff" }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 15, fontWeight: 800, color: "#fff", margin: "0 0 4px" }}>💰 Price Quote Received!</p>
                  <p style={{ fontSize: 12, color: "#aaa", margin: "0 0 8px" }}>
                    <strong style={{ color: "#fff" }}>{bk.vendor_name}</strong> has sent you a price for <strong style={{ color: "#fff" }}>{bk.service_name}</strong>
                  </p>
                  {bk.vendor_response && (
                    <p style={{ fontSize: 12, color: "#999", fontStyle: "italic", margin: "0 0 10px", padding: "6px 10px", background: "#1a1a1a", borderRadius: 8 }}>
                      "{bk.vendor_response}"
                    </p>
                  )}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <p style={{ fontSize: 11, color: "#666", margin: 0 }}>Quoted Amount</p>
                      <p style={{ fontSize: 24, fontWeight: 900, color: "#fff", margin: 0 }}>
                        ₹{Number(bk.quote_amount).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <p style={{ fontSize: 11, color: "#666", margin: 0 }}>Advance Paid</p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#4ADE80", margin: 0 }}>
                        ₹{Number(bk.advance_amount || 99).toLocaleString("en-IN")} ✓
                      </p>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => { setQuoteModal({ open: true, booking: bk }); setQuoteAction("accept"); }}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: "#059669", color: "#fff" }}>
                      ✅ Accept & Proceed
                    </button>
                    <button
                      onClick={() => { setQuoteModal({ open: true, booking: bk }); setQuoteAction("reject"); }}
                      style={{ flex: 1, padding: "10px 0", borderRadius: 10, fontWeight: 800, fontSize: 13, border: "none", cursor: "pointer", backgroundColor: "#C0202A", color: "#fff" }}>
                      ❌ Reject Quote
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Sub-header */}
      <header className="sticky top-0 z-40" style={{ background: "#1a1a1a", borderBottom: "1px solid #2e2e2e" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#C0202A" }}>HomeEase</h1>
              <p className="text-xs mt-0.5" style={{ color: "#666" }}>Your booking dashboard</p>
            </div>
            <div className="flex items-center gap-2">
              {pendingQuotes.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, backgroundColor: "rgba(192,32,42,0.15)", border: "1px solid rgba(192,32,42,0.4)", cursor: "pointer" }}
                  onClick={() => setActiveTab("bookings")}>
                  <Bell className="w-4 h-4" style={{ color: "#C0202A" }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#e05060" }}>
                    {pendingQuotes.length} Quote{pendingQuotes.length > 1 ? "s" : ""} Pending
                  </span>
                </div>
              )}
              <Btn onClick={() => router.push("/services")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold"
                style={{ background: "rgba(192,32,42,0.12)", color: "#e05060", border: "1px solid rgba(192,32,42,0.35)" }}
                hoverStyle={{ background: "rgba(192,32,42,0.25)" }}>
                Browse Services <ArrowUpRight className="w-3.5 h-3.5" />
              </Btn>
              <Btn onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white"
                style={{ background: "#C0202A" }} hoverStyle={{ background: "#a01820" }}>
                <LogOut className="w-4 h-4" /> Logout
              </Btn>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Tabs */}
        <div className="rounded-xl p-1.5 mb-6 flex gap-1 overflow-x-auto"
          style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
          {[
            { id: "bookings",  label: "My Bookings",  icon: Calendar, badge: bookings.filter(b => b.status === "pending" || b.status === "pending_visit" || b.quote_status === "pending_user").length },
            { id: "favorites", label: "Favorites",    icon: Heart,    badge: favorites.length },
            { id: "profile",   label: "Profile",      icon: User,     badge: 0 },
          ].map(tab => (
            <Btn key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="relative flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap"
              style={activeTab === tab.id ? { background: "#C0202A", color: "#fff" } : { color: "#a0a0a0" }}
              hoverStyle={activeTab === tab.id ? {} : { background: "#2a2a2a", color: "#f0f0f0" }}>
              <tab.icon className="w-4 h-4" /> {tab.label}
              {tab.badge > 0 && (
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={activeTab === tab.id ? { background: "#fff", color: "#C0202A" } : { background: "#C0202A", color: "#fff" }}>
                  {tab.badge}
                </span>
              )}
            </Btn>
          ))}
        </div>

        {/* BOOKINGS TAB */}
        {activeTab === "bookings" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold" style={{ color: "#f0f0f0" }}>My Bookings</h2>
              <span className="text-xs px-2.5 py-1 rounded-full" style={{ color: "#777", background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
                {bookings.length} total
              </span>
            </div>

            {bookings.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
                <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: "#2e2e2e" }} />
                <p className="font-medium text-sm" style={{ color: "#666" }}>No bookings yet</p>
                <Btn onClick={() => router.push("/services")}
                  className="mt-4 px-5 py-2 text-white rounded-lg text-sm font-semibold inline-flex items-center gap-1.5"
                  style={{ background: "#C0202A" }} hoverStyle={{ background: "#a01820" }}>
                  Browse Services <ArrowUpRight className="w-3.5 h-3.5" />
                </Btn>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map(b => (
                  <div key={b.id} className="rounded-xl overflow-hidden transition-all"
                    style={{ background: b.quote_status === "pending_user" ? "#100808" : "#1a1a1a", border: `1px solid ${b.quote_status === "pending_user" ? "#5A1A18" : "#2e2e2e"}` }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = b.quote_status === "pending_user" ? "#C0202A" : "#3e3e3e"}
                    onMouseLeave={e => e.currentTarget.style.borderColor = b.quote_status === "pending_user" ? "#5A1A18" : "#2e2e2e"}>
                    <div className="p-4">
                      <div className="flex flex-col sm:flex-row justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <h3 className="font-bold text-sm truncate" style={{ color: "#f0f0f0" }}>
                              {b.vendor_name || "Vendor"}
                            </h3>
                            <StatusBadge status={b.status} />
                            {b.quote_status === "pending_user" && (
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#FCD34D", background: "#2D1800", padding: "2px 8px", borderRadius: 999, animation: "ringPulse 1.5s infinite" }}>
                                💰 QUOTE PENDING
                              </span>
                            )}
                          </div>
                          <p className="text-xs mb-2" style={{ color: "#777" }}>{b.service_name || "Service"}</p>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "#777" }}>
                            {b.date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" style={{ color: "#C0202A" }} />{formatDate(b.date)}</span>}
                            {b.time && <span className="flex items-center gap-1"><Clock className="w-3 h-3" style={{ color: "#C0202A" }} />{b.time}</span>}
                          </div>

                          {/* Quote info on card */}
                       {b.quote_status === "pending_user" && b.quote_amount && (() => {
  const quoteAmt   = Number(b.quote_amount);
  const advanceAmt = Number(b.advance_amount || 99);
  const remaining  = Math.max(0, quoteAmt - advanceAmt);
  return (
    <div style={{ marginTop:8, padding:"10px 12px", background:"#1a0808", border:"1px solid #5A1A18", borderRadius:8 }}>
      <div style={{ display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:8 }}>
        <div>
          <p style={{ fontSize:10, color:"#F1948A", fontWeight:700, margin:0, letterSpacing:"0.06em" }}>VENDOR QUOTE</p>
          <p style={{ fontSize:22, fontWeight:900, color:"#fff", margin:0 }}>₹{quoteAmt.toLocaleString("en-IN")}</p>
          <p style={{ fontSize:10, color:"#888", margin:"2px 0 0" }}>
            ₹{advanceAmt.toLocaleString("en-IN")} paid · ₹{remaining.toLocaleString("en-IN")} on service day
          </p>
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={() => { setQuoteModal({ open:true, booking:b }); setQuoteAction("accept"); }}
            style={{ padding:"7px 12px", borderRadius:8, background:"#059669", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ✅ Accept
          </button>
          <button onClick={() => { setQuoteModal({ open:true, booking:b }); setQuoteAction("reject"); }}
            style={{ padding:"7px 12px", borderRadius:8, background:"#C0202A", color:"#fff", border:"none", cursor:"pointer", fontSize:12, fontWeight:700 }}>
            ❌ Reject
          </button>
        </div>
      </div>
    </div>
  );
})()}

                          {b.quote_status === "accepted" && (
                            <p style={{ marginTop: 6, fontSize: 12, color: "#4ADE80", fontWeight: 700 }}>
                              ✅ Quote accepted — ₹{Number(b.final_amount).toLocaleString("en-IN")} agreed
                            </p>
                          )}
                          {b.quote_status === "rejected" && (
                            <p style={{ marginTop: 6, fontSize: 12, color: "#F1948A" }}>❌ Quote rejected — booking cancelled</p>
                          )}
                          {b.vendor_response && !b.quote_amount && (
                            <p className="mt-2 text-xs rounded-lg px-2.5 py-1.5" style={{ color: "#4da6ff", background: "#001a2e" }}>
                              <span className="font-semibold">Vendor:</span> {b.vendor_response}
                            </p>
                          )}
                          {b.new_date && (
                            <p className="mt-2 text-xs rounded-lg px-2.5 py-1.5" style={{ color: "#b388ff", background: "#1a0a2e" }}>
                              📅 Rescheduled: <span className="font-semibold">{b.new_date} at {b.new_time}</span>
                            </p>
                          )}
                        </div>
                        <div className="flex sm:flex-col items-center sm:items-end gap-2">
                          <Btn onClick={() => setSelectedBooking(b)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                            style={{ background: "#232323", color: "#ccc", border: "1px solid #3a3a3a" }}
                            hoverStyle={{ background: "#2e2e2e", color: "#fff" }}>
                            <FileText className="w-3.5 h-3.5" /> View
                          </Btn>
                          {(b.status === "approved" || b.tracking_status === "en_route") && (
                            <Btn onClick={() => router.push(`/userdashboard/track/${b.id}`)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white"
                              style={{ background: "#1a4a8a" }} hoverStyle={{ background: "#1556a0" }}>
                              <Navigation className="w-3.5 h-3.5" /> Track
                            </Btn>
                          )}
                          {(b.status === "pending_visit" || b.status === "pending" || b.status === "approved") && !b.quote_status && (
                            <Btn onClick={() => handleCancelOpen(b)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                              style={{ background: "rgba(192,32,42,0.1)", color: "#e05060", border: "1px solid rgba(192,32,42,0.3)" }}
                              hoverStyle={{ background: "rgba(192,32,42,0.22)" }}>
                              <XCircle className="w-3.5 h-3.5" /> Cancel
                            </Btn>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* FAVORITES TAB */}
        {activeTab === "favorites" && (
          <div>
            <h2 className="text-lg font-bold mb-4" style={{ color: "#f0f0f0" }}>Saved Vendors</h2>
            {favorites.length === 0 ? (
              <div className="text-center py-16 rounded-xl" style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
                <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: "#2e2e2e" }} />
                <p className="font-medium text-sm" style={{ color: "#666" }}>No favorites yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {favorites.map(fav => {
                  const vid = fav.vendorId || fav.vendor_id;
                  const vendor = vendors.find(v => v.id === vid);
                  if (!vendor) return null;
                  return (
                    <div key={fav.id} className="rounded-xl p-4" style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-sm" style={{ color: "#f0f0f0" }}>{gp(vendor, "businessName", "business_name")}</h3>
                          <p className="text-xs font-medium mt-0.5" style={{ color: "#C0202A" }}>{gp(vendor, "serviceCategory", "service_category")}</p>
                        </div>
                        <Btn onClick={() => toggleFavorite(vendor.id)} className="p-1.5 rounded-full" style={{}} hoverStyle={{ background: "rgba(192,32,42,0.15)" }}>
                          <Heart className="w-4 h-4" style={{ fill: "#C0202A", color: "#C0202A" }} />
                        </Btn>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Btn onClick={() => setSelectedVendor(vendor)}
                          className="flex-1 px-3 py-2 rounded-lg text-xs font-semibold"
                          style={{ background: "#232323", color: "#ccc", border: "1px solid #3a3a3a" }}
                          hoverStyle={{ background: "#2e2e2e", color: "#fff" }}>
                          View Details
                        </Btn>
                        <Btn onClick={() => { localStorage.setItem("selectedVendor", JSON.stringify(vendor)); router.push("/userdashboard/book"); }}
                          className="flex-1 px-3 py-2 text-white rounded-lg text-xs font-semibold"
                          style={{ background: "#C0202A" }} hoverStyle={{ background: "#a01820" }}>
                          Book Now
                        </Btn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="rounded-xl p-6" style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
            <h2 className="text-lg font-bold mb-5" style={{ color: "#f0f0f0" }}>My Profile</h2>
            {userData && (
              <div className="space-y-5">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(192,32,42,0.15)" }}>
                    <User className="w-7 h-7" style={{ color: "#C0202A" }} />
                  </div>
                  <div>
                    <h3 className="font-bold" style={{ color: "#f0f0f0" }}>{userData.name || "User"}</h3>
                    <p className="text-sm" style={{ color: "#777" }}>{userData.email}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4" style={{ borderTop: "1px solid #2a2a2a" }}>
                  {[["Name", userData.name], ["Email", userData.email], ["Phone", userData.phone || "—"], ["Location", userData.location || "—"]].map(([lbl, val]) => (
                    <div key={lbl}>
                      <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: "#555" }}>{lbl}</p>
                      <p className="text-sm" style={{ color: "#e0e0e0" }}>{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ══ QUOTE CONFIRM MODAL ════════════════════════════════ */}
      {quoteModal.open && quoteModal.booking && (
  <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[70]"
    style={{ background: "rgba(0,0,0,0.92)" }}>
    <div className="rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
      style={{ background: "#1a1a1a", border: `2px solid ${quoteAction === "accept" ? "#059669" : "#C0202A"}` }}>
      <div className="px-6 pt-6 pb-4" style={{ background: "#141414" }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
          style={{ background: quoteAction === "accept" ? "rgba(5,150,105,0.15)" : "rgba(192,32,42,0.15)" }}>
          {quoteAction === "accept"
            ? <CheckCircle className="w-6 h-6" style={{ color: "#059669" }} />
            : <XCircle    className="w-6 h-6" style={{ color: "#C0202A" }} />}
        </div>
        <h3 className="font-bold text-lg" style={{ color: "#f0f0f0" }}>
          {quoteAction === "accept" ? "Accept Price Quote?" : "Reject Price Quote?"}
        </h3>
        <p className="text-sm mt-1" style={{ color: "#888" }}>
          {quoteAction === "accept"
            ? `You agree to the total price of ₹${Number(quoteModal.booking.quote_amount).toLocaleString("en-IN")}.`
            : "The booking will be cancelled and the vendor will be informed."}
        </p>
      </div>
 
      <div className="px-6 py-5">
        {quoteAction === "accept" && (() => {
          // ✅ FIXED CALCULATION
          // quote_amount = total price vendor wants for the job
          // advance_amount = ₹99 already paid at booking time (part of the total)
          // remaining = what customer still owes (paid directly to vendor on service day)
          const quoteAmt   = Number(quoteModal.booking.quote_amount);
          const advanceAmt = Number(quoteModal.booking.advance_amount || 99);
          const remaining  = Math.max(0, quoteAmt - advanceAmt);
 
          return (
            <div style={{ background: "#0D1F0D", border: "1px solid #1A3A1A", borderRadius: 10, padding: "12px 14px", marginBottom: 16 }}>
              <p style={{ fontSize:11, color:"#4ADE80", fontWeight:800, letterSpacing:"0.06em", marginBottom:8 }}>
                PRICE SUMMARY
              </p>
 
              {/* Advance already paid */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:12, color:"#aaa" }}>Booking fee (already paid)</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#4ADE80" }}>
                  ₹{advanceAmt.toLocaleString("en-IN")} ✓
                </span>
              </div>
 
              {/* Remaining to pay */}
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                <span style={{ fontSize:12, color:"#aaa" }}>Pay on service day</span>
                <span style={{ fontSize:13, fontWeight:700, color:"#F97316" }}>
                  ₹{remaining.toLocaleString("en-IN")}
                </span>
              </div>
 
              {/* Divider */}
              <div style={{ borderTop:"1px solid #1A3A1A", paddingTop:8 }}>
                <div style={{ display:"flex", justifyContent:"space-between" }}>
                  <span style={{ fontSize:12, fontWeight:700, color:"#fff" }}>Total price</span>
                  <span style={{ fontSize:16, fontWeight:900, color:"#fff" }}>
                    ₹{quoteAmt.toLocaleString("en-IN")}
                  </span>
                </div>
                <p style={{ fontSize:10, color:"#555", marginTop:4 }}>
                  = ₹{advanceAmt.toLocaleString("en-IN")} already paid + ₹{remaining.toLocaleString("en-IN")} on service day
                </p>
              </div>
            </div>
          );
        })()}
 
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setQuoteModal({ open: false, booking: null })}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: "1px solid #3a3a3a", background: "transparent", color: "#aaa", cursor: "pointer", fontWeight: 700, fontSize: 13 }}>
            Back
          </button>
          <button onClick={() => handleQuoteResponse(quoteModal.booking.id, quoteAction)} disabled={actionLoading}
            style={{ flex: 1, padding: 12, borderRadius: 10, border: "none", background: quoteAction === "accept" ? "#059669" : "#C0202A", color: "#fff", cursor: "pointer", fontWeight: 800, fontSize: 13, opacity: actionLoading ? 0.5 : 1 }}>
            {actionLoading ? "Please wait..."
              : quoteAction === "accept" ? "✅ Confirm Accept"
              : "❌ Confirm Reject"}
          </button>
        </div>
      </div>
    </div>
  </div>
)}

      {/* Cancel Modal */}
      {cancelModal.open && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
          style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="rounded-2xl max-w-sm w-full shadow-2xl overflow-hidden"
            style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
            <div className="px-6 pt-6 pb-4" style={{ background: "#141414" }}>
              <AlertCircle className="w-10 h-10 mb-3" style={{ color: "#C0202A" }} />
              <h3 className="font-bold" style={{ color: "#f0f0f0" }}>Cancel Booking?</h3>
            </div>
            <div className="px-6 py-4">
              <label className="block text-xs font-semibold mb-2" style={{ color: "#aaa" }}>Reason *</label>
              <textarea rows={3} value={cancelReason} onChange={e => setCancelReason(e.target.value)}
                placeholder="e.g. Plans changed..."
                className="w-full px-3 py-2.5 text-sm rounded-xl resize-none outline-none"
                style={{ background: "#232323", color: "#e0e0e0", border: "1px solid #3a3a3a" }}
              />
              <div className="flex gap-2 mt-4">
                <Btn onClick={() => setCancelModal({ open: false, booking: null })}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: "#232323", color: "#ccc" }} hoverStyle={{ background: "#2e2e2e" }}>
                  Keep Booking
                </Btn>
                <Btn onClick={handleCancelConfirm} disabled={actionLoading}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                  style={{ background: "#C0202A" }} hoverStyle={actionLoading ? {} : { background: "#a01820" }}>
                  {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Cancel"}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── BOOKING DETAIL MODAL ── */}
{selectedBooking && (
  <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center p-4 z-[60]"
    style={{ background: "rgba(0,0,0,0.92)" }}>
    <div className="rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl"
      style={{ background: "#1a1a1a", border: "1px solid #2e2e2e" }}>

      {/* Header */}
      <div className="sticky top-0 z-10 px-6 py-4 flex justify-between items-center rounded-t-2xl"
        style={{ background: "#141414", borderBottom: "1px solid #2a2a2a" }}>
        <div>
          <h3 className="font-bold text-white">{selectedBooking.service_name || "Booking Details"}</h3>
          <p className="text-xs mt-0.5" style={{ color: "#555" }}>#{selectedBooking.id}</p>
        </div>
        <button onClick={() => setSelectedBooking(null)}
          className="p-1.5 rounded-lg hover:bg-white/5 transition-colors">
          <X className="w-5 h-5" style={{ color: "#555" }} />
        </button>
      </div>

      <div className="p-6 space-y-4">

        {/* Status row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <StatusBadge status={selectedBooking.status} />
          {selectedBooking.quote_status === "accepted" && (
            <span className="text-xs font-bold" style={{ color: "#4ADE80" }}>✅ Quote Accepted</span>
          )}
          {selectedBooking.quote_status === "rejected" && (
            <span className="text-xs font-bold" style={{ color: "#F1948A" }}>❌ Quote Rejected</span>
          )}
          {selectedBooking.quote_status === "pending_user" && (
            <span className="text-xs font-bold" style={{ color: "#FCD34D", background: "#2D1800", padding: "2px 8px", borderRadius: 999 }}>💰 QUOTE PENDING</span>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2">
          {[
            ["Vendor",     selectedBooking.vendor_name   || "—"],
            ["Service",    selectedBooking.service_name  || "—"],
            ["Date",       formatDate(selectedBooking.new_date || selectedBooking.date)],
            ["Time",       selectedBooking.new_time || selectedBooking.time || "—"],
            ["Payment",    selectedBooking.payment_method || "—"],
            ["Booking ID", `#${selectedBooking.id}`],
          ].map(([label, val]) => (
            <div key={label} className="rounded-xl p-3" style={{ background: "#111", border: "1px solid #222" }}>
              <p className="text-xs mb-0.5" style={{ color: "#555" }}>{label}</p>
              <p className="text-xs font-semibold text-white capitalize">{val}</p>
            </div>
          ))}
        </div>

        {/* Amount Breakdown */}
        {(selectedBooking.final_amount || selectedBooking.quote_amount || selectedBooking.advance_amount) && (
          <div className="rounded-xl p-4 space-y-2" style={{ background: "#0D1F0D", border: "1px solid #1A3A1A" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "#4ADE80" }}>Payment Breakdown</p>
            {selectedBooking.advance_amount && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "#888" }}>Booking Fee (Paid)</span>
                <span className="font-bold" style={{ color: "#4ADE80" }}>₹{Number(selectedBooking.advance_amount).toLocaleString("en-IN")} ✓</span>
              </div>
            )}
            {(selectedBooking.final_amount || selectedBooking.quote_amount) && (
              <div className="flex justify-between text-xs">
                <span style={{ color: "#888" }}>Total Amount</span>
                <span className="font-bold text-white">₹{Number(selectedBooking.final_amount || selectedBooking.quote_amount).toLocaleString("en-IN")}</span>
              </div>
            )}
            {selectedBooking.advance_amount && (selectedBooking.final_amount || selectedBooking.quote_amount) && (
              <div className="flex justify-between text-xs pt-2" style={{ borderTop: "1px solid #1A3A1A" }}>
                <span style={{ color: "#888" }}>Remaining (Pay on service day)</span>
                <span className="font-bold" style={{ color: "#F97316" }}>
                  ₹{Math.max(0, Number(selectedBooking.final_amount || selectedBooking.quote_amount) - Number(selectedBooking.advance_amount)).toLocaleString("en-IN")}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Vendor message */}
        {selectedBooking.vendor_response && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#001a2e", border: "1px solid #003a6e", color: "#4da6ff" }}>
            <p className="font-bold mb-1">Vendor Message</p>
            <p>{selectedBooking.vendor_response}</p>
          </div>
        )}

        {/* Rescheduled info */}
        {selectedBooking.new_date && (
          <div className="rounded-xl px-4 py-3 text-xs" style={{ background: "#1a0a2e", border: "1px solid #3a1a5e", color: "#b388ff" }}>
            📅 Rescheduled to <span className="font-bold">{selectedBooking.new_date} at {selectedBooking.new_time}</span>
          </div>
        )}

        {/* Quote accept/reject (if still pending) */}
        {selectedBooking.quote_status === "pending_user" && selectedBooking.quote_amount && (
          <div className="flex gap-2">
            <button onClick={() => { setQuoteModal({ open: true, booking: selectedBooking }); setQuoteAction("accept"); setSelectedBooking(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
              style={{ background: "#059669" }}>
              ✅ Accept Quote
            </button>
            <button onClick={() => { setQuoteModal({ open: true, booking: selectedBooking }); setQuoteAction("reject"); setSelectedBooking(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 transition-all"
              style={{ background: "#C0202A" }}>
              ❌ Reject Quote
            </button>
          </div>
        )}

        {/* Cancel button */}
        {["pending_visit","pending","approved"].includes(selectedBooking.status) && !selectedBooking.quote_status && (
          <button onClick={() => { handleCancelOpen(selectedBooking); setSelectedBooking(null); }}
            className="w-full py-2.5 rounded-xl text-sm font-bold hover:opacity-90 transition-all"
            style={{ background: "rgba(192,32,42,0.12)", color: "#e05060", border: "1px solid rgba(192,32,42,0.3)" }}>
            <XCircle className="w-4 h-4 inline mr-1.5" /> Cancel Booking
          </button>
        )}

        <button onClick={() => setSelectedBooking(null)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold hover:opacity-80 transition-all"
          style={{ background: "#111", color: "#555", border: "1px solid #222" }}>
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}