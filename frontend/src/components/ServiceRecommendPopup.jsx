"use client";
// components/ServiceRecommendPopup.jsx
// ─────────────────────────────────────────────────────────────────────────────
//  AI-Based Smart Service Recommendation Popup
//  Themed to match HomeEase dark + red brand identity
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useCallback, useRef } from "react";
import { getRecommendations } from "../lib/api";

// ── Sub-components ─────────────────────────────────────────────────────────

const StarRating = ({ rating }) => {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <span
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5`}
    >
      {Array(full)
        .fill(0)
        .map((_, i) => (
          <svg
            key={`f${i}`}
            className="w-4 h-4 text-red-500"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      {half && (
        <svg
          className="w-4 h-4 text-red-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <defs>
            <linearGradient id="hg">
              <stop offset="50%" stopColor="currentColor" />
              <stop offset="50%" stopColor="#4b5563" />
            </linearGradient>
          </defs>
          <path
            fill="url(#hg)"
            d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
          />
        </svg>
      )}
      {Array(empty)
        .fill(0)
        .map((_, i) => (
          <svg
            key={`e${i}`}
            className="w-4 h-4 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      <span className="ml-1 text-sm font-semibold text-gray-300">{rating}</span>
    </span>
  );
};

// Vendor card accent colors — red-toned palette for dark theme
const CARD_ACCENTS = [
  { from: "from-red-600", to: "to-rose-700" },
  { from: "from-red-500", to: "to-orange-600" },
  { from: "from-rose-600", to: "to-red-800" },
  { from: "from-orange-600", to: "to-red-600" },
  { from: "from-red-700", to: "to-rose-500" },
  { from: "from-rose-500", to: "to-orange-700" },
];

const VendorCard = ({ vendor, index, onClose }) => {
  const initials = vendor.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const accent = CARD_ACCENTS[index % CARD_ACCENTS.length];
  

  return (
    <div className="group relative bg-[#2a2a2a] rounded-2xl border border-[#3a3a3a] hover:border-red-700/60 shadow-sm hover:shadow-2xl hover:shadow-red-900/20 hover:-translate-y-1 transition-all duration-300 overflow-hidden">
      {/* Top accent bar */}
      <div
        className={`h-1 w-full bg-gradient-to-r ${accent.from} ${accent.to}`}
      />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start gap-4">
          <div
            className={`w-12 h-12 rounded-xl bg-gradient-to-br ${accent.from} ${accent.to} flex items-center justify-center text-white font-bold text-base flex-shrink-0 shadow-lg`}
          >
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-base truncate">
              {vendor.name}
            </h3>
            <p className="text-xs text-red-400 font-medium mt-0.5 truncate">
              {Array.isArray(vendor.skills) ? vendor.skills[0] : vendor.skills}
            </p>
            <div className="mt-1.5">
              <StarRating rating={Number(vendor.rating)} />
            </div>
          </div>

          {/* Price badge */}
          <div className="flex-shrink-0 text-right">
            <span className="inline-block bg-red-950/60 text-red-400 font-bold text-sm px-3 py-1 rounded-full border border-red-800/50">
              ₹{Number(vendor.price).toLocaleString("en-IN")}
            </span>
            <p className="text-xs text-gray-500 mt-1 text-center">per visit</p>
          </div>
        </div>

        {/* Details row */}
        <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[#3a3a3a] flex-wrap">
          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            <span className="font-medium text-gray-300">
              {vendor.experience} yrs
            </span>
            <span>experience</span>
          </div>

          <div className="flex items-center gap-1.5 text-gray-400 text-xs">
            <svg
              className="w-4 h-4 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span className="font-medium text-gray-300">{vendor.location}</span>
          </div>

         <div className="ml-auto flex-shrink-0">
  <span className="inline-flex items-center gap-1 text-xs text-green-400 font-medium bg-green-950/50 px-2 py-0.5 rounded-full border border-green-800/40 whitespace-nowrap">
    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
    Available
  </span>
</div>
        </div>

        {/* Book button */}
        <button
          className={`mt-4 w-full py-2.5 rounded-xl text-white text-sm font-semibold bg-gradient-to-r ${accent.from} ${accent.to} hover:opacity-90 active:scale-[0.98] transition-all duration-150 shadow-md shadow-red-900/30`}
          onClick={() => {
            localStorage.setItem(
              "selectedVendor",
              JSON.stringify({
                id: vendor.id,
                business_name: vendor.name,
                service_category: vendor.skills,
                pricing: vendor.price,
                city: vendor.location,
                years_in_business: vendor.experience,
              }),
            );
             onClose();
            window.location.href = "/userdashboard/book";
          }}
        >
          Book Now
        </button>
      </div>
    </div>
  );
};

// ── Main Popup Component ──────────────────────────────────────────────────────

export default function ServiceRecommendPopup({ user }) {
  const SESSION_KEY = "homeease_recommend_shown";

  

  const hasOpened = useRef(false);
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState("form");
  const [service, setService] = useState("");
  const [budget, setBudget] = useState("");
const [location, setLocation] = useState(
  user?.location || 
  (typeof window !== 'undefined' ? localStorage.getItem("userCity") : "") || 
  ""
);
  const [results, setResults] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    //  if (typeof window === 'undefined') return;
     if (window.location.pathname.includes('/book')) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;
    const timer = setTimeout(() => {
      if (!sessionStorage.getItem(SESSION_KEY)) {
        sessionStorage.setItem(SESSION_KEY + "_opening", "true");
        setIsOpen(true);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);
  // Existing useEffects ke baad add karo
useEffect(() => {
  if (user?.location && !location) {
    setLocation(user.location);
  } else if (!location) {
    const savedCity = localStorage.getItem("userCity");
    if (savedCity) setLocation(savedCity);
  }
}, [user]);

  const handleClose = useCallback(() => {
    sessionStorage.setItem(SESSION_KEY, "true");
    sessionStorage.removeItem(SESSION_KEY + "_opening");
    setIsOpen(false);
  }, []);

  const handleRetry = () => {
    setStep("form");
    setResults(null);
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!service.trim())
      return setError("Please describe the service you need.");
    if (!budget || isNaN(budget) || Number(budget) <= 0)
      return setError("Please enter a valid budget.");
    if (!location.trim()) return setError("Please enter your location.");

    setError("");
    setStep("loading");

    try {
      const data = await getRecommendations({
        service: service.trim(),
        budget: Number(budget),
        location: location.trim(),
      });
      setResults(data);
      setStep("results");
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.error || "Something went wrong. Please try again.",
      );
      setStep("form");
    }
  };

  if (!isOpen) return null;

  // ── Shared input class ──────────────────────────────────────────────────
  const inputCls =
    "w-full px-4 py-3 rounded-xl bg-[#1a1a1a] border border-[#3a3a3a] text-white text-sm " +
    "placeholder-gray-600 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-red-600 " +
    "transition-all";

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
        onClick={(e) => e.target === e.currentTarget && handleClose()}
      >
        {/* ── Modal ── */}
       <div className="relative w-full max-w-3xl bg-[#1e1e1e] rounded-3xl shadow-2xl shadow-black/60 overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-[#2e2e2e]">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 z-10 w-8 h-8 bg-[#2a2a2a] hover:bg-[#3a3a3a] border border-[#3a3a3a] rounded-full flex items-center justify-center transition-colors"
            aria-label="Close"
          >
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>

          {/* ── Header ── */}
          <div className="bg-gradient-to-br from-red-700 via-red-600 to-rose-700 px-6 sm:px-8 py-6 sm:py-7 text-white relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div className="relative flex items-center gap-3 mb-1">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm flex-shrink-0">
                <svg
                  className="w-5 h-5 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-bold">
                  Smart Service Finder
                </h2>
                <p className="text-red-200 text-xs sm:text-sm">
                  AI-powered recommendations just for you
                </p>
              </div>
            </div>
          </div>

          {/* ── Body ── */}
         <div className="max-h-[75vh] overflow-y-auto scrollbar-thin scrollbar-track-[#1e1e1e] scrollbar-thumb-[#3a3a3a] pb-2">
            {/* FORM STEP */}
            {step === "form" && (
              <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5">
                {error && (
                  <div className="flex items-center gap-2 bg-red-950/50 border border-red-800/60 text-red-400 text-sm rounded-xl px-4 py-3">
                    <svg
                      className="w-4 h-4 flex-shrink-0"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {error}
                  </div>
                )}

                {/* Service input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    What service do you need?
                  </label>
                  <input
                    type="text"
                    value={service}
                    onChange={(e) => setService(e.target.value)}
                    placeholder="e.g. AC not cooling, plumber for leak, house painting…"
                    className={inputCls}
                  />
                  <p className="mt-1.5 text-xs text-gray-500">
                    💡 You can describe the problem naturally — our AI will
                    understand
                  </p>
                </div>

                {/* Budget input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Your budget (₹)
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                      ₹
                    </span>
                    <input
                      type="number"
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      placeholder="500"
                      min="1"
                      className={`${inputCls} pl-8`}
                    />
                  </div>
                </div>

                {/* Location input */}
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Location
                 {location && (
  <span className="ml-2 text-xs font-normal text-red-400 bg-red-950/50 border border-red-800/40 px-2 py-0.5 rounded-full">
    ✓ Auto-detected: {location}
  </span>
)}
                  </label>
                  <div className="relative">
                    <svg
                      className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Delhi, Mumbai, Bangalore…"
                      className={`${inputCls} pl-10`}
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-3 rounded-xl border border-[#3a3a3a] text-gray-400 text-sm font-medium hover:bg-[#2a2a2a] hover:text-gray-300 transition-colors"
                  >
                    Skip for now
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 text-white text-sm font-semibold hover:from-red-700 hover:to-rose-700 active:scale-[0.98] transition-all shadow-lg shadow-red-900/40"
                  >
                    Find Best Vendors →
                  </button>
                </div>
              </form>
            )}

            {/* LOADING STEP */}
            {step === "loading" && (
              <div className="flex flex-col items-center justify-center py-16 px-8 gap-5">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-4 border-[#3a3a3a]" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-red-600 animate-spin" />
                  <div className="absolute inset-3 bg-gradient-to-br from-red-600 to-rose-700 rounded-full flex items-center justify-center shadow-lg">
                    <svg
                      className="w-5 h-5 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                      />
                    </svg>
                  </div>
                </div>
                <div className="text-center">
                  <p className="font-semibold text-white">
                    Finding the best vendors for you…
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    Our AI is ranking experts near {location}
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2">
                  {[
                    "Scanning vendors",
                    "Matching skills",
                    "Ranking results",
                  ].map((label, i) => (
                    <span
                      key={i}
                      className="text-xs bg-red-950/50 border border-red-800/40 text-red-400 px-3 py-1 rounded-full font-medium animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* RESULTS STEP */}
            {step === "results" && results && (
              <div className="p-4 sm:p-6">
                {/* Result header */}
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-white">
                      {results.vendors.length > 0
                        ? `Top ${results.vendors.length} Vendors Found`
                        : "No Vendors Found"}
                    </h3>
                    {results.interpreted && (
                      <p className="text-xs text-red-400 mt-0.5">
                        Searched for:{" "}
                        <span className="font-semibold">
                          {results.interpreted}
                        </span>
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleRetry}
                    className="text-xs text-red-400 font-medium border border-red-800/50 bg-red-950/40 hover:bg-red-950/70 px-3 py-1.5 rounded-lg transition-colors"
                  >
                    ← Search Again
                  </button>
                </div>

                {/* Budget suggestion banner */}
                {results.suggestedBudget && (
                  <div className="mb-5 bg-orange-950/40 border border-orange-700/40 rounded-xl p-4 flex items-start gap-3">
                    <svg
                      className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-orange-300">
                        Budget Suggestion
                      </p>
                      <p className="text-xs text-orange-400/80 mt-0.5">
                        {results.message ||
                          `Consider increasing your budget to ₹${results.suggestedBudget} to access more premium vendors.`}
                      </p>
                      <button
                        onClick={() => {
                          setBudget(results.suggestedBudget);
                          handleRetry();
                        }}
                        className="mt-2 text-xs font-semibold text-orange-300 underline underline-offset-2 hover:text-orange-200"
                      >
                        Search with ₹{results.suggestedBudget} →
                      </button>
                    </div>
                  </div>
                )}

                {/* No vendors state */}
                {results.vendors.length === 0 && !results.suggestedBudget && (
                  <div className="text-center py-10 text-gray-600">
                    <svg
                      className="w-12 h-12 mx-auto mb-3 opacity-40"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-medium text-gray-500">
                      No vendors found
                    </p>
                    <p className="text-sm mt-1 text-gray-600">
                      Try a different service or location
                    </p>
                  </div>
                )}

                {/* Vendor cards grid */}
                {results.vendors.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
                    {results.vendors.map((vendor, i) => (
                      <VendorCard key={vendor.id} vendor={vendor} index={i} onClose={handleClose}/>
                    ))}
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6 pt-4 border-t border-[#2e2e2e] flex items-center justify-between">
                  <p className="text-xs text-gray-600">
                    Ranked by rating, experience & price · HomeEase AI
                  </p>
                  <button
                    onClick={handleClose}
                    className="text-xs text-gray-500 hover:text-gray-300 font-medium transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
