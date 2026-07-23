/**
 * Semantic accent tokens for Throughline timeline entries. Each event names an
 * accent instead of a raw hex so the palette stays consistent and hand-editable
 * in `src/data/throughline.yaml`; the mapping to actual colors lives here.
 *
 * Meaning (mirrors the art<->code spine of the site):
 *   art      — art / sculpture / animation milestones (warm orange)
 *   code     — programming / systems / language milestones (cool blue)
 *   neutral  — biographical beats that aren't art or code (gray); kept for real data
 *   life     — personal/life milestones (green, matching the "life events" chip)
 *
 * NOTE: the Zod schema in `src/content.config.ts` enumerates these same four
 * keys — keep the two in sync if you add or rename an accent.
 */
export const ACCENT_COLORS = {
  art: "#e0531f",
  code: "#2f6df0",
  neutral: "#8a8a8a",
  life: "#4f9d69",
} as const;

export type Accent = keyof typeof ACCENT_COLORS;

/**
 * The four "strands" a Thread Detail page (`/thread/{slug}`) runs in parallel — the
 * same taxonomy as Home's Throughline filter chips, kept here as the single source
 * of truth for both. Order = the cross-section lane order on the detail page.
 *   work   — the day job / studio work (implied on every moment; not shown as a masthead chip)
 *   school — education / training
 *   hobby  — side / personal projects
 *   life   — personal / life beats
 */
export const STRAND_VALUES = ["work", "school", "hobby", "life"] as const;
export type Strand = (typeof STRAND_VALUES)[number];

/** Strand → lane/chip color (= Home's filter-chip colors). */
export const STRAND_COLORS: Record<Strand, string> = {
  work: "#1a1815",
  school: "#7d5bd6",
  hobby: "#2f8fd4",
  life: "#4f9d69",
};

/**
 * A single cross-section chip on a Thread Detail page. The linking mode IS the
 * storytelling mechanism — a chip is exactly one of:
 *   - plain: {@link label} only — a fact, no link (tinted pill).
 *   - thread link: {@link label} + {@link thread} — jump to another moment, with a
 *     label authored *per telling* (never derived from the target title, so the same
 *     moment can be referenced differently from different years).
 *   - work panel: {@link label} + {@link work} — opens the in-place work panel
 *     (a gallery id), so the thread view stays put.
 */
export interface ThreadChip {
  label: string;
  /** Slug of another thread moment ({@link ThreadDetail.slug}). */
  thread?: string;
  /** Gallery id whose condensed detail opens in the slide-over panel. */
  work?: string;
}

/**
 * The optional Thread Detail payload for a Throughline entry. An entry WITHOUT this
 * simply has no `/thread/{slug}` page — author them incrementally. See
 * handoff/thread-detail.md. `narrative`/`hindsight.text` are TRUSTED authored HTML
 * (committed copy, rendered via set:html), same rule as {@link WorkItem.body}.
 */
export interface ThreadDetail {
  /** Stable, shareable URL slug, e.g. "2024-fossil-skater-ships". The share target
   *  and the key that `thread`-typed chips + prev/next reference — keep it stable. */
  slug: string;
  /** One-line deck under the H1. */
  standfirst: string;
  /** Short Gaegu aside, masthead top-right (rotate −1.5°). */
  marginalia?: string;
  /** Non-work strands to show as masthead chips (work is always implied). */
  strands?: Strand[];
  /** 1–3 narrative paragraphs (trusted HTML). */
  narrative?: string[];
  /** The cross-section: one lane per strand, each a list of typed chips. */
  crossSection?: { strand: Strand; chips: ThreadChip[] }[];
  /** Gallery ids produced in this period → cards that open the work panel. */
  produced?: string[];
  /** Retrospective note — "HINDSIGHT · WRITTEN FROM {from}". */
  hindsight?: { from: string; text: string };
}

/** One Throughline timeline entry, as consumed by the UI (post content-collection load). */
export interface ThroughlineEvent {
  /** Stable id (the YAML entry `id`); used as the React key and the FLIP row key. */
  id: string;
  /** Displayed year or range, e.g. "1999" or "2005–08". A string so ranges work. */
  year: string;
  title: string;
  accent: Accent;
  body: string;
  /** Optional behind-the-scenes fact, revealed only when the "trivia" chip is on. */
  trivia?: string;
  /** Marks a personal/life event (vs. professional); hidden unless the "life events" chip is on. */
  life?: boolean;
  /** Marks a side/hobby art project; hidden unless the "hobby projects" chip is on. */
  hobby?: boolean;
  /** Marks an education/training milestone. Unlike life/hobby the "school" chip
   *  defaults ON, so these show by default; the chip toggles them OFF. Content-only
   *  (does not affect the spine's shape). */
  school?: boolean;
  /** Pin this entry to a side of the spine; omit to auto-alternate (see sideForIndex). Use sparingly. */
  side?: "l" | "r";
  /** Tiebreaker for entries sharing a year (e.g. the two 2023 entries); lower sorts first. Default 0. */
  order?: number;
  /** Optional per-moment detail page payload (`/thread/{slug}`); absent → no page. */
  detail?: ThreadDetail;
  /**
   * Denormalized {@link ThreadDetail.slug} for the Home timeline. index.astro sets it
   * from `detail?.slug` while dropping the heavy `detail` body, so a Home card can
   * offer a subtle link to its `/thread/{slug}` page (present only when a page exists)
   * without shipping the whole payload into the island's serialized props.
   */
  threadSlug?: string;
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
