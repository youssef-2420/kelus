"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";

type Props = {
  className?: string;
};

export function StudentIllustration({ className }: Props) {
  const reduce = useReducedMotion() === true;
  const [videoFailed, setVideoFailed] = useState(false);
  const showStill = reduce || videoFailed;

  return (
    <figure className={className} aria-hidden="true">
      {showStill ? (
        <motion.img
          src="/hero/student.png"
          alt=""
          width={610}
          height={538}
          animate={reduce ? undefined : { y: [0, 1.2, 0] }}
          transition={reduce ? undefined : { duration: 6.4, repeat: Infinity, ease: "easeInOut" }}
        />
      ) : (
        <video
          className="hero-student-video"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster="/hero/student-poster.png"
          width={960}
          height={640}
          onError={() => setVideoFailed(true)}
        >
          <source src="/hero/student.webm" type="video/webm" />
          <source src="/hero/student.mp4" type="video/mp4" />
        </video>
      )}
    </figure>
  );
}
