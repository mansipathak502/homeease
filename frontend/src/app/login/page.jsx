// import { Suspense } from "react";
// import LoginContent from "@/components/LoginContent";

// export default function Page() {
//   return (
//     <Suspense fallback={<div>Loading...</div>}>
//       <LoginContent />
//     </Suspense>
//   );
// }

// app/login/page.jsx — REPLACE with this
"use client";
export const dynamic = "force-dynamic";
import { Suspense } from "react";
import LoginPageInner from "./LoginPageInner";

export default function Page() {
  return (
    <Suspense fallback={<div style={{minHeight:"100vh",background:"#0a0202"}}/>}>
      <LoginPageInner />
    </Suspense>
  );
}