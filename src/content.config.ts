import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";
import { BANNER_FX_VALUES, DOMAIN_VALUES } from "./config/gallery";

/**
 * Throughline timeline, loaded from a single hand-editable YAML file
 * (`src/data/throughline.yaml`). Using the `file()` loader keeps all entries in
 * one document — reorder/add/remove there — while the Zod schema validates every
 * entry at build time, so a typo'd accent or a missing field fails the build
 * instead of rendering wrong.
 *
 * The `accent` enum must stay in sync with ACCENT_COLORS in
 * `src/config/throughline.ts` (kept as literals here because Zod needs a literal
 * tuple; the palette module is the source of truth for what each token means).
 */
const throughline = defineCollection({
  loader: file("src/data/throughline.yaml"),
  schema: z.object({
    year: z.string(),
    title: z.string(),
    accent: z.enum(["art", "code", "neutral", "life"]),
    body: z.string(),
    // Optional (see handoff/throughline.md): trivia fact, life-event flag,
    // hobby-project flag, an authored side override, and a same-year tiebreaker.
    trivia: z.string().optional(),
    life: z.boolean().optional(),
    hobby: z.boolean().optional(),
    school: z.boolean().optional(),
    side: z.enum(["l", "r"]).optional(),
    order: z.number().optional(),
  }),
});

/**
 * Gallery tiles, loaded from a single hand-editable YAML file
 * (`src/data/gallery.yaml`). Same `file()`-loader + Zod-validation pattern as
 * throughline. The `domain` enum reuses DOMAIN_VALUES from `src/config/gallery.ts`
 * directly (a readonly tuple → no literal duplication). Tiles render sorted by
 * `meter` (art→code); `id` is merged from the entry id in index.astro, not here.
 */
const gallery = defineCollection({
  loader: file("src/data/gallery.yaml"),
  schema: z.object({
    title: z.string(),
    year: z.number(),
    domain: z.enum(DOMAIN_VALUES),
    meter: z.number(),
    color: z.string(),
    blurb: z.string(),
    slot: z.string(),
    href: z.string(),
    // Optional: adopt R2 cover images one tile at a time; `order` breaks meter ties;
    // bannerImagePreview swaps a glimpse over the hero on hover (a DIFFERENT asset).
    image: z.string().optional(),
    imageAlt: z.string().optional(),
    bannerImagePreview: z.string().optional(),
    bannerFx: z.enum(BANNER_FX_VALUES).optional(),
    order: z.number().optional(),
    // Work Detail page (`/work/{id}`) fields — all optional; see WorkItem docs in
    // src/config/gallery.ts for semantics. `body` is trusted authored HTML.
    standfirst: z.string().optional(),
    marginalia: z.string().optional(),
    status: z.string().optional(),
    yearLabel: z.string().optional(),
    body: z.array(z.string()).optional(),
    meterNote: z.string().optional(),
    media: z
      .array(
        z.object({
          image: z.string().optional(),
          alt: z.string().optional(),
          caption: z.string().optional(),
          placeholder: z.string().optional(),
          color: z.string().optional(),
        }),
      )
      .optional(),
    tools: z.array(z.string()).optional(),
    links: z.array(z.object({ label: z.string(), href: z.string() })).optional(),
    threadContext: z
      .array(z.object({ year: z.string(), label: z.string(), active: z.boolean().optional() }))
      .optional(),
  }),
});

export const collections = { throughline, gallery };
