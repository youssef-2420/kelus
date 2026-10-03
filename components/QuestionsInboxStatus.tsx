"use client";

import { useSyncExternalStore } from "react";
import { lastRemoteQuestionDeliveryAt } from "@/lib/questions";
import { QUESTIONS_UPDATED_EVENT } from "@/components/QuestionsExport";

function subscribe(listener: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(QUESTIONS_UPDATED_EVENT, listener);
  window.addEventListener("storage", listener);
  return () => {
    window.removeEventListener(QUESTIONS_UPDATED_EVENT, listener);
    window.removeEventListener("storage", listener);
  };
}

function readStamp() {
  return lastRemoteQuestionDeliveryAt();
}

export function QuestionsInboxStatus() {
  const stamp = useSyncExternalStore(subscribe, readStamp, () => null);
  if (!stamp) {
    return (
      <p className="questions-inbox-status" role="status">
        Questions are answered by email. Send in browser to keep a local backup, or email{" "}
        <a href="mailto:hello@kelus.me">hello@kelus.me</a> directly.
      </p>
    );
  }
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(stamp));
  return (
    <p className="questions-inbox-status is-proven" role="status">
      Your question was sent by email from this browser · {label}
    </p>
  );
}
