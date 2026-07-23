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

/**
 * Whether the centered hero tagline card ("Operating greatly in the realm between
 * Art & Programming") stays visible while a hover-banner covers the ART|CODE hero.
 *   true  (default) — card is retained on top of the swapped-in banner (no change).
 *   false           — card fades out (opacity 0 + pointer-events:none) while the
 *                     banner is on, so the cover image reads clean; fades back on exit.
 * Only takes effect in Gallery mode while a banner is actively covering the hero
 * (`bannerOn`). See handoff/banner-swap-tagline-retained.md.
 *
 * Annotated `: boolean` (not left as the literal `true`) precisely because it is a
 * toggle: flip this one line to `false` to enable the fade. The literal type would
 * narrow to `true` and make the `=== false` read at the call site a type error.
 */
export const BANNER_SWAP_TAGLINE_RETAINED: boolean = true;

/** Tuning for the `noise` variant (attributes on <feTurbulence>/<feFuncA>). */
export const BANNER_NOISE = {
  freq: 0.012, // baseFrequency (y = x·1.28); lower = bigger blobs
  octaves: 4, // detail; >4 is wasted computation
  seed: 222,
  dur: 0.5, // dissolve duration, seconds
} as const;

/**
 * One media cell on the Work Detail page (`/work/{id}`). The first entry in a
 * work's {@link WorkItem.media} array is the large 16/10 hero; the rest fill the
 * three-row side column. An entry WITHOUT an {@link image} renders as a
 * tile-style colored placeholder (so a work can adopt real photography one cell
 * at a time, mirroring the Gallery tile's slot→image graceful upgrade).
 */
export interface MediaEntry {
  /**
   * R2 object key (or full `http(s)://` URL) for the cell image, resolved via
   * `r2()`. Omit to render a colored placeholder cell instead.
   */
  image?: string;
  /** Alt text for {@link image}; defaults to the work title when omitted. */
  alt?: string;
  /**
   * Dark caption pill, bottom-left of the cell (e.g. "figure group · 2016 state").
   * Rendered on any cell that sets it — image or placeholder.
   */
  caption?: string;
  /**
   * Faint mono label for a placeholder (imageless) cell, e.g. "wip clay study".
   * Ignored when {@link image} is present (use {@link caption} there instead).
   */
  placeholder?: string;
  /**
   * Background for a placeholder cell (or the letterbox behind a `contain` image).
   * Defaults to the work's own {@link WorkItem.color} when omitted.
   */
  color?: string;
}

/**
 * One node on the detail page's "where this sits on the thread" strip — a small
 * horizontal echo of the Home Throughline. Authored per work (NOT derived: the
 * relevant surrounding moments are an editorial choice). Exactly one node should
 * be {@link active} — the current work — which renders enlarged and accent-colored.
 */
export interface ThreadNode {
  /** Year shown beneath the node, e.g. "2014". */
  year: string;
  /** Short caption beneath the year, e.g. "Cascina begins". */
  label: string;
  /** The current work's node: enlarged (19px), work-colored, with a soft halo. */
  active?: boolean;
}

/**
 * An external link rendered in the detail page's LINKS rail as a bordered row
 * with a trailing `↗`. Always a real, working URL — the Gallery tile's former
 * external `href` moves here (relabeled) once every tile routes internally to
 * `/work/{id}`. No `#` stubs in production.
 */
export interface WorkLink {
  label: string;
  href: string;
}

/**
 * One Gallery tile, as consumed by the UI (post content-collection load). `id` is
 * merged from the collection entry id in index.astro (not in the Zod schema), and
 * is the React key + electric-current (Tesla) lookup key + cull/prime Set key.
 *
 * Fields from {@link standfirst} down are consumed only by the Work Detail page
 * (`src/pages/work/[id].astro`), never the grid; all optional, so a tile can ship
 * with just its Gallery fields and grow a richer detail page later.
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

  // ── Work Detail page only (`/work/{id}`) — all optional ─────────────────────

  /**
   * One-line deck shown under the H1 on the detail page. Seeds from {@link blurb}
   * when omitted, so it is safe to leave unset for works whose blurb reads well
   * as a deck.
   */
  standfirst?: string;
  /**
   * Short handwritten (Gaegu) aside in the title block's top-right, rotated −1.5°
   * — e.g. "19 bathers, surprised mid-river." A voice beat, not a caption.
   */
  marginalia?: string;
  /**
   * Optional status chip in the title row (outline style), e.g. "resuming",
   * "coming soon". Rendered only when present.
   */
  status?: string;
  /**
   * Display string for the year(s), e.g. "2014 — ongoing" — because {@link year}
   * is a bare number for the tile corner. Falls back to `String(year)`.
   */
  yearLabel?: string;
  /**
   * Long-form writeup: one string per paragraph (~2–3 paragraphs). Treated as
   * TRUSTED authored HTML and rendered via `set:html`, so a paragraph may contain
   * light inline markup (`<em>`, `<a>`); it is committed site copy, never runtime
   * user input. Draft from `content/career-context.md` (first person, concrete
   * numbers, honest about gaps — the house voice).
   */
  body?: string[];
  /**
   * Handwritten (Gaegu) annotation centered over the big ART↔CODE meter, e.g.
   * "pure sculpture — not a line of code in this one". Rendered only when present.
   */
  meterNote?: string;
  /** Detail-page media cells; `media[0]` = 16/10 hero, the rest the side column. */
  media?: MediaEntry[];
  /** "Materials & tools" chips (e.g. "ZBrush", "Rust", "egui"). */
  tools?: string[];
  /** External LINKS rows (real URLs only). */
  links?: WorkLink[];
  /** "Where this sits on the thread" nodes (one should be {@link ThreadNode.active}). */
  threadContext?: ThreadNode[];
}
