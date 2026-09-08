"use client";

import { Suspense, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { activateExamPass, isExamPassReturnQuery } from "@/lib/exam-pass";
import { trackEvent } from "@/lib/analytics";

function ExamPassCaptureInner() {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  useEffect(() => {
    if (!isExamPassReturnQuery(search)) return;
    activateExamPass();
    trackEvent({ name: "exam_pass_activated", source: "checkout_return" });
    const next = new URLSearchParams(search.toString());
    next.delete("pass");
    next.delete("exam_pass");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }, [pathname, router, search]);

  return null;
}

export function ExamPassCapture() {
  return (
    <Suspense fallback={null}>
      <ExamPassCaptureInner />
    </Suspense>
  );
}
