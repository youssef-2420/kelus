"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { kelusMotion } from "@/components/motion";

const transition = kelusMotion.normal;

export function RouteTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion() === true;
  const element = useRef<HTMLDivElement>(null);
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (!element.current || reduceMotion) return;
    const animation = animate(element.current, { opacity: [0.92, 1] }, transition);
    return () => animation.stop();
  }, [pathname, reduceMotion]);

  return (
    <motion.div
      key={pathname}
      ref={element}
      className="route-transition"
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0.08 } : transition}
    >
      {children}
    </motion.div>
  );
}
