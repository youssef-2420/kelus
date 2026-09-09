"use client";

import { Suspense, useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isExamPassReturnQuery, redeemExamPass, refreshExamPassStatus } from "@/lib/exam-pass";
import { trackEvent } from "@/lib/analytics";

function ExamPassCaptureInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    void refreshExamPassStatus();
  }, []);

  useEffect(() => {
    const sessionId = search.get("session_id");
    const barePass = search.get("pass") === "1" || search.get("exam_pass") === "success";

    if (!isExamPassReturnQuery(search)) return;

    let cancelled = false;

    async function run() {
      if (sessionId?.startsWith("cs_")) {
        const result = await redeemExamPass({ sessionId });
        if (cancelled) return;
        if (result.ok) {
          trackEvent({ name: "exam_pass_activated", source: "stripe_session" });
          setNote(null);
        } else {
          trackEvent({ name: "exam_pass_redeem_failed", source: "stripe_session" });
          setNote(result.error);
        }
      } else if (barePass) {
        // Do not unlock from a forgeable query flag — send the student to redeem.
        trackEvent({ name: "exam_pass_bare_return", source: "pass_query" });
        setNote("Checkout return noted. Unlock Exam Pass with your Stripe session or redeem code on Pricing.");
      }

      const next = new URLSearchParams(search.toString());
      next.delete("pass");
      next.delete("exam_pass");
      next.delete("session_id");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [pathname, router, search]);

  if (!note) return null;
  return (
    <p className="exam-pass-capture-note" role="status">
      {note}{" "}
      <a href="/pricing/#exam-pass-redeem">Redeem Exam Pass</a>
    </p>
  );
}

export function ExamPassCapture() {
  return (
    <Suspense fallback={null}>
      <ExamPassCaptureInner />
    </Suspense>
  );
}
