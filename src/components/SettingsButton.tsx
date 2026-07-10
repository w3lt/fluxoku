import { useState } from "react";
import { useReducedMotion } from "motion/react";

import { SettingsIcon } from "../animated-icons/settings";

type GearState = "idle" | "hover" | "press";

interface SettingsButtonProps {
  className: string;
  iconClassName: string;
  /** Visible text next to the gear; icon-only buttons get an aria-label instead. */
  label?: string;
  onClick: () => void;
}

/** Pill button that opens settings; hosts the animated gear icon. */
export function SettingsButton({ className, iconClassName, label, onClick }: SettingsButtonProps) {
  // The gear is driven from the whole button, so it animates on button
  // hover/press rather than only when the pointer is over the icon itself.
  const [gearState, setGearState] = useState<GearState>("idle");
  const shouldReduceMotion = useReducedMotion();

  return (
    <button
      type="button"
      className={className}
      aria-label={label ? undefined : "Settings"}
      onClick={onClick}
      onPointerEnter={() => setGearState("hover")}
      onPointerLeave={() => setGearState("idle")}
      onPointerDown={() => setGearState("press")}
      onPointerUp={() => setGearState("hover")}
    >
      <SettingsIcon
        className={iconClassName}
        animate={shouldReduceMotion ? "idle" : gearState}
      />
      {label}
    </button>
  );
}
