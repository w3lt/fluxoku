import { motion, type SVGMotionProps, useReducedMotion } from "motion/react";

export type SettingsIconProps = Omit<
  SVGMotionProps<SVGSVGElement>,
  "className"
> & {
  className?: string;
};

const gearVariants = {
  idle: { rotate: 0, scale: 1 },
  hover: { rotate: 180, scale: 1 },
  press: { rotate: 180, scale: 0.9 },
};

/** A settings gear that turns on hover and responds to presses. */
export function SettingsIcon({ className, ...props }: SettingsIconProps) {
  const shouldReduceMotion = useReducedMotion();
  const isLabelled =
    props["aria-label"] != null || props["aria-labelledby"] != null;

  return (
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      focusable="false"
      aria-hidden={isLabelled ? undefined : true}
      initial={false}
      animate="idle"
      whileHover={shouldReduceMotion ? undefined : "hover"}
      whileTap={shouldReduceMotion ? undefined : "press"}
      {...props}
      className={[
        "lucide",
        "lucide-settings-icon",
        "lucide-settings",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <motion.g
        variants={gearVariants}
        transition={{ type: "spring", stiffness: 200, damping: 20 }}
        style={{ transformBox: "view-box", transformOrigin: "center" }}
      >
        <path d="M9.671 4.136a2.34 2.34 0 0 1 4.659 0 2.34 2.34 0 0 0 3.319 1.915 2.34 2.34 0 0 1 2.33 4.033 2.34 2.34 0 0 0 0 3.831 2.34 2.34 0 0 1-2.33 4.033 2.34 2.34 0 0 0-3.319 1.915 2.34 2.34 0 0 1-4.659 0 2.34 2.34 0 0 0-3.32-1.915 2.34 2.34 0 0 1-2.33-4.033 2.34 2.34 0 0 0 0-3.831A2.34 2.34 0 0 1 6.35 6.051a2.34 2.34 0 0 0 3.319-1.915" />
        <circle cx="12" cy="12" r="3" />
      </motion.g>
    </motion.svg>
  );
}
