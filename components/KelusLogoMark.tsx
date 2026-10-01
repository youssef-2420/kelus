import type { SVGProps } from "react";

/** Recall K: a return stroke for the revision loop, used alongside the wordmark. */
export function KelusLogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
      focusable="false"
      className="kelus-logo-mark"
      {...props}
    >
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="10">
        <path d="M29 20v60" />
        <path d="M74 22C66 37 56 46 43 51c14 5 25 15 33 28" />
      </g>
    </svg>
  );
}
