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
  href: string;
  /** Tiebreaker for items sharing a `meter` (lower sorts first). Default 0. */
  order?: number;
}
