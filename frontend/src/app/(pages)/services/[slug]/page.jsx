

"use client";
import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { MapPin, Star, IndianRupee, Shield, Search, Navigation, ArrowLeft, Loader2, Users, CalendarCheck } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const CITIES = ["All Cities", "Lucknow", "Delhi", "Mumbai", "Bangalore", "Hyderabad", "Chennai", "Pune", "Kolkata", "Jaipur", "Ahmedabad", "Moradabad", "Meerut", "Agra", "Varanasi", "Kanpur", "Gajraula", "Amroha", "Rampur", "Sambhal"];

export function toSlug(str = "") {
  return str.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
}

function slugToName(slug = "") {
  return slug.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

// ── Inner component (reads searchParams) ──────────────────────────────────────
function ServiceVendorInner() {
  const params       = useParams();
  const router       = useRouter();
  const searchParams = useSearchParams();

  const slug        = params?.slug || "";
  const displayName = slugToName(slug);

  // ✅ Read location passed from navbar search
  const urlLocation = searchParams.get("location") || "";

  const [vendors,      setVendors]      = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState("");
  const [search,       setSearch]       = useState("");
  const [city,         setCity]         = useState(urlLocation || "All Cities");
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [sortBy,       setSortBy]       = useState("rating");

  // Sync city if URL param changes (e.g. back/forward navigation)
  useEffect(() => {
    if (urlLocation) setCity(urlLocation);
  }, [urlLocation]);

  useEffect(() => {
    if (slug) fetchVendors();
  }, [slug, city]);

  const fetchVendors = async () => {
    setLoading(true);
    setError("");
    try {
      const qp = new URLSearchParams();
      qp.append("query", slug.replace(/-/g, " "));
      // ✅ Always pass the city (either from navbar or from dropdown)
      if (city && city !== "All Cities") qp.append("city", city);

      const res = await fetch(`${API_URL}/vendors/search?${qp}`);
      if (!res.ok) throw new Error("Failed to fetch vendors");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];

      const matched = list.filter((v) => {
        const cat = v.service_category || v.serviceCategory || "";
        return toSlug(cat) === slug;
      });

      setVendors(matched);

      if (matched.length === 1) {
        if (typeof window !== "undefined") {
          localStorage.setItem("selectedVendor", JSON.stringify(matched[0]));
        }
        router.push("/userdashboard/book");
      }
    } catch (err) {
      setError("Could not load vendors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`
          );
          const data = await res.json();
          const detected = data.address?.city || data.address?.town || data.address?.state_district || "";
          if (detected) setCity(detected);
        } catch (_) {}
        setDetectingLoc(false);
      },
      () => setDetectingLoc(false)
    );
  };

  const bookVendor = (vendor) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("selectedVendor", JSON.stringify(vendor));
    }
    router.push("/userdashboard/book");
  };

  const filtered = vendors
    .filter((v) => {
      const q    = search.toLowerCase();
      const name = (v.business_name || v.businessName || "").toLowerCase();
      const desc = (v.description || "").toLowerCase();
      return name.includes(q) || desc.includes(q);
    })
    .sort((a, b) => {
      if (sortBy === "rating") return (b.average_rating || b.averageRating || 0) - (a.average_rating || a.averageRating || 0);
      if (sortBy === "price")  return (a.pricing || 0) - (b.pricing || 0);
      return 0;
    });

  const gp = (v, camel, snake, fb = "") => ((v?.[camel] || v?.[snake] || fb) ?? "").toString();

  return (
    <div className="min-h-screen pt-20" style={{ backgroundColor: "#111111" }}>

      {/* Header */}
      <div className="text-white py-10 px-4" style={{ background: "linear-gradient(to right, #8B0000, #1a1a1a)" }}>
        <div className="max-w-5xl mx-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm mb-4 transition-colors"
            style={{ color: "#CC0000" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#FFFFFF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#CC0000"; }}
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-3xl font-bold mb-1">{displayName}</h1>
          <p className="text-sm" style={{ color: "#999999" }}>
            {loading
              ? "Searching vendors…"
              : `${filtered.length} vendor${filtered.length !== 1 ? "s" : ""} found${city !== "All Cities" ? ` in ${city}` : ""}`}
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* Filters */}
        <div className="rounded-xl p-4 mb-6" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#666666" }} />
              <input
                type="text"
                placeholder="Search vendors by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg outline-none"
                style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#FFFFFF" }}
              />
            </div>

            <div className="flex gap-2">
              {/* ✅ City dropdown — pre-filled with navbar location */}
              <select
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-lg outline-none"
                style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#FFFFFF" }}
              >
                <option value="All Cities">All Cities</option>
                {/* Show typed city at top if not in list */}
                {city !== "All Cities" && !CITIES.includes(city) && (
                  <option value={city}>{city}</option>
                )}
                {CITIES.filter((c) => c !== "All Cities").map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>

              <button
                onClick={detectLocation}
                title="Detect my location"
                className="px-3 py-2.5 text-sm rounded-lg flex items-center gap-1.5 transition-colors"
                style={{ backgroundColor: "#2a0000", color: "#CC0000", border: "1px solid #8B0000" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#3a0000"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#2a0000"; }}
              >
                <Navigation className={`w-4 h-4 ${detectingLoc ? "animate-pulse" : ""}`} />
                <span className="hidden sm:inline">Detect</span>
              </button>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2.5 text-sm rounded-lg outline-none"
                style={{ backgroundColor: "#111111", border: "1px solid #2a2a2a", color: "#FFFFFF" }}
              >
                <option value="rating">Top Rated</option>
                <option value="price">Lowest Price</option>
              </select>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center py-20">
            <Loader2 className="w-10 h-10 animate-spin mb-3" style={{ color: "#CC0000" }} />
            <p className="text-sm" style={{ color: "#999999" }}>Finding the best vendors for you…</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <p className="font-medium" style={{ color: "#CC0000" }}>{error}</p>
            <button
              onClick={fetchVendors}
              className="mt-4 px-5 py-2 text-white rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#8B0000" }}
            >
              Try Again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 rounded-xl" style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a" }}>
            <Users className="w-12 h-12 mx-auto mb-3" style={{ color: "#2a2a2a" }} />
            <p className="font-semibold" style={{ color: "#FFFFFF" }}>No vendors found</p>
            <p className="text-sm mt-1" style={{ color: "#666666" }}>
              {city !== "All Cities"
                ? `No vendors available in "${city}" for this service.`
                : "Try changing the city or clearing search."}
            </p>
            <button
              onClick={() => { setCity("All Cities"); setSearch(""); }}
              className="mt-4 px-5 py-2 text-white rounded-lg text-sm font-semibold"
              style={{ backgroundColor: "#8B0000" }}
            >
              Show All Cities
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((vendor) => {
              const name    = gp(vendor, "businessName", "business_name");
              const cat     = gp(vendor, "serviceCategory", "service_category");
              const desc    = gp(vendor, "description", "description");
              const rating  = vendor.average_rating || vendor.averageRating || 0;
              const reviews = vendor.review_count   || vendor.reviewCount   || 0;

              return (
  <div
    key={vendor.id}
    className="rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-1"
    style={{ backgroundColor: "#1a1a1a", border: "1px solid #2a2a2a", boxShadow: "none" }}
    onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 8px 30px rgba(139,0,0,0.15)"; e.currentTarget.style.borderColor = "#8B0000"; }}
    onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "#2a2a2a"; }}
  >
    {/* Top accent bar */}
    <div style={{ height: 4, background: "#8B0000" }} />

    <div className="p-4">
      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-semibold"
            style={{ backgroundColor: "#2a0000", color: "#CC0000" }}>
            {name.slice(0,2).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-sm leading-tight" style={{ color: "#FFFFFF" }}>{name}</h3>
            <p className="text-xs mt-0.5" style={{ color: "#666" }}>{cat}</p>
          </div>
        </div>
        <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: "#001a2a", color: "#60a5fa", border: "1px solid #003a6e", fontSize: 10 }}>
          <Shield style={{ width: 9, height: 9 }} /> Verified
        </span>
      </div>

      {/* Stars */}
      <div className="flex items-center gap-1 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} style={{ width: 11, height: 11, fill: i < Math.round(parseFloat(rating)) ? "#f59e0b" : "transparent", color: i < Math.round(parseFloat(rating)) ? "#f59e0b" : "#333" }} />
        ))}
        <span className="text-xs ml-1" style={{ color: "#666" }}>({reviews})</span>
      </div>

      {/* Description */}
      <p className="text-xs mb-3 line-clamp-2 leading-relaxed" style={{ color: "#888" }}>
        {desc || "Professional verified service provider with quality assurance."}
      </p>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg p-2" style={{ backgroundColor: "#161616" }}>
          <p style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Starting price</p>
          <p className="font-semibold" style={{ fontSize: 13, color: "#22c55e" }}>
            {vendor.pricing ? `₹ ${vendor.pricing}` : "On request"}
          </p>
        </div>
        {/* <div className="rounded-lg p-2" style={{ backgroundColor: "#161616" }}>
          <p style={{ fontSize: 9, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>Reviews</p>
          <p className="font-semibold" style={{ fontSize: 13, color: "#FFFFFF" }}>{reviews} total</p>
        </div> */}
        {(vendor.city || vendor.state) && (
          <div className="col-span-2 rounded-lg p-2 flex items-center gap-1.5" style={{ backgroundColor: "#161616" }}>
            <MapPin style={{ width: 10, height: 10, color: "#CC0000", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "#888" }}>{[vendor.city, vendor.state].filter(Boolean).join(", ")}</span>
          </div>
        )}
      </div>

      {/* Book button */}
      <button
        onClick={() => bookVendor(vendor)}
        className="w-full flex items-center justify-center gap-1.5 text-white rounded-lg font-semibold transition-colors"
        style={{ padding: "9px 0", backgroundColor: "#8B0000", fontSize: 12 }}
        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "#CC0000"; }}
        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "#8B0000"; }}
      >
        <CalendarCheck style={{ width: 12, height: 12 }} /> Book Service
      </button>
    </div>
  </div>
);
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Wrap in Suspense ──────────────────────────────────────────────────────────
export default function ServiceVendorPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#111111" }}>
        <div className="w-8 h-8 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <ServiceVendorInner />
    </Suspense>
  );
}