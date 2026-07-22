/**
 * Semantic accent tokens for Throughline timeline entries. Each event names an
 * accent instead of a raw hex so the palette stays consistent and hand-editable
 * in `src/data/throughline.yaml`; the mapping to actual colors lives here.
 *
 * Meaning (mirrors the art<->code spine of the site):
 *   art      — art / sculpture / animation milestones (warm)
 *   code     — programming / systems / language milestones (cool)
 *   neutral  — life/biographical beats that aren't art or code (gray)
 *   converge — moments where the two threads meet (green)
 *
 * NOTE: the Zod schema in `src/content.config.ts` enumerates these same four
 * keys — keep the two in sync if you add or rename an accent.
 */
export const ACCENT_COLORS = {
  art: "#e0531f",
  code: "#2f6df0",
  neutral: "#8a8a8a",
  converge: "#4f9d69",
} as const;

export type Accent = keyof typeof ACCENT_COLORS;

/** One Throughline timeline entry, as consumed by the UI (post content-collection load). */
export interface ThroughlineEvent {
  /** Displayed year or range, e.g. "1999" or "2005–08". A string so ranges work. */
  year: string;
  title: string;
  accent: Accent;
  body: string;
  /** Optional behind-the-scenes fact, revealed only when the "trivia" chip is on. */
  trivia?: string;
  /** Marks a personal/life event (vs. professional); hidden unless the "life events" chip is on. */
  life?: boolean;
  /** Pin this entry to a side of the spine; omit to auto-alternate (see sideForIndex). Use sparingly. */
  side?: "l" | "r";
  /** Tiebreaker for entries sharing a year (e.g. the two 2023 entries); lower sorts first. Default 0. */
  order?: number;
}

/**
 * Which side of the center spine an entry sits on (desktop). Derived from the
 * entry's index **in the currently-visible list** (i.e. computed after the life
 * filter), so the zig-zag survives any toggle combination — never from a fixed
 * authored value. Even visible-index → right, odd → left. An authored `side`
 * overrides this per entry (rare). See handoff/throughline.md "side logic".
 */
export function sideForIndex(index: number): "l" | "r" {
  return index % 2 === 0 ? "r" : "l";
}

/**
 * Sort key for ordering the timeline. Astro's `getCollection` returns entries
 * ordered by id, NOT by position in the YAML, so the timeline is instead ordered
 * chronologically by this — meaning entries can sit in any order in the file and
 * still render correctly. Reads the first 4-digit run of `year` (so "2005–08"
 * sorts as 2005); anything without a year sorts to the front.
 */
export function parseTimelineYear(year: string): number {
  const match = year.match(/\d{4}/);
  return match ? Number.parseInt(match[0], 10) : 0;
}
