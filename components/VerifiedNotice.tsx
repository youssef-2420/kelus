"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function VerifiedNoticeInner() {
  const params = useSearchParams();
  const [visible, setVisible] = useState(() => params.get("verified") === "1");

  useEffect(() => {
    if (!visible) return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has("verified")) return;
    url.searchParams.delete("verified");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="verified-notice" role="status">
      <p>Email verified. Sign in to sync your alerts across devices.</p>
      <button type="button" className="verified-notice-dismiss" onClick={() => setVisible(false)} aria-label="Dismiss verification message">
        ×
      </button>
    </div>
  );
}

export function VerifiedNotice() {
  return (
    <Suspense fallback={null}>
      <VerifiedNoticeInner />
    </Suspense>
  );
}
