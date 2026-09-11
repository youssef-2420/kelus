"use client";

import { motion } from "motion/react";

const draw = (reduceMotion: boolean, delay = 0) => ({
  initial: reduceMotion ? false : { pathLength: 0, opacity: 0.35 },
  whileInView: { pathLength: 1, opacity: 1 },
  viewport: { once: true, amount: 0.45 },
  transition: { duration: reduceMotion ? 0.1 : 0.72, delay: reduceMotion ? 0 : delay, ease: [0.16, 1, 0.3, 1] as const },
});

export function MaterialToMapIllustration({ reduceMotion, concepts }: { reduceMotion: boolean; concepts: readonly [string, string, string] }) {
  return (
    <figure className="how-illustration how-material-map">
      <svg viewBox="0 0 640 320" role="img" aria-labelledby="material-map-title material-map-desc">
        <title id="material-map-title">Course pages becoming a confirmed concept map</title>
        <desc id="material-map-desc">Two course documents connect to the confirmed concepts {concepts.join(", ")}.</desc>
        <g className="how-paper-stack">
          <rect x="30" y="54" width="142" height="176" />
          <rect x="48" y="38" width="142" height="176" />
          <path d="M70 76H154M70 94H142M70 128H158M70 146H132M70 180H150" />
          <text x="70" y="62">Course sources</text>
          <text x="70" y="202">PDF · page 7</text>
        </g>
        <motion.path className="how-flow-line" d="M190 124C260 124 252 78 322 78" {...draw(reduceMotion, 0.08)} />
        <motion.path className="how-flow-line is-primary" d="M190 142C270 142 262 158 350 158" {...draw(reduceMotion, 0.18)} />
        <motion.path className="how-flow-line" d="M190 160C262 160 268 238 340 238" {...draw(reduceMotion, 0.28)} />
        <g className="how-concept-node"><circle cx="378" cy="78" r="7" /><text x="396" y="82">{concepts[0]}</text></g>
        <g className="how-concept-node is-primary"><circle cx="406" cy="158" r="11" /><text x="428" y="162">{concepts[1]}</text></g>
        <g className="how-concept-node"><circle cx="396" cy="238" r="7" /><text x="414" y="242">{concepts[2]}</text></g>
        <motion.path className="how-map-link" d="M385 85C396 106 404 126 406 147M411 168C412 194 404 214 398 231" {...draw(reduceMotion, 0.36)} />
        <text className="how-figure-note" x="494" y="292">Confirmed by you</text>
      </svg>
    </figure>
  );
}

export function MapPreviewIllustration({ reduceMotion, concepts }: { reduceMotion: boolean; concepts: readonly [string, string, string] }) {
  return (
    <figure className="how-illustration how-map-preview">
      <svg viewBox="0 0 640 280" role="img" aria-labelledby="map-preview-title map-preview-desc">
        <title id="map-preview-title">Topic map with linked course concepts</title>
        <desc id="map-preview-desc">Three linked topics: {concepts.join(", ")}.</desc>
        <motion.path className="how-map-link is-primary" d="M120 150C210 150 230 70 320 70" {...draw(reduceMotion, 0.06)} />
        <motion.path className="how-map-link" d="M320 70C410 70 430 150 520 150" {...draw(reduceMotion, 0.16)} />
        <motion.path className="how-map-link" d="M320 70C360 120 360 180 320 220" {...draw(reduceMotion, 0.24)} />
        <g className="how-concept-node"><circle cx="120" cy="150" r="10" /><text x="120" y="178" textAnchor="middle">{concepts[0]}</text></g>
        <g className="how-concept-node is-primary"><circle cx="320" cy="70" r="12" /><text x="320" y="48" textAnchor="middle">{concepts[1]}</text></g>
        <g className="how-concept-node"><circle cx="520" cy="150" r="10" /><text x="520" y="178" textAnchor="middle">{concepts[2]}</text></g>
        <g className="how-concept-node"><circle cx="320" cy="220" r="8" /><text x="320" y="248" textAnchor="middle">Exam link</text></g>
        <text className="how-figure-note" x="40" y="268">Importance · prerequisites · what you know</text>
      </svg>
    </figure>
  );
}

export function MaterialsPreviewIllustration({ reduceMotion }: { reduceMotion: boolean }) {
  return (
    <figure className="how-illustration how-materials-preview">
      <svg viewBox="0 0 640 280" role="img" aria-labelledby="materials-preview-title materials-preview-desc">
        <title id="materials-preview-title">Course sources kept with the exam</title>
        <desc id="materials-preview-desc">A syllabus and lecture PDF sit on a shelf with page anchors.</desc>
        <g className="how-paper-stack">
          <rect x="70" y="48" width="150" height="190" />
          <rect x="92" y="36" width="150" height="190" />
          <path d="M114 70H210M114 92H198M114 128H218M114 150H186M114 186H206" />
          <text x="114" y="58">Syllabus.pdf</text>
          <text x="114" y="214">12 pages</text>
        </g>
        <g className="how-paper-stack">
          <rect x="300" y="58" width="150" height="180" />
          <path d="M322 88H418M322 110H406M322 146H426M322 168H394" />
          <text x="322" y="78">Lecture 04.pdf</text>
          <text x="322" y="214">p. 7–9 kept</text>
        </g>
        <motion.path className="how-flow-line is-primary" d="M250 140H292" {...draw(reduceMotion, 0.1)} />
        <g className="how-concept-node is-primary"><circle cx="520" cy="140" r="11" /><text x="540" y="144">Shelf</text></g>
        <text className="how-figure-note" x="40" y="262">Sources stay with the course — not a generic file dump</text>
      </svg>
    </figure>
  );
}
export function TodayRouteIllustration({ reduceMotion, concepts }: { reduceMotion: boolean; concepts: readonly [string, string, string] }) {
  return (
    <figure className="how-illustration how-route-figure">
      <svg viewBox="0 0 640 320" role="img" aria-labelledby="today-route-title today-route-desc">
        <title id="today-route-title">One selected study route through several possibilities</title>
        <desc id="today-route-desc">Kelus chooses a route through {concepts[1]} and {concepts[2]} toward the exam while alternatives remain faint.</desc>
        <path className="how-route-option" d="M58 246C168 268 190 62 322 92S470 258 578 54" />
        <path className="how-route-option" d="M58 246C178 154 238 274 348 224S470 126 578 54" />
        <motion.path className="how-route-active" d="M58 246C154 232 184 176 266 168S410 148 448 108S530 70 578 54" {...draw(reduceMotion, 0.08)} />
        <g className="how-route-you"><circle cx="58" cy="246" r="18" /><text x="58" y="250">You</text></g>
        <g className="how-route-node"><circle cx="266" cy="168" r="8" /><text x="266" y="146">{concepts[1]}</text><text x="266" y="194">18 min</text></g>
        <g className="how-route-node"><circle cx="448" cy="108" r="8" /><text x="448" y="86">{concepts[2]}</text><text x="448" y="134">10 min</text></g>
        <g className="how-route-target"><circle cx="578" cy="54" r="22" /><circle cx="578" cy="54" r="11" /><text x="578" y="24">Exam</text></g>
        <text className="how-figure-note" x="30" y="294">45 minutes · highest value first</text>
      </svg>
    </figure>
  );
}

export function RerouteIllustration({ reduceMotion, concepts, moved }: { reduceMotion: boolean; concepts: readonly [string, string, string]; moved: string }) {
  return (
    <figure className="how-illustration how-reroute-figure">
      <svg viewBox="0 0 640 320" role="img" aria-labelledby="reroute-title reroute-desc">
        <title id="reroute-title">A learning answer changing the next route</title>
        <desc id="reroute-desc">An Almost answer updates {concepts[1]} from 42 to 54 percent and moves {moved} forward in the next route.</desc>
        <g className="how-answer-signal">
          <text x="36" y="50">Your answer</text>
          <rect x="36" y="70" width="116" height="44" />
          <text x="94" y="97">Almost</text>
        </g>
        <motion.path className="how-flow-line is-primary" d="M152 92C208 92 202 160 260 160" {...draw(reduceMotion, 0.08)} />
        <g className="how-mastery-shift">
          <text x="286" y="128">{concepts[1]}</text>
          <text x="286" y="178">42</text><text x="352" y="175">→</text><text className="is-new" x="392" y="178">54</text>
        </g>
        <motion.path className="how-flow-line is-primary" d="M458 160C514 160 504 230 558 230" {...draw(reduceMotion, 0.28)} />
        <g className="how-next-route">
          <text x="442" y="50">Next route</text>
          <text x="442" y="82">01</text><text x="478" y="82">{concepts[1]}</text>
          <text className="is-moved" x="442" y="114">02</text><text className="is-moved" x="478" y="114">{moved} ↑</text>
          <text x="442" y="146">03</text><text x="478" y="146">{concepts[2]}</text>
        </g>
        <text className="how-figure-note" x="36" y="286">New evidence · route recalculated</text>
      </svg>
    </figure>
  );
}
