import { defineCollection, z } from "astro:content";
import { file } from "astro/loaders";

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
    accent: z.enum(["art", "code", "neutral", "converge"]),
    body: z.string(),
  }),
});

export const collections = { throughline };
