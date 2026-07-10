import { motion, useReducedMotion } from "motion/react";

import { getLogoAnimation } from "./Logo.animation";
import styles from "./Logo.module.scss";

interface LogoProps {
  size: "large" | "small";
}

/** Gradient wordmark; the "o" is drawn as a ring echoing the ball marker. */
export function Logo({ size }: LogoProps) {
  const shouldReduceMotion = useReducedMotion();
  const animation = getLogoAnimation(size, Boolean(shouldReduceMotion));

  return (
    <span
      className={`${styles.logo} ${size === "large" ? styles.large : styles.small}`}
    >
      Flux
      <motion.span
        className={styles.o}
        aria-hidden="true"
        animate={animation.animate}
        transition={animation.transition}
      />
      ku
    </span>
  );
}
