"use client";
import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, User, Star, MapPin, IndianRupee, CalendarCheck, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL ;

// ── Service keyword map ──────────────────────────────────────────────────────
const SERVICE_MAP = [
  { keywords: ["clean", "sweep", "mop", "dust", "sanitiz", "hygiene", "dirt", "mess"], service: "Cleaning", slug: "cleaning", category: "Cleaning" },
  { keywords: ["plumb", "pipe", "leak", "drain", "tap", "faucet", "water", "toilet", "sewage"], service: "Plumbing", slug: "plumbing", category: "Plumbing" },
  { keywords: ["electric", "wiring", "wire", "socket", "switch", "circuit", "power", "light", "fan"], service: "Electrical", slug: "electrical", category: "Electrical" },
  { keywords: ["ac", "air condition", "cooling", "hvac", "refrigerant", "gas fill", "split"], service: "AC Repair", slug: "ac-repair", category: "AC Repair" },
  { keywords: ["paint", "colour", "color", "wall", "brush", "wallpaper", "texture"], service: "Painting", slug: "painting", category: "Painting" },
  { keywords: ["carpentr", "wood", "furniture", "cabinet", "door", "shelf", "wardrobe"], service: "Carpentry", slug: "carpentry", category: "Carpentry" },
  { keywords: ["pest", "insect", "termite", "rodent", "cockroach", "mosquito", "bug"], service: "Pest Control", slug: "pest-control", category: "Pest Control" },
  { keywords: ["garden", "lawn", "plant", "mow", "tree", "landscape"], service: "Gardening", slug: "gardening", category: "Gardening" },
  { keywords: ["move", "shift", "relocat", "pack", "transport"], service: "Moving & Shifting", slug: "moving-shifting", category: "Moving & Shifting" },
  { keywords: ["cctv", "camera", "security", "surveillance"], service: "CCTV & Security", slug: "cctv-security", category: "CCTV & Security" },
];

const QUICK_SERVICES = ["Cleaning", "Plumbing", "AC Repair", "Electrical"];

function detectService(text) {
  const lower = text.toLowerCase();
  for (const entry of SERVICE_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw))) return entry;
  }
  return null;
}

function extractBudget(text) {
  // Match numbers like 500, 1000, 1,500, 1.5k, 2k, etc.
  const clean = text.replace(/,/g, "").toLowerCase();
  const kMatch = clean.match(/(\d+\.?\d*)\s*k/);
  if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);
  const numMatch = clean.match(/\d+/);
  if (numMatch) return parseInt(numMatch[0]);
  return null;
}

function getLoggedInUser() {
  if (typeof window === "undefined") return null;
  try {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("user");
    if (token && user) return JSON.parse(user);
  } catch (_) {}
  return null;
}

// ── Vendor Card Component ────────────────────────────────────────────────────
function VendorCard({ vendor, onBook }) {
  const name    = vendor.business_name || vendor.businessName || "Unknown";
  const rating  = parseFloat(vendor.average_rating || vendor.averageRating || 0);
  const reviews = vendor.review_count || vendor.reviewCount || 0;
  const price   = vendor.pricing;
  const city    = vendor.city || "";
  const desc    = vendor.description || "Professional verified service provider.";

  return (
    <div
      className="rounded-xl overflow-hidden mt-1"
      style={{
        background: "linear-gradient(135deg, #1a1a1a 0%, #111 100%)",
        border: "1px solid #2a2a2a",
        boxShadow: "0 4px 20px rgba(139,0,0,0.1)",
      }}
    >
      {/* Top strip */}
      <div className="h-1.5 w-full" style={{ background: "linear-gradient(to right, #8B0000, #cc0000)" }} />

      <div className="p-3">
        <div className="flex items-start justify-between mb-1.5">
          <p className="text-white font-semibold text-xs leading-tight flex-1 pr-2">{name}</p>
          <span
            className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: "#001a2a", color: "#60a5fa", fontSize: "10px" }}
          >
            <Shield style={{ width: 9, height: 9 }} /> Verified
          </span>
        </div>

        {/* Stars */}
        <div className="flex items-center gap-0.5 mb-1.5">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              style={{
                width: 10, height: 10,
                fill: i < Math.round(rating) ? "#facc15" : "transparent",
                color: i < Math.round(rating) ? "#facc15" : "#2a2a2a",
              }}
            />
          ))}
          <span style={{ fontSize: "10px", color: "#666", marginLeft: 3 }}>({reviews})</span>
        </div>

        <p className="text-xs mb-2 line-clamp-1" style={{ color: "#888", fontSize: "10px" }}>{desc}</p>

        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-0.5">
            {city && (
              <span className="flex items-center gap-1" style={{ fontSize: "10px", color: "#666" }}>
                <MapPin style={{ width: 9, height: 9, color: "#cc0000" }} /> {city}
              </span>
            )}
            {price && (
              <span className="flex items-center gap-0.5 font-semibold" style={{ fontSize: "11px", color: "#22c55e" }}>
                <IndianRupee style={{ width: 9, height: 9 }} />{price}
              </span>
            )}
          </div>
          <button
            onClick={() => onBook(vendor)}
            className="flex items-center gap-1 text-white rounded-lg font-semibold transition-colors"
            style={{
              padding: "5px 10px",
              backgroundColor: "#8B0000",
              fontSize: "10px",
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#cc0000"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#8B0000"; }}
          >
            <CalendarCheck style={{ width: 10, height: 10 }} /> Book
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main ChatBot ─────────────────────────────────────────────────────────────
export default function ChatBot() {
  const router = useRouter();

  const [open, setOpen]       = useState(false);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 0,
      from: "bot",
      text: "Hi! 👋 I'm your **HomeEase** assistant. What home service do you need today? (e.g., *cleaning*, *plumbing*, *AC repair*…)",
    },
  ]);

  // Flow state machine
  const [flowState, setFlowState]           = useState("idle");        // idle | ask_city | ask_service | ask_budget | results
  const [pendingService, setPendingService] = useState(null);          // { service, slug, category }
  const [pendingCity, setPendingCity]       = useState("");

  const messagesEndRef = useRef(null);
  const inputRef       = useRef(null);

  useEffect(() => {
    if (open && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, typing]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // ── Add a bot message ─────────────────────────────────────────────────────
  const addBotMessage = (payload) => {
    setMessages(prev => [...prev, { id: Date.now() + Math.random(), from: "bot", ...payload }]);
  };

  // ── Fetch vendors from backend ────────────────────────────────────────────
  const fetchRecommendations = async (category, city, budget) => {
    setTyping(true);
    try {
      const qp = new URLSearchParams();
      qp.append("query", category.toLowerCase());
      if (city && city.toLowerCase() !== "all") qp.append("city", city);

      const res  = await fetch(`${API_URL}/vendors/search?${qp}`);
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      // Filter: match category slug + pricing within budget
      function toSlug(str = "") {
        return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
      }
      const targetSlug = toSlug(category);

      let matched = list.filter(v => {
        const cat = v.service_category || v.serviceCategory || "";
        return toSlug(cat) === targetSlug || cat.toLowerCase().includes(category.toLowerCase());
      });

      // Budget filter
      if (budget) {
        matched = matched.filter(v => {
          const p = parseFloat((v.pricing || "").toString().replace(/[^0-9.]/g, ""));
          return isNaN(p) || p <= budget;
        });
      }

      // Sort by rating desc
      matched.sort((a, b) =>
        (parseFloat(b.average_rating || b.averageRating || 0)) -
        (parseFloat(a.average_rating || a.averageRating || 0))
      );

      setTyping(false);

      if (matched.length === 0) {
        addBotMessage({
          text: `😔 No vendors found for **${category}** in **${city}** within ₹${budget?.toLocaleString() || "your budget"}. Try a higher budget or different city!`,
          action: { label: "Browse All Vendors →", href: `/services/${toSlug(category)}` },
        });
      } else {
        addBotMessage({
          text: `🎯 Found **${matched.length}** vendor${matched.length > 1 ? "s" : ""} for **${category}** in **${city}** within ₹${budget?.toLocaleString() || "your budget"}! Here are the best matches:`,
          vendors: matched.slice(0, 3),
        });
        if (matched.length > 3) {
          addBotMessage({
            text: `Want to see all **${matched.length}** vendors? Click below.`,
            action: { label: `See All ${category} Vendors →`, href: `/services/${toSlug(category)}?location=${encodeURIComponent(city)}` },
          });
        }
      }
    } catch (err) {
      setTyping(false);
      addBotMessage({ text: "⚠️ Couldn't fetch vendors right now. Please try again shortly." });
    }
    setFlowState("idle");
  };

  // ── Core message handler ──────────────────────────────────────────────────
  const handleUserMessage = async (text) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    // Append user message
    setMessages(prev => [...prev, { id: Date.now(), from: "user", text: trimmed }]);
    setInput("");

    await new Promise(r => setTimeout(r, 600 + Math.random() * 400));

    // ── State: idle ────────────────────────────────────────────────────────
    if (flowState === "idle") {
      const detected = detectService(trimmed);

      if (detected) {
        const user = getLoggedInUser();
        if (!user) {
          // Not logged in — offer login or go to service page
          setTyping(false);
          addBotMessage({
            text: `Got it! You need **${detected.service}** service. 🔧\n\nTo get personalised **budget-friendly vendor recommendations**, please log in first. Or browse all vendors directly.`,
            action:    { label: "🔐 Login for Recommendations", href: "/login" },
            actionAlt: { label: "Browse Vendors →",             href: `/services/${detected.slug}` },
          });
          return;
        }

        // Logged in → ask city
        setPendingService(detected);
        setFlowState("ask_city");
        setTyping(false);
        addBotMessage({
          text: `Great choice! **${detected.service}** service it is 🏠\n\nWhich **city** are you in? (e.g., *Meerut*, *Delhi*, *Lucknow*…)`,
        });
        return;
      }

      // No service detected
      setTyping(false);
      addBotMessage({
        text: "I'm not quite sure what you need. Could you give me more detail? For example: *\"my AC is not cooling\"*, *\"pipe is leaking\"*, or *\"need house cleaning\"*.",
      });
      return;
    }

    // ── State: ask_city ────────────────────────────────────────────────────
    if (flowState === "ask_city") {
      const city = trimmed;
      setPendingCity(city);
      setFlowState("ask_budget");
      setTyping(false);
      addBotMessage({
        text: `📍 Got it — **${city}**!\n\nWhat's your **budget** for this service? (e.g., *₹500*, *1000*, *2k*)`,
      });
      return;
    }

    // ── State: ask_budget ──────────────────────────────────────────────────
    if (flowState === "ask_budget") {
      const budget = extractBudget(trimmed);
      if (!budget) {
        setTyping(false);
        addBotMessage({
          text: "Please enter a valid budget amount like *₹500*, *1500*, or *2k*.",
        });
        return;
      }
      setTyping(true);
      addBotMessage({
        text: `💰 Budget of ₹${budget.toLocaleString()} noted! Searching for the best vendors in **${pendingCity}** for you…`,
      });
      setFlowState("results");
      await fetchRecommendations(pendingService.category, pendingCity, budget);
      return;
    }

    // ── Fallback after results ─────────────────────────────────────────────
    setTyping(false);
    addBotMessage({
      text: "Is there anything else I can help you with? Tell me what home service you're looking for! 🏠",
      action: { label: "Browse All Services →", href: "/services" },
    });
    setFlowState("idle");
  };

  const bookVendor = (vendor) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedVendor", JSON.stringify(vendor));
    }
    router.push("/userdashboard/book");
    setOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleUserMessage(input);
    }
  };

  // Render **bold** and *italic* markdown
  const renderText = (text) =>
    text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1
        ? <strong key={i}>{part}</strong>
        : part.split(/\*(.*?)\*/g).map((p, j) =>
            j % 2 === 1 ? <em key={j}>{p}</em> : p
          )
    );

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Toggle chat assistant"
        className="fixed bottom-6 right-6 z-[999] w-14 h-14 text-white rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110"
        style={{ backgroundColor: "#8B0000" }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#cc0000"; }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#8B0000"; }}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat window */}
      <div
        className={`fixed bottom-24 right-6 z-[998] flex flex-col overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 ${
          open ? "opacity-100 translate-y-0 pointer-events-auto" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        style={{
          width: "360px",
          maxHeight: "560px",
          background: "#0d0d0d",
          border: "1px solid #1f1f1f",
        }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 flex items-center gap-3 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #8B0000 0%, #1a0000 100%)" }}
        >
          <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "rgba(255,255,255,0.15)" }}>
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm leading-tight">HomeEase Assistant</p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
              <span className="text-xs" style={{ color: "#ffaaaa" }}>Online • Ready to help</span>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md transition-colors"
            style={{ color: "rgba(255,255,255,0.5)" }}
            onMouseEnter={e => { e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.color = "rgba(255,255,255,0.5)"; }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-3 space-y-3"
          style={{ background: "#0d0d0d", minHeight: 0 }}
        >
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2 ${msg.from === "user" ? "flex-row-reverse" : "flex-row"}`}>
              {/* Avatar */}
              <div
                className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                style={{ backgroundColor: msg.from === "bot" ? "#8B0000" : "#333" }}
              >
                {msg.from === "bot"
                  ? <Bot className="w-3.5 h-3.5 text-white" />
                  : <User className="w-3.5 h-3.5 text-white" />}
              </div>

              <div className={`flex flex-col gap-1.5 ${msg.from === "user" ? "items-end" : "items-start"}`} style={{ maxWidth: "82%" }}>
                {/* Text bubble */}
                <div
                  className="px-3 py-2 text-sm leading-relaxed rounded-xl"
                  style={{
                    background:   msg.from === "bot" ? "#1a1a1a" : "#8B0000",
                    color:        "#fff",
                    border:       msg.from === "bot" ? "1px solid #2a2a2a" : "none",
                    borderRadius: msg.from === "bot" ? "4px 12px 12px 12px" : "12px 4px 12px 12px",
                  }}
                >
                  {renderText(msg.text)}
                </div>

                {/* Vendor cards */}
                {msg.vendors && msg.vendors.length > 0 && (
                  <div className="w-full flex flex-col gap-2">
                    {msg.vendors.map((v) => (
                      <VendorCard key={v.id} vendor={v} onBook={bookVendor} />
                    ))}
                  </div>
                )}

                {/* Action buttons */}
                {msg.action && (
                  <div className="flex flex-wrap gap-1.5 mt-0.5">
                    <button
                      onClick={() => { router.push(msg.action.href); setOpen(false); }}
                      className="px-3 py-1.5 text-white rounded-lg text-xs font-semibold transition-colors"
                      style={{ backgroundColor: "#8B0000" }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = "#cc0000"; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#8B0000"; }}
                    >
                      {msg.action.label}
                    </button>
                    {msg.actionAlt && (
                      <button
                        onClick={() => { router.push(msg.actionAlt.href); setOpen(false); }}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                        style={{ background: "#1a1a1a", color: "#999", border: "1px solid #2a2a2a" }}
                        onMouseEnter={e => { e.currentTarget.style.background = "#2a2a2a"; }}
                        onMouseLeave={e => { e.currentTarget.style.background = "#1a1a1a"; }}
                      >
                        {msg.actionAlt.label}
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {typing && (
            <div className="flex gap-2">
              <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: "#8B0000" }}>
                <Bot className="w-3.5 h-3.5 text-white" />
              </div>
              <div
                className="px-3 py-2.5 rounded-xl flex items-center gap-1"
                style={{ background: "#1a1a1a", border: "1px solid #2a2a2a" }}
              >
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="block rounded-full"
                    style={{
                      width: 6, height: 6,
                      backgroundColor: "#cc0000",
                      animation: `typingBounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick suggestions — only show when idle */}
        {flowState === "idle" && (
          <div
            className="px-3 pt-2 pb-1 flex-shrink-0"
            style={{ background: "#111", borderTop: "1px solid #1f1f1f" }}
          >
            <div className="flex gap-1.5 flex-wrap">
              {QUICK_SERVICES.map(s => (
                <button
                  key={s}
                  onClick={() => handleUserMessage(`I need ${s}`)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-colors"
                  style={{
                    background: "#1a0000", color: "#cc0000",
                    border: "1px solid #2a0000", fontSize: "11px",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#2a0000"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "#1a0000"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className="px-3 pb-3 pt-1.5 flex gap-2 flex-shrink-0"
          style={{ background: "#111" }}
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              flowState === "ask_city"   ? "Enter your city…" :
              flowState === "ask_budget" ? "Enter your budget (e.g. ₹1500)…" :
              "Ask me anything…"
            }
            className="flex-1 px-3 py-2 text-sm rounded-xl outline-none"
            style={{
              background: "#1a1a1a",
              border:     "1px solid #2a2a2a",
              color:      "#fff",
            }}
          />
          <button
            onClick={() => handleUserMessage(input)}
            disabled={!input.trim()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-30"
            style={{ backgroundColor: "#8B0000" }}
            onMouseEnter={e => { if (input.trim()) e.currentTarget.style.backgroundColor = "#cc0000"; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = "#8B0000"; }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}