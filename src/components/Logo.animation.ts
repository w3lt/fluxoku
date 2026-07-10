type LogoSize = "large" | "small";
type LogoEasing = "easeIn" | "easeOut";

export interface LogoAnimationConfig {
  animate: { y: number | number[] };
  transition?: {
    duration: number;
    ease: LogoEasing[];
    repeat: number;
    repeatDelay: number;
    times: number[];
  };
}

export function getLogoAnimation(
  size: LogoSize,
  shouldReduceMotion: boolean,
): LogoAnimationConfig {
  if (size === "small" || shouldReduceMotion) {
    return { animate: { y: 0 } };
  }

  return {
    animate: { y: [-40, 0, -10, 0, -3, 0] },
    transition: {
      duration: 1.15,
      ease: ["easeIn", "easeOut", "easeIn", "easeOut", "easeIn"],
      repeat: Infinity,
      repeatDelay: 2,
      times: [0, 0.42, 0.6, 0.74, 0.88, 1],
    },
  };
}
