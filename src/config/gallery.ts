/**
 * Types + taxonomy for the Gallery grid, consumed by the UI after the `gallery`
 * content collection is loaded (see `src/data/gallery.yaml`, `src/content.config.ts`,
 * and index.astro). Mirrors `src/config/throughline.ts`.
 */

/**
 * The work domains, as one readonly tuple so it can be reused verbatim by the Zod
 * `domain` enum in `src/content.config.ts` (no literal duplication needed). "all"
 * is NOT here — it's a synthetic filter-chip value only (see DOMAINS).
 */
export const DOMAIN_VALUES = [
  "sculpture",
  "anatomy",
  "rigging",
  "unreal",
  "apps",
  "tools",
  "verse",
] as const;

export type Domain = (typeof DOMAIN_VALUES)[number];

/** Domain filter chips (order = display order); "all" is the default, prepended. */
export const DOMAINS = ["all", ...DOMAIN_VALUES] as const;

/**
 * The three hero-banner reveal effects (mockup ships all three). By default each
 * tile with a `bannerImagePreview` is assigned one at RANDOM (per page load), so
 * hovering different tiles shows different reveals; a tile can pin a specific one
 * via its `bannerFx` field. See BannerOverlay + handoff/banner-hover-swap.md.
 *   wipe  — diagonal clip-path sweep + Ken Burns
 *   mask  — venetian diagonal-stripe reveal
 *   noise — SVG turbulence blob dissolve (rAF-driven)
 */
export const BANNER_FX_VALUES = ["wipe", "mask", "noise"] as const;
export type BannerFx = (typeof BANNER_FX_VALUES)[number];
/** Fallback effect used at rest (no tile hovered), before any random pick applies. */
export const BANNER_FX_DEFAULT: BannerFx = "wipe";

/** Tuning for the `noise` variant (attributes on <feTurbulence>/<feFuncA>). */
export const BANNER_NOISE = {
  freq: 0.012, // baseFrequency (y = x·1.28); lower = bigger blobs
  octaves: 4, // detail; >4 is wasted computation
  seed: 222,
  dur: 0.5, // dissolve duration, seconds
} as const;

/**
 * One Gallery tile, as consumed by the UI (post content-collection load). `id` is
 * merged from the collection entry id in index.astro (not in the Zod schema), and
 * is the React key + electric-current (Tesla) lookup key + cull/prime Set key.
 */
export interface WorkItem {
  id: string;
  title: string;
  /** Shown in the tile corner. */
  year: number;
  domain: Domain;
  /** Position on the 0 (all art) – 100 (all code) spectrum. Drives culling, the
   *  electric-current overlay, and the grid's art→code sort order. */
  meter: number;
  /** Bespoke per-item accent (hex). Required — persists even when an image is set
   *  (may drive a color strip), so it is never tied to image presence. */
  color: string;
  blurb: string;
  /**
   * Short text placeholder shown in the tile header when {@link image} is absent
   * (e.g. "figurative sculpt"). The graceful fallback so items can adopt R2 images
   * one at a time.
   */
  slot: string;
  /**
   * R2 bucket key for the tile's cover image, resolved to a full URL via `r2()`.
   * Optional: when omitted, the tile falls back to {@link slot}.
   * Example: `"work/fossil/cover.webp"`.
   */
  image?: string;
  /** Alt text for {@link image}. Defaults to {@link title} when omitted. */
  imageAlt?: string;
  /**
   * R2 key for a WIDER/alternate "glimpse" image that swaps over the ART|CODE hero
   * banner while this tile is hovered (resolved via `r2()`). Deliberately a
   * *different* asset from {@link image} — never reuse the tile thumbnail here.
   * See handoff/banner-hover-swap.md.
   */
  bannerImagePreview?: string;
  /** Pin the hero-banner reveal effect for this tile; omit to get a random one
   *  (per page load). One of BANNER_FX_VALUES. */
  bannerFx?: BannerFx;
  href: string;
  /** Tiebreaker for items sharing a `meter` (lower sorts first). Default 0. */
  order?: number;
}
