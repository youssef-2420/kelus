"use client";

type Props = {
  d: string;
};

export function RouteSignal({ d }: Props) {
  return (
    <circle r="2.4" fill="var(--hero-ink)" opacity="0.72">
      <animateMotion dur="8s" repeatCount="indefinite" path={d} rotate="0" />
    </circle>
  );
}
