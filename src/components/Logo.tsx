import { motion, useReducedMotion } from "motion/react";

import styles from "./Logo.module.scss";

interface LogoProps {
  size: "large" | "small";
}

/** Gradient wordmark; the "o" is drawn as a ring echoing the ball marker. */
export function Logo({ size }: LogoProps) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <span
      className={`${styles.logo} ${size === "large" ? styles.large : styles.small}`}
    >
      Flux
      <motion.span
        className={styles.o}
        aria-hidden="true"
        animate={shouldReduceMotion ? { y: 0 } : { y: [0, -20, 0] }}
        transition={
          shouldReduceMotion
            ? undefined
            : {
              duration: 0.9,
              ease: "easeInOut",
              repeat: Infinity,
            }
        }
      />
      ku
    </span>
  );
}
