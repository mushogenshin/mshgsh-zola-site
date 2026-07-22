/**
 * Contract shared with the Claude Design mockup ("Mushogenshin website
 * redesign" project, Home.dc.html) for the Gallery grid's art<->code
 * bias-slider culling behavior. Keys and values must mirror the mockup's
 * own `SPECTRUM_CONFIG` exactly — see handoff/spectrum-culling.md there.
 */
export const SPECTRUM_CONFIG = {
  /** Symmetric: a tile is culled once |dial - tile.meter| exceeds this. */
  cullThreshold: 35,
  /** Near-miss dimming for in-range tiles: opacity = 1 - (dist/100) * fadeStrength. */
  fadeStrength: 0.9,
  /**
   * Fade-out duration (ms) before a culled tile is actually pulled from the
   * grid. Slightly longer than TILE_TRANSITION's duration on purpose (a
   * ~25ms buffer) so the fade has visibly finished before removal — matches
   * the mockup's own 900ms timer vs. 875ms CSS transition.
   */
  collapseMs: 900,
} as const;

/** CSS transition applied to every non-collapsed tile's opacity/transform. */
export const TILE_TRANSITION = "opacity .875s ease, transform .875s ease";

/** Duration/easing for the grid-reflow slide when a tile collapses or returns (react FLIP via @formkit/auto-animate). */
export const REFLOW_ANIMATION = {
  duration: 600,
  easing: "cubic-bezier(0.4, 0, 0.2, 1)",
} as const;
