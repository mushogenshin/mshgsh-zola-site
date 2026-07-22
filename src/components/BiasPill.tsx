import type { ReactNode } from "react";

interface BiasPillProps {
  bias: number;
  onBias: (v: number) => void;
  /**
   * `fixed` floats at viewport bottom-center (while scrolling the grid); `docked`
   * sits in-flow inside the dock zone under the grid. Same control, same bias — only
   * the positioning differs.
   */
  variant: "fixed" | "docked";
  /** Optional tutorial hand rendered over the slider (used by the fixed variant). */
  tutorial?: ReactNode;
}

const POSITION = {
  // Centered with auto-margins, NEVER translateX(-50%): the fadein entry animation
  // is opacity-only, but keeping auto-margin centering is belt-and-suspenders so a
  // transform can never erase the centering.
  fixed: "fixed left-0 right-0 bottom-[18px] z-[60] mx-auto",
  docked: "relative z-[1]",
} as const;

/**
 * The compact art↔code bias pill — ART · slider · CODE on a glowing white bar.
 * Shared by the floating (fixed) control and its docked copy so the two never drift.
 */
export default function BiasPill({ bias, onBias, variant, tutorial }: BiasPillProps) {
  return (
    <div
      role="group"
      aria-label="Art–code spectrum bias"
      className={`${POSITION[variant]} flex items-center gap-3 w-[min(460px,92vw)] bg-white border-2 border-ink rounded-[40px] px-[18px] py-[10px]`}
      style={{
        boxShadow: "0 10px 34px rgba(26,24,21,.22), 0 0 34px 7px rgba(139,74,224,.6)",
        animation: "fadein .28s ease both, glowpulse 2.8s ease-in-out .3s infinite",
      }}
    >
      <span className="font-mono text-[10px] text-art whitespace-nowrap">ART</span>
      <div className="relative flex-1">
        <input
          type="range"
          min={0}
          max={100}
          value={bias}
          onChange={(e) => onBias(+e.target.value)}
          aria-label="Bias the gallery toward art or code"
          className="bias-range w-full block"
        />
        {tutorial}
      </div>
      <span className="font-mono text-[10px] text-code whitespace-nowrap">CODE</span>
    </div>
  );
}
