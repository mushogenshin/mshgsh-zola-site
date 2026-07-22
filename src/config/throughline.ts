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
}

/**
 * Which side of the center spine an entry sits on (desktop). Derived purely from
 * position so the timeline auto-alternates — inserting or reordering events in the
 * YAML never requires hand-flipping sides. Even index → right, odd → left, matching
 * the original hand-authored layout.
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
