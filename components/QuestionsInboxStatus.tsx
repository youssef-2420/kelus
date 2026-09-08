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
        Inbox proof: no remote delivery recorded on this device yet. Until then, email{" "}
        <a href="mailto:hello@kelus.me">hello@kelus.me</a> for a guaranteed reply.
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
      Inbox proof: last remote delivery from this browser · {label}
    </p>
  );
}
