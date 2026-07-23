import type { CSSProperties } from "react";

/**
 * Electric-current meters — the intermittent, glowing "vein" of discharge that
 * traces the read-only ART↔CODE meter on the extreme tiles of the Gallery grid.
 *
 * Purely decorative: it must never affect layout, hit-testing, or the meter's
 * own position marker (it renders `pointer-events:none`, and the marker is
 * stacked above it in HomeApp). Contract mirrors the Claude Design mockup
 * ("Mushogenshin website redesign", Home.dc.html) — see
 * `handoff/electric-current.md` there. Every number below is the mockup's
 * *baked* (settled) value; keep them byte-for-byte in sync.
 *
 * Two flavors, chosen by a tile's `meter` (0 = all art, 100 = all code):
 *   - art-heavy  (meter ≤ 26) → cool **Ice** spark: crisp, faster crackle, short burn-out.
 *   - code-heavy (meter ≥ 74) → warm **Ember** fire: thicker, slow crackle, long lingering die-out.
 *   - mid-spectrum tiles (27–73) get nothing.
 */

export type TeslaKind = "art" | "code";

/**
 * Stroke + glow-shadow palettes. `sh1`/`sh2` are the raw `r,g,b` triples for the
 * two drop-shadows; their alphas are derived per-flavor from `glow` in
 * {@link teslaParamsFor} (Ice's glow of 1.4 is why the alphas are clamped).
 */
const TESLA_PALETTES: Record<
  "Ice" | "Ember",
  { glow: string; mid: string; core: string; sh1: string; sh2: string }
> = {
  Ice: { glow: "#9fe8ff", mid: "#d8f6ff", core: "#ffffff", sh1: "170,235,255", sh2: "90,200,255" },
  Ember: { glow: "#f0821f", mid: "#ffcf8a", core: "#fff4e0", sh1: "240,130,31", sh2: "200,70,10" },
};

/**
 * The two baked parameter sets — the single source of truth for the effect.
 *   cycle    full period (s): dormant + burst + burn-out.
 *   life     % of the cycle spent igniting + flickering.
 *   dim      % of the cycle spent diminishing (the burn-out tail); Ember's larger
 *            value is what gives the fire its long, ~3× slower die-out.
 *   modSpeed turbulence sweep duration (s) — HIGHER = calmer/slower crackle.
 *   modDepth turbulence baseFrequency swing — bigger = more writhing.
 *   glow     glow-strength multiplier on the drop-shadow alphas (may exceed 1).
 *   thick    core stroke width (px, non-scaling).
 *   wander   vertical amplitude of the vein's travel.
 *   peak     MAX opacity of the whole effect (scales the entire flicker envelope).
 *   kf       the generated @keyframes name (see {@link TESLA_KEYFRAMES_CSS}).
 *   filt     the turbulence-filter id prefix (suffixed F/B per direction).
 */
const TESLA = {
  art: {
    color: "Ice",
    cycle: 7.5,
    life: 13,
    dim: 5,
    modSpeed: 1.9,
    modDepth: 0.05,
    glow: 1.4,
    thick: 1.2,
    wander: 8.5,
    peak: 0.87,
    kf: "teslaFlickerArt",
    filt: "teslaArt",
  },
  code: {
    color: "Ember",
    cycle: 12.5,
    life: 12,
    dim: 14,
    modSpeed: 4.5,
    modDepth: 0.035,
    glow: 1.05,
    thick: 2,
    wander: 7.5,
    peak: 0.65,
    kf: "teslaFlickerCode",
    filt: "teslaCode",
  },
} as const satisfies Record<
  TeslaKind,
  {
    color: keyof typeof TESLA_PALETTES;
    cycle: number;
    life: number;
    dim: number;
    modSpeed: number;
    modDepth: number;
    glow: number;
    thick: number;
    wander: number;
    peak: number;
    kf: string;
    filt: string;
  }
>;

/** Which flavor (if any) a tile's meter earns. Mid-spectrum tiles get `null`. */
export function teslaKindFor(meter: number): TeslaKind | null {
  return meter <= 26 ? "art" : meter >= 74 ? "code" : null;
}

/**
 * Resolve a flavor's palette with drop-shadow alphas baked in. The alphas scale
 * with `glow` but are clamped to 1 — Ice's `glow` of 1.4 would otherwise push
 * `0.95 * glow` past a valid alpha.
 */
function teslaParamsFor(kind: TeslaKind) {
  const t = TESLA[kind];
  const base = TESLA_PALETTES[t.color];
  return {
    ...t,
    pal: {
      glow: base.glow,
      mid: base.mid,
      core: base.core,
      sh1: `rgba(${base.sh1},${Math.min(1, 0.95 * t.glow).toFixed(2)})`,
      sh2: `rgba(${base.sh2},${Math.min(1, 0.55 * t.glow).toFixed(2)})`,
    },
  };
}

/**
 * A thin lightning "vein" running along the meter (viewBox `0..200` × `0..26`,
 * centered at `y=13`): a slow sine for the wrapping travel, plus a seeded random
 * walk so no two veins are alike and it never reads as a clean sine.
 *
 * The PRNG is mulberry32, seeded from the tile's `meter`, so the path is
 * **deterministic across re-renders** — critical, because re-randomizing per
 * render would make the wire visibly twitch on every React update (see handoff
 * gotcha). Callers must therefore derive `seed` from `meter`, never from a
 * changing value.
 *
 * @param seed  Integer PRNG seed (derived from the tile's meter).
 * @param amp   Vertical amplitude of both the travel wave and the random walk.
 * @param phase Phase offset for the travel sine, so bundled veins diverge.
 * @returns     An SVG path `d` string (21 points, x from 5→195).
 */
function makeVein(seed: number, amp: number, phase: number): string {
  let a = seed >>> 0;
  const rnd = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const n = 20;
  let walk = 0;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const x = 5 + (190 * i) / n;
    walk = walk * 0.55 + (rnd() - 0.5) * amp * 1.4; // drifting random walk
    const wave = Math.sin((i / n) * Math.PI * 2.3 + phase) * amp * 0.55; // gentle travel
    let y = 13 + wave + walk;
    y = Math.max(3.5, Math.min(22.5, y));
    d += (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1) + " ";
  }
  return d.trim();
}

/**
 * Build one flicker `@keyframes` from a flavor's `life`/`dim`/`peak`. Shape:
 * dormant (opacity 0) → ignition + flicker across `life`% → diminishing burn-out
 * across `dim`% → 0. The fixed step arrays are the mockup's hand-tuned envelope;
 * `× peak` scales the *whole* envelope so the effect maxes out at `peak` opacity.
 */
function buildFlicker(name: string, life: number, dim: number, peak: number): string {
  const p = peak != null ? peak : 1;
  const s = Math.max(0, 100 - life - dim); // ignition start %
  let k = `0%,${s.toFixed(1)}%{opacity:0}`;
  const vals = [0.55, 0.9, 0.7, 1, 0.72, 0.92, 0.65, 0.88, 0.6, 0.78]; // ignition + flicker
  vals.forEach((v, i) => {
    k += `${(s + (life * (i + 1)) / (vals.length + 1)).toFixed(1)}%{opacity:${(v * p).toFixed(3)}}`;
  });
  const tail = [0.5, 0.34, 0.2, 0.1, 0.04]; // long diminish burn-out
  const t0 = s + life;
  tail.forEach((v, i) => {
    k += `${(t0 + (dim * (i + 1)) / (tail.length + 1)).toFixed(1)}%{opacity:${(v * p).toFixed(3)}}`;
  });
  k += `100%{opacity:0}`;
  return `@keyframes ${name}{${k}}`;
}

/**
 * Both flicker keyframes, precomputed at build time (the params are constant, so
 * — unlike the mockup, which briefly kept them tweakable — no runtime injection
 * is needed). Emit once into a `<style>` tag: see `TeslaDefs.astro`.
 */
export const TESLA_KEYFRAMES_CSS: string = [
  buildFlicker(TESLA.art.kf, TESLA.art.life, TESLA.art.dim, TESLA.art.peak),
  buildFlicker(TESLA.code.kf, TESLA.code.life, TESLA.code.dim, TESLA.code.peak),
].join("\n");

/** Center of the turbulence `baseFrequency` sweep (shared by both flavors). */
const TURB_CENTER = { bx: 0.069, by: 0.23 };

/**
 * The `baseFrequency` sweep for one filter direction. A single directional SMIL
 * sweep (not a back-and-forth — that reads as too busy): `F` goes low→high, `B`
 * is the reverse. `base` is the starting pair (the filter's static
 * `baseFrequency` attribute before SMIL takes over).
 */
function teslaTurbulence(kind: TeslaKind, dir: "F" | "B") {
  const d = TESLA[kind].modDepth;
  const { bx, by } = TURB_CENTER;
  const fwd = `${(bx - d).toFixed(3)} ${(by - 3 * d).toFixed(3)};${(bx + d).toFixed(3)} ${(by + 3 * d).toFixed(3)}`;
  const values = dir === "F" ? fwd : fwd.split(";").reverse().join(";");
  return { values, dur: TESLA[kind].modSpeed, base: values.split(";")[0] };
}

/**
 * Static descriptors for the four turbulence filters (Ice/Ember × forward/back),
 * consumed once by `TeslaDefs.astro` to render the SVG `<defs>`. Adjacent tiles
 * pick opposite directions (`meter % 2`) so their veins drift apart. The `seed`s
 * are arbitrary-but-fixed so each filter's turbulence field looks distinct.
 */
export interface TeslaFilterDef {
  id: string;
  animId: string;
  seed: number;
  /** Starting `baseFrequency` attribute value. */
  base: string;
  /** SMIL `values` list for the `baseFrequency` animation. */
  values: string;
  /** SMIL `dur` in seconds. */
  dur: number;
}

function filterDef(
  id: string,
  animId: string,
  kind: TeslaKind,
  dir: "F" | "B",
  seed: number,
): TeslaFilterDef {
  return { id, animId, seed, ...teslaTurbulence(kind, dir) };
}

export const TESLA_FILTER_DEFS: TeslaFilterDef[] = [
  filterDef("teslaArtF", "teslaAnimArtF", "art", "F", 7),
  filterDef("teslaArtB", "teslaAnimArtB", "art", "B", 11),
  filterDef("teslaCodeF", "teslaAnimCodeF", "code", "F", 3),
  filterDef("teslaCodeB", "teslaAnimCodeB", "code", "B", 17),
];

/**
 * Everything HomeApp needs to render one tile's discharge overlay. All fields are
 * pure functions of `meter`, so this is computed **once** per tile (never inside
 * the dial-driven render path).
 */
export interface TeslaTile {
  /** Which flavor this tile earned — surfaced as `data-electric` on the overlay. */
  kind: TeslaKind;
  /** Inline style for the absolutely-positioned overlay wrapper (`inset:-8px 0`). */
  overlayStyle: CSSProperties;
  /**
   * The `animation` shorthand for a **primed** spark: identical to the one baked
   * into {@link overlayStyle} except the stagger `delay` is replaced by a
   * *negative* delay that fast-forwards the playhead straight to the ignition
   * point, so the tile discharges immediately. Applied (via a key/remount) to the
   * one tile kicked after a filter reset — see the prime-one-spark logic in
   * HomeApp and `handoff/electric-current.md`. The animation is still `infinite`,
   * so after the primed spark the tile simply continues its normal cadence.
   */
  primedAnimation: string;
  /** `url(#…)` reference for the two filtered strands. */
  filterUrl: string;
  /** Bundled-wire look: two independently-seeded veins (path 3 reuses path 1). */
  veinPath: string;
  veinPath2: string;
  strokeGlow: string;
  strokeMid: string;
  strokeCore: string;
  /** Stroke widths for the glow / mid / crisp-core strands. */
  veinW: number;
  veinW2: number;
  veinW3: number;
}

/**
 * Compute the discharge overlay descriptor for a tile, or `null` if its meter
 * sits in the inert mid-spectrum.
 *
 * NOTE — `animation-fill-mode: both` is **mandatory** in the shorthand below.
 * Without it, during the per-tile start `delay` the overlay sits at its natural
 * opacity (1 = bold), so on first paint (and after any reflow-remount) the vein
 * flashes full-strength before the first cycle, ignoring `peak`. `both` holds the
 * invisible 0%-frame through the delay. This was a real "first batch bold, next
 * batch faint" bug — do not drop it.
 *
 * @param meter The tile's 0–100 position on the art↔code spectrum.
 */
export function teslaForTile(meter: number): TeslaTile | null {
  const kind = teslaKindFor(meter);
  if (!kind) return null;
  const t = TESLA[kind];
  const p = teslaParamsFor(kind);
  const dir = meter % 2 === 0 ? "F" : "B"; // adjacent tiles drift opposite ways
  // Stagger tiles so they don't pulse in unison.
  const delay = (meter % 5) * (t.cycle / 6.5);
  // Primed delay: a negative offset equal to the dormant span, so the playhead
  // begins right at the ignition point (`s`%) and the spark fires immediately.
  const dormantPct = 100 - t.life - t.dim;
  const primeDelay = -(dormantPct / 100) * t.cycle;
  return {
    kind,
    primedAnimation: `${t.kf} ${t.cycle}s linear ${primeDelay.toFixed(2)}s infinite both`,
    filterUrl: `url(#${t.filt}${dir})`,
    veinPath: makeVein(meter * 997 + 13, t.wander, 0),
    veinPath2: makeVein(meter * 631 + 71, t.wander * 0.77, 1.4),
    strokeGlow: p.pal.glow,
    strokeMid: p.pal.mid,
    strokeCore: p.pal.core,
    veinW: t.thick,
    veinW2: t.thick * 0.42,
    veinW3: t.thick * 0.3,
    overlayStyle: {
      position: "absolute",
      inset: "-8px 0", // vertical breathing room so the glow isn't clipped
      pointerEvents: "none",
      zIndex: 2,
      filter: `drop-shadow(0 0 2px ${p.pal.sh1}) drop-shadow(0 0 6px ${p.pal.sh2})`,
      animation: `${t.kf} ${t.cycle}s linear ${delay.toFixed(2)}s infinite both`,
    },
  };
}
