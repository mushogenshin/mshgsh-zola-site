import { useEffect, useRef } from "react";
import { BANNER_NOISE, type BannerFx } from "../config/gallery";

interface BannerOverlayProps {
  /** Resolved URL of the hovered tile's banner glimpse (sticky — retained through
   *  the exit fade so the image doesn't vanish before `on` fades it out). */
  src: string;
  /** True while a tile with a `bannerImagePreview` is hovered (Gallery mode). */
  on: boolean;
  /** The hovered tile's effect (per-tile random or its `bannerFx` override). */
  fx: BannerFx;
}

// Faint texture + a bottom legibility shade. Kept deliberately light — a heavier
// stripe scrim eats the cover (tested + rejected at .17 alpha in the mockup).
const SCRIM_STYLE: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
  background:
    "repeating-linear-gradient(48deg, rgba(26,24,21,.06) 0 1px, transparent 1px 20px)," +
    "linear-gradient(0deg, rgba(26,24,21,.22), rgba(26,24,21,0) 45%)",
};

const MASK_IMAGE =
  "repeating-linear-gradient(48deg,#000 0 8px,transparent 8px 17px)," +
  "linear-gradient(48deg,#000 0 52%,transparent 60%)";

/**
 * Per-effect style for the image layer. GOTCHA #1: when `on` is false, transition
 * ONLY opacity — the mask/clip geometry snaps to hidden instantly, so a fast
 * re-enter always replays the full lifecycle instead of interpolating from mid-way.
 */
function variantStyle(fx: BannerFx, on: boolean): React.CSSProperties {
  if (fx === "wipe") {
    return {
      transform: on ? "scale(1)" : "scale(1.06)",
      clipPath: on
        ? "polygon(0% 0%, 170% 0%, 100% 100%, -70% 100%)"
        : "polygon(0% 0%, 0% 0%, -70% 100%, -70% 100%)",
      transition: on
        ? "opacity .25s ease, transform .8s ease, clip-path .6s cubic-bezier(.4,0,.2,1)"
        : "opacity .25s ease",
    };
  }
  if (fx === "mask") {
    const pos = on ? "0px 0px, 0% 100%" : "-68px -76px, 100% 0%";
    return {
      maskImage: MASK_IMAGE,
      WebkitMaskImage: MASK_IMAGE,
      maskRepeat: "repeat, no-repeat",
      WebkitMaskRepeat: "repeat, no-repeat",
      maskSize: "auto, 220% 220%",
      WebkitMaskSize: "auto, 220% 220%",
      maskPosition: pos,
      WebkitMaskPosition: pos,
      maskComposite: "add",
      WebkitMaskComposite: "source-over",
      transition: on
        ? "opacity .25s ease, mask-position 1.05s cubic-bezier(.35,0,.15,1)," +
          " -webkit-mask-position 1.05s cubic-bezier(.35,0,.15,1)"
        : "opacity .25s ease",
    } as React.CSSProperties;
  }
  // noise — dissolve is rAF-driven (see the effect); opacity-only transition here.
  return { filter: "url(#bannerNoise)", transition: "opacity .25s ease" };
}

/**
 * The hero-banner cover swap: a glimpse image revealed over the striped ART|CODE
 * hero when a tile is hovered, via one of three effects. Rendered as the FIRST
 * child of the hero (which must be position:relative + overflow:hidden). See
 * handoff/banner-hover-swap.md.
 */
export default function BannerOverlay({ src, on, fx }: BannerOverlayProps) {
  const funcRef = useRef<SVGFEFuncAElement>(null);
  const blobRaf = useRef(0);

  // noise dissolve: flip the 12 discrete alpha bands 0→1 over BANNER_NOISE.dur so
  // the cover blooms in as organic blobs. Driven directly off the hover state
  // change (GOTCHA #2: a lifecycle-hook trigger silently never fired in the mock).
  useEffect(() => {
    if (fx !== "noise" || !on) return;
    const fn = funcRef.current;
    if (!fn) return;
    cancelAnimationFrame(blobRaf.current);
    const N = 12;
    const dur = BANNER_NOISE.dur * 1000;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - t, 2); // ease-out
      fn.setAttribute(
        "tableValues",
        Array.from({ length: N }, (_, i) => (i < e * N ? "1" : "0")).join(" "),
      );
      if (t < 1) blobRaf.current = requestAnimationFrame(step);
    };
    fn.setAttribute("tableValues", Array(N).fill("0").join(" "));
    blobRaf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(blobRaf.current);
  }, [on, src, fx]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundImage: src ? `url(${src})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        opacity: on ? 1 : 0,
        ...variantStyle(fx, on),
      }}
    >
      <div style={SCRIM_STYLE} />
      {/* Noise filter defs (kept in the DOM always, since any tile may be `noise`).
          SMIL can't animate tableValues in Chrome — the dissolve is JS setAttribute. */}
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
        <filter
          id="bannerNoise"
          x="-2%"
          y="-2%"
          width="104%"
          height="104%"
          colorInterpolationFilters="sRGB"
        >
          <feTurbulence
            id="bannerTurb"
            type="fractalNoise"
            baseFrequency={`${BANNER_NOISE.freq} ${BANNER_NOISE.freq * 1.28}`}
            numOctaves={BANNER_NOISE.octaves}
            seed={BANNER_NOISE.seed}
            stitchTiles="stitch"
            result="n"
          />
          <feColorMatrix
            in="n"
            type="matrix"
            values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0"
            result="na"
          />
          <feComponentTransfer in="na" result="blob">
            {/* resting = all 1s → clean full image before/after; zero residue */}
            <feFuncA ref={funcRef} type="discrete" tableValues="1 1 1 1 1 1 1 1 1 1 1 1" />
          </feComponentTransfer>
          <feComposite in="SourceGraphic" in2="blob" operator="in" />
        </filter>
      </svg>
    </div>
  );
}
