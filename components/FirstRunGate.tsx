"use client";

import Link from "next/link";
import { useReducedMotion } from "motion/react";
import { MapPreviewIllustration, MaterialsPreviewIllustration } from "@/components/how/HowIllustrations";
import { Pressable } from "@/components/motion";

const PREVIEW_TOPICS = ["Elasticity", "Supply & Demand", "Market Structures"] as const;

type FirstRunGateProps = {
  kicker: string;
  title: string;
  body: string;
  ctaHref?: string;
  ctaLabel?: string;
  preview?: "materials" | "map";
};

export function FirstRunGate({
  kicker,
  title,
  body,
  ctaHref = "/today",
  ctaLabel = "Set my exam",
  preview = "materials",
}: FirstRunGateProps) {
  const reduceMotion = useReducedMotion() === true;

  return (
    <section className="materials-empty is-first-run-gate is-booklet-gate">
      <div className="first-run-gate-copy">
        <p className="kicker">{kicker}</p>
        <h1>{title}</h1>
        <p className="first-run-gate-lede">{body}</p>
        <div className="materials-empty-actions">
          <Pressable>
            <Link className="cta" href={ctaHref}>
              {ctaLabel} <span aria-hidden="true">→</span>
            </Link>
          </Pressable>
        </div>
        <p className="first-run-gate-aside">
          Just looking?{" "}
          <Link href="/today?sample=1">Try sample (~1 min)</Link>
        </p>
      </div>
      <aside className="first-run-gate-preview is-booklet-sheet" aria-label="Preview">
        <div className="booklet-sheet-holes" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="booklet-sheet-ruled" aria-hidden="true" />
        <p className="first-run-gate-preview-label">
          {preview === "map"
            ? "What the topic map looks like"
            : "What Materials keeps with your course"}
        </p>
        {preview === "map" ? (
          <MapPreviewIllustration reduceMotion={reduceMotion} concepts={PREVIEW_TOPICS} />
        ) : (
          <MaterialsPreviewIllustration reduceMotion={reduceMotion} />
        )}
      </aside>
    </section>
  );
}
