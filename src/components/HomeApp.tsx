import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import {
  BANNER_FX_DEFAULT,
  BANNER_FX_VALUES,
  DOMAINS,
  type BannerFx,
  type WorkItem,
} from "../config/gallery";
import { r2 } from "../config/r2";
import BannerOverlay from "./BannerOverlay";
import { ACCENT_COLORS, sideForIndex, type ThroughlineEvent } from "../config/throughline";
import { REFLOW_ANIMATION, SPECTRUM_CONFIG, TILE_TRANSITION } from "../config/spectrum";
import { teslaForTile } from "../config/tesla";
import TutorialHand, { type TutorialPhase } from "./TutorialHand";
import BiasPill from "./BiasPill";

const SEEN_DIAL_KEY = "mshgsh_seen_dial";
const LIFE_KEY = "mshgsh_life";
const HOBBY_KEY = "mshgsh_hobby";
const SCHOOL_KEY = "mshgsh_school";
const TRIVIA_KEY = "mshgsh_trivia";

/** True when the user prefers reduced motion — FLIP/fades are skipped and toggles snap. */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Pick a legible ink for text sitting on a given tile `color`: dark ink `#1a1815`
 * on light colors, white on dark ones, via sRGB relative luminance (threshold 0.45).
 * Used by the hover text treatment (the tile body adopts its own color on hover).
 */
function bestInk(hex: string): string {
  const c = hex.replace("#", "");
  const lin = (i: number) => {
    const v = parseInt(c.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const L = 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
  return L > 0.45 ? "#1a1815" : "#ffffff";
}

interface HomeAppProps {
  /** Throughline timeline, loaded from src/data/throughline.yaml by index.astro. */
  throughline: ThroughlineEvent[];
  /** Gallery tiles, loaded from src/data/gallery.yaml by index.astro (sorted by meter). */
  gallery: WorkItem[];
}

type Mode = "gallery" | "through";
type Phase = "collapsed" | "culled" | "entering" | "normal";

const MODE_KEY = "mshgsh_mode";
const BIAS_KEY = "mshgsh_bias";

const btnBase =
  "font-mono text-[12.5px] border-none rounded-full px-[18px] py-[9px] cursor-pointer transition-all duration-[180ms] whitespace-nowrap";

function chipClass(active: boolean) {
  return `font-mono text-[11px] border-2 border-ink rounded-full px-3 py-[5px] cursor-pointer transition-all duration-150 ${
    active ? "bg-ink text-white" : "bg-white text-ink"
  }`;
}

/**
 * A Throughline filter chip (life events / hobby projects / trivia). Signals with
 * its OWN accent, not black — black is reserved for the CTA so chips don't read as
 * CTA siblings. Active: accent border + a 12% accent tint fill (`${accent}1f`) + ink
 * text + filled glowing dot. Inactive: light-neutral border, muted text, a hollow
 * dot that still rings in the accent (a hint of what it controls). See handoff.
 */
function ToggleChip({
  label,
  active,
  accent,
  onToggle,
}: {
  label: string;
  active: boolean;
  accent: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onToggle}
      className="inline-flex items-center gap-[7px] font-mono text-[11px] rounded-[22px] px-[13px] py-[5px] cursor-pointer transition-all duration-150"
      style={{
        border: `2px solid ${active ? accent : "#ded7c8"}`,
        background: active ? `${accent}1f` : "#fff",
        color: active ? "#1a1815" : "#8a8378",
        fontWeight: active ? 600 : 400,
      }}
    >
      <span
        className="w-[7px] h-[7px] rounded-full transition-all duration-150"
        style={{
          background: active ? accent : "transparent",
          boxShadow: active ? `0 0 0 1.5px ${accent}, 0 0 7px 1px ${accent}` : `0 0 0 1.5px ${accent}`,
        }}
      />
      {label}
    </button>
  );
}

/**
 * Winding-road glyph for the Throughline toggle + CTAs (replaces the old `↳`): a
 * single vertical serpentine stroke — the "winding road ahead" sign motif, echoing
 * the timeline's winding-road spine. One continuous `currentColor` path (no separate
 * arrowhead — that read as a question-mark dot), so it inherits the button's color.
 * Authored from the handoff's description; swap if Design ships exact path data.
 */
function RoadIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <path d="M12 21 Q19 17.5 12 14 Q5 10.5 12 7 Q17 4 12 3" />
    </svg>
  );
}

export default function HomeApp({ throughline, gallery }: HomeAppProps) {
  // Electric-current overlay descriptor per tile, keyed by id. Memoized on the
  // stable `gallery` prop so it's computed ONCE: every field is a pure function of
  // the tile's constant `meter`, and the seeded vein paths MUST NOT be regenerated
  // per render or the wire visibly twitches on every dial move (see `tesla.ts`).
  // `[gallery]` is safe because Astro hands the island one array identity that never
  // changes after hydration (the array is built at build time in index.astro).
  const teslaById = useMemo(
    () =>
      Object.fromEntries(gallery.map((it) => [it.id, teslaForTile(it.meter)])) as Record<
        string,
        ReturnType<typeof teslaForTile>
      >,
    [gallery],
  );

  // Tiles whose meter sits further than cullThreshold from the dial. Declared before
  // the `useState(() => cullFor(50))` lazy initializer below, which calls it.
  const cullFor = useCallback(
    (dial: number): Set<string> =>
      new Set(
        gallery
          .filter((it) => Math.abs(it.meter - dial) > SPECTRUM_CONFIG.cullThreshold)
          .map((it) => it.id),
      ),
    [gallery],
  );

  const [mode, setModeState] = useState<Mode>("gallery");
  const [bias, setBiasState] = useState(50);
  const [domain, setDomain] = useState<string>("all");
  const [hover, setHover] = useState<string | null>(null);
  // Hero banner cover swap: the hovered tile's glimpse image + its reveal effect,
  // kept sticky so the exit fade still shows the image (see BannerOverlay). `on`
  // is derived from the live hover below.
  const [bannerSrcFx, setBannerSrcFx] = useState<{ src: string; fx: BannerFx }>({
    src: "",
    fx: BANNER_FX_DEFAULT,
  });

  // Throughline opt-in filters, all default OFF (first paint = clean professional
  // work-thread, no trivia). `life`/`hobby` filter entries in/out of the set;
  // `trivia` reveals facts on already-visible cards. All persist to localStorage.
  const [showLife, setShowLife] = useState(false);
  const [showHobby, setShowHobby] = useState(false);
  // school defaults ON (education entries show by default; the chip toggles them OFF).
  const [showSchool, setShowSchool] = useState(true);
  const [showTrivia, setShowTrivia] = useState(false);
  // Rows mid-exit: kept mounted at opacity 0 (height retained) through their fade,
  // then unmounted at commit so surviving rows FLIP up into the gap. See animateFilter.
  const [rowLeaving, setRowLeaving] = useState<string[]>([]);

  // Throughline floating/docked filter pill — same three-state model as the Gallery
  // bias pill, driven by two observed elements (the top chip row, and a dock buffer
  // under the timeline). See `throughFloatState`.
  const throughAnchorRef = useRef<HTMLDivElement>(null);
  const throughDockRef = useRef<HTMLDivElement>(null);
  const [throughPast, setThroughPast] = useState(false);
  const [throughDockInView, setThroughDockInView] = useState(false);

  // Seeded from the default dial so the first paint already shows the
  // correct cull set — no blank/wrong slots before the mount effect runs.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => cullFor(50));
  const [entering, setEntering] = useState<Set<string>>(() => new Set());

  // Floating bias pill, three states (hidden / fixed / docked). Two observed
  // elements drive it: the inline control (has it scrolled past?) and a dock zone
  // spacer under the grid (has it come into view?). See the derived `floatState`.
  const inlineBiasRef = useRef<HTMLDivElement>(null);
  const dockZoneRef = useRef<HTMLDivElement>(null);
  const [inlinePast, setInlinePast] = useState(false);
  const [dockInView, setDockInView] = useState(false);

  // First-visit dial tutorial hand. Phase machine:
  // swivel → resting (after 5s) → following → leaving → gone (on first interaction).
  // Init 'swivel' so the hand is present in the server HTML and its CSS rock plays
  // on load without waiting for hydration. A returning guest's seen-check effect
  // flips this to 'gone' right after hydration (a brief, acceptable flash) — we
  // can't read localStorage during SSR, so this is the robust trade for making sure
  // a fresh guest always sees the cue even if JS is slow.
  const [tutorialPhase, setTutorialPhase] = useState<TutorialPhase>("swivel");
  const tutDoneRef = useRef(false);
  const tutRestTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tutLeaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const tutGoneTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const collapsedRef = useRef(collapsed);
  useEffect(() => {
    collapsedRef.current = collapsed;
  }, [collapsed]);

  const collapseTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const cullDebounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Timeline FLIP reflow (animated life/hobby toggles). flipFirst holds the "before"
  // rects, flipArmed tells the layout effect to run a FLIP pass, and scrollAnchorArmed
  // pins a row so a docked-chip toggle doesn't jump the page. rowBusy guards against
  // overlapping toggles mid-animation.
  const flipFirst = useRef<Map<string, DOMRect>>(new Map());
  const flipArmed = useRef(false);
  const scrollAnchorArmed = useRef<{ el: HTMLElement; before: number } | null>(null);
  const rowBusy = useRef(false);
  const rowLeaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const rowBusyTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Winding-road spine: a data-driven SVG that's straight with both filters off and
  // bows into an alternating serpentine when life/hobby are on (see updateSpine).
  const spineRef = useRef<SVGSVGElement>(null);
  const spineRaf = useRef(0);
  const spineAmp = useRef(0);
  const spineMorphNext = useRef(false); // set on a filter commit so the next redraw tweens
  const updateSpineRef = useRef<(animate: boolean) => void>(() => {});

  // Prime-one-spark: after a reflow (or on mount) a tile's next discharge can be
  // many dormant seconds away, so the grid feels dead. We kick exactly ONE visible
  // electric tile into an immediate spark (never all — too loud). `primed` maps a
  // tile id to a bump counter; bumping it re-keys that tile's overlay so it
  // remounts with `primedAnimation` (negative delay → ignites now). A monotonic
  // rotor picks a different tile each time. See handoff/electric-current.md.
  const [primed, setPrimed] = useState<Record<string, number>>({});
  const primeRotor = useRef(0);
  const primeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounced ~180ms after the dial settles: start/cancel per-tile collapse
  // timers and restore any tile that came back into range. Live opacity/scale
  // tracking (below, in `items`) is NOT debounced — only this reflow step is.
  const scheduleCull = useCallback((dial: number) => {
    const now = cullFor(dial);
    const prevCollapsed = collapsedRef.current;

    now.forEach((id) => {
      if (!prevCollapsed.has(id) && !collapseTimers.current.has(id)) {
        const timer = setTimeout(() => {
          collapseTimers.current.delete(id);
          setCollapsed((c) => new Set(c).add(id));
        }, SPECTRUM_CONFIG.collapseMs);
        collapseTimers.current.set(id, timer);
      }
    });

    collapseTimers.current.forEach((timer, id) => {
      if (!now.has(id)) {
        clearTimeout(timer);
        collapseTimers.current.delete(id);
      }
    });

    const toRestore = [...prevCollapsed].filter((id) => !now.has(id));
    if (toRestore.length) {
      setCollapsed((c) => {
        const next = new Set(c);
        toRestore.forEach((id) => next.delete(id));
        return next;
      });
      setEntering((e) => new Set([...e, ...toRestore]));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setEntering((e) => {
            const next = new Set(e);
            toRestore.forEach((id) => next.delete(id));
            return next;
          });
        });
      });
    }
  }, [cullFor]);

  // Kick one currently-visible electric tile into an immediate discharge. Reads
  // live collapse state via the ref so it's safe to call from a timer. Rotates
  // through the eligible tiles (monotonic counter mod count) so repeated resets
  // spark different tiles; bumping a tile's `primed` counter re-keys its overlay
  // (see the grid) to remount it with the negative-delay `primedAnimation`.
  const primeOneSpark = useCallback(() => {
    const eligible = gallery.filter(
      (it) => teslaById[it.id] && !collapsedRef.current.has(it.id),
    );
    if (eligible.length === 0) return;
    const chosen = eligible[primeRotor.current % eligible.length];
    primeRotor.current += 1;
    setPrimed((p) => ({ ...p, [chosen.id]: (p[chosen.id] ?? 0) + 1 }));
  }, [gallery, teslaById]);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      const b = localStorage.getItem(BIAS_KEY);
      if (m === "gallery" || m === "through") setModeState(m);
      if (b !== null && !isNaN(+b)) {
        const restored = +b;
        setBiasState(restored);
        setCollapsed(cullFor(restored)); // reseed for the restored bias, still no animation
      }
      if (localStorage.getItem(LIFE_KEY) === "1") setShowLife(true);
      if (localStorage.getItem(HOBBY_KEY) === "1") setShowHobby(true);
      // school defaults ON — only an explicit "0" turns it off (absent = on).
      if (localStorage.getItem(SCHOOL_KEY) === "0") setShowSchool(false);
      if (localStorage.getItem(TRIVIA_KEY) === "1") setShowTrivia(true);
    } catch {
      // localStorage unavailable (private browsing, etc) — fall back to defaults
    }
    // Deep-links from Work Detail pages override the persisted mode: "← gallery"
    // (/#gallery) lands in Gallery mode, "trace the throughline →" (/#throughline)
    // in Throughline mode. setModeState (not setMode) so a deep-link doesn't rewrite
    // the user's persisted preference — same as the restore above.
    const deepLinkHash = window.location.hash;
    if (deepLinkHash === "#throughline") setModeState("through");
    else if (deepLinkHash === "#gallery") setModeState("gallery");
  }, []);

  // Which throughline entries are visible under the current filter toggles.
  const isVisibleEvent = useCallback(
    (e: ThroughlineEvent, life: boolean, hobby: boolean, school: boolean) =>
      (life || !e.life) && (hobby || !e.hobby) && (school || !e.school),
    [],
  );

  // FLIP the timeline rows: snapshot current row rects, then (after the commit that
  // this arms) slide each survivor from its old spot to the new one and fade entering
  // rows in. Actual measurement/animation happens in the layout effect below.
  const armRowFlip = useCallback(() => {
    if (prefersReducedMotion()) return; // honor reduced-motion: no FLIP, just snap
    const first = new Map<string, DOMRect>();
    document
      .querySelectorAll<HTMLElement>("[data-row-id]")
      .forEach((n) => first.set(n.dataset.rowId!, n.getBoundingClientRect()));
    flipFirst.current = first;
    flipArmed.current = true;
  }, []);

  // life/hobby toggle with animated reflow. If rows are leaving, fade them first
  // (height retained) for 300ms, THEN commit the toggle + FLIP survivors up. Parity
  // (left/right) is NOT recomputed during the fade — see the render's rowList.
  const animateFilter = useCallback(
    (
      key: "life" | "hobby" | "school",
      lsKey: string,
      current: boolean,
      apply: (v: boolean) => void,
    ) => {
      if (rowBusy.current) return;
      const nextVal = !current;
      try {
        localStorage.setItem(lsKey, nextVal ? "1" : "0");
      } catch {}

      const visIds = (life: boolean, hobby: boolean, school: boolean) =>
        throughline.filter((e) => isVisibleEvent(e, life, hobby, school)).map((e) => e.id);
      const before = new Set(visIds(showLife, showHobby, showSchool));
      const after = visIds(
        key === "life" ? nextVal : showLife,
        key === "hobby" ? nextVal : showHobby,
        key === "school" ? nextVal : showSchool,
      );
      const leaving = [...before].filter((id) => !after.includes(id));

      if (prefersReducedMotion()) {
        apply(nextVal);
        setRowLeaving([]);
        return;
      }

      const commit = () => {
        rowBusy.current = true;
        armRowFlip();
        spineMorphNext.current = true; // morph the winding road alongside the row reflow
        apply(nextVal);
        setRowLeaving([]);
        clearTimeout(rowBusyTimer.current);
        rowBusyTimer.current = setTimeout(() => {
          rowBusy.current = false;
        }, 560);
      };

      if (leaving.length) {
        setRowLeaving(leaving); // fade exiting rows (still mounted, height retained)
        clearTimeout(rowLeaveTimer.current);
        rowLeaveTimer.current = setTimeout(commit, 300);
      } else {
        commit();
      }
    },
    [throughline, showLife, showHobby, showSchool, isVisibleEvent, armRowFlip],
  );

  const toggleLife = () => animateFilter("life", LIFE_KEY, showLife, setShowLife);
  const toggleHobby = () => animateFilter("hobby", HOBBY_KEY, showHobby, setShowHobby);
  const toggleSchool = () => animateFilter("school", SCHOOL_KEY, showSchool, setShowSchool);

  // trivia only changes card heights (not the set), so no FLIP — but toggling from the
  // docked (bottom) chip shifts everything above the viewport, which reads as a jump.
  // Pin a visible row: measure its viewport top before, scroll by the delta after.
  const toggleTrivia = () => {
    const next = !showTrivia;
    if (!prefersReducedMotion()) {
      const rows = Array.from(document.querySelectorAll<HTMLElement>("[data-row]"));
      const anchor = rows.find((r) => r.getBoundingClientRect().bottom > 120) ?? rows[0] ?? null;
      if (anchor) scrollAnchorArmed.current = { el: anchor, before: anchor.getBoundingClientRect().top };
    }
    setShowTrivia(next);
    try {
      localStorage.setItem(TRIVIA_KEY, next ? "1" : "0");
    } catch {}
  };

  // Runs FLIP + scroll-anchor adjustments after the DOM commits (before paint).
  useLayoutEffect(() => {
    if (flipArmed.current) {
      flipArmed.current = false;
      const first = flipFirst.current;
      document.querySelectorAll<HTMLElement>("[data-row-id]").forEach((n) => {
        const id = n.dataset.rowId!;
        const f = first.get(id);
        if (!f) {
          // entering row (no prior rect) → fade in rather than FLIP
          n.style.opacity = "0";
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              n.style.transition = "opacity .45s ease .08s";
              n.style.opacity = "1";
              const clear = () => {
                n.style.transition = "";
                n.removeEventListener("transitionend", clear);
              };
              n.addEventListener("transitionend", clear);
            }),
          );
          return;
        }
        const r = n.getBoundingClientRect();
        const dx = f.left - r.left;
        const dy = f.top - r.top;
        if (dx || dy) {
          n.style.transition = "none";
          n.style.transform = `translate(${dx}px, ${dy}px)`;
          void n.getBoundingClientRect(); // force reflow so the next frame animates
          requestAnimationFrame(() =>
            requestAnimationFrame(() => {
              // transform-only transition; cleared on end so the class-based opacity
              // transition (for leave fades) is restored — avoids inline/React conflict.
              n.style.transition = "transform .5s cubic-bezier(.4,0,.2,1)";
              n.style.transform = "";
              const clear = () => {
                n.style.transition = "";
                n.style.transform = "";
                n.removeEventListener("transitionend", clear);
              };
              n.addEventListener("transitionend", clear);
            }),
          );
        }
      });
    }
    if (scrollAnchorArmed.current) {
      const { el, before } = scrollAnchorArmed.current;
      scrollAnchorArmed.current = null;
      if (el.isConnected) {
        const delta = el.getBoundingClientRect().top - before;
        if (Math.abs(delta) > 1) window.scrollBy(0, delta);
      }
    }
  });

  // The winding-road spine. Straight with both filters off (the clean professional
  // thread); an alternating bezier serpentine threading every node when a filter is
  // on, amplitude 0→18→34 by active-filter count. Its ROUGHNESS is data-driven —
  // each ON filter additively contributes bow-wander (noise), hand-drawn jitter
  // (shake), and intermittent dimming (dim). Ported verbatim from the mockup; see
  // handoff/throughline.md "Winding-road spine". Reads node Ys via offsetTop (25 =
  // node top 16 + radius 9) so positions are correct even mid-FLIP (transform-agnostic).
  const updateSpine = useCallback(
    (animate: boolean) => {
      const svg = spineRef.current;
      if (!svg) return;
      const box = svg.closest<HTMLElement>("[data-timeline]");
      if (!box) return;
      const mobile = window.innerWidth < 680;
      const cx = mobile ? 7 : box.clientWidth / 2;
      const H = box.offsetHeight;
      const filters = (showLife ? 1 : 0) + (showHobby ? 1 : 0);
      const targetAmp = mobile ? 0 : filters === 0 ? 0 : filters === 1 ? 18 : 34;
      const ys = Array.from(box.querySelectorAll<HTMLElement>("[data-row-id]"))
        .map((r) => r.offsetTop + 25)
        .sort((a, b) => a - b);

      // additive character: professional path (both off) = 0 = clean straight line
      const hob = showHobby;
      const lif = showLife;
      const noise = Math.min(1, (hob ? 0.55 : 0) + (lif ? 0.7 : 0)); // bow wander
      const shake = (hob ? 0.6 : 0) + (lif ? 0.8 : 0); // hand-drawn jitter (px)
      const dim = Math.min(1, (hob ? 0.75 : 0) + (lif ? 0.4 : 0)); // intermittent dimming

      const rand = (k: number) => {
        const x = Math.sin((k + 1) * 127.1 + 7.3) * 43758.5453;
        return (x - Math.floor(x)) * 2 - 1; // seeded [-1, 1]
      };
      // smooth value-noise: interpolate between seeded randoms so neighbours blend
      const vnoise = (u: number) => {
        const i = Math.floor(u);
        const f = u - i;
        const a = rand(i * 3.1);
        const b = rand((i + 1) * 3.1);
        const s = f * f * (3 - 2 * f);
        return a + (b - a) * s;
      };
      const bez = (t: number, p0: number, p1: number, p2: number, p3: number) => {
        const u = 1 - t;
        return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
      };

      const straightSVG = () =>
        `<path d="M ${cx} 0 L ${cx} ${H}" fill="none" stroke="#1a1815" stroke-width="3" stroke-linecap="round"></path>`;

      const curvedSVG = (amp: number) => {
        const leadTop = 26;
        const leadBottom = 92; // asymmetric: short entry, long trailing slip
        const pts = [ys[0] - leadTop, ...ys, ys[ys.length - 1] + leadBottom];
        const P: Array<{ x: number; y: number }> = [];
        for (let i = 1; i < pts.length; i++) {
          const ya = pts[i - 1];
          const yb = pts[i];
          const dir = i % 2 === 0 ? 1 : -1;
          const c1y = ya + (yb - ya) / 3;
          const c2y = ya + (2 * (yb - ya)) / 3;
          // scale the bow by segment length so short lead-ins don't overshoot into a loop
          const segScale = Math.min(1, (yb - ya) / 95);
          const b1 =
            cx + dir * amp * segScale * (1 + noise * 0.9 * rand(i)) + noise * amp * segScale * 0.55 * rand(i + 41);
          const b2 =
            cx +
            dir * amp * segScale * (1 + noise * 0.9 * rand(i + 17)) +
            noise * amp * segScale * 0.55 * rand(i + 83);
          const steps = 18; // higher sampling → finer shake resolution
          for (let s = i === 1 ? 0 : 1; s <= steps; s++) {
            const t = s / steps;
            let x = bez(t, cx, b1, b2, cx);
            const y = bez(t, ya, c1y, c2y, yb);
            const edge = t === 0 || t === 1; // keep node/endpoints exact so dots sit on the line
            if (!edge) {
              const k = i * 100 + s;
              x += shake * segScale * rand(k * 1.3);
            }
            P.push({ x, y: y + (edge ? 0 : shake * 0.55 * rand((i * 100 + s) * 2.1 + 5)) });
          }
        }
        // short chunks (sharing endpoints) with opacity from the smooth field → soft dim
        let out = "";
        const chunk = 8;
        let ci = 0;
        for (let a = 0; a < P.length - 1; a += chunk, ci++) {
          const end = Math.min(P.length - 1, a + chunk);
          let d = `M ${P[a].x.toFixed(1)} ${P[a].y.toFixed(1)}`;
          for (let j = a + 1; j <= end; j++) d += ` L ${P[j].x.toFixed(1)} ${P[j].y.toFixed(1)}`;
          const op = (1 - dim * 0.6 * (0.5 + 0.5 * vnoise(ci * 0.5))).toFixed(2);
          out += `<path d="${d}" fill="none" stroke="#1a1815" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" opacity="${op}"></path>`;
        }
        return out;
      };

      const render = (amp: number) => {
        svg.innerHTML = amp < 0.5 || !ys.length ? straightSVG() : curvedSVG(amp);
      };

      cancelAnimationFrame(spineRaf.current);
      if (!animate || prefersReducedMotion()) {
        render(targetAmp);
        spineAmp.current = targetAmp;
        return;
      }
      const from = spineAmp.current || 0;
      const to = targetAmp;
      const t0 = performance.now();
      const dur = 480;
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / dur);
        const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // easeInOutQuad
        const amp = from + (to - from) * e;
        render(amp);
        spineAmp.current = amp;
        if (k < 1) spineRaf.current = requestAnimationFrame(step);
      };
      spineRaf.current = requestAnimationFrame(step);
    },
    [showLife, showHobby],
  );

  // Keep a ref to the latest updateSpine so the (mount-once) resize listener always
  // calls the current closure without re-subscribing.
  useEffect(() => {
    updateSpineRef.current = updateSpine;
  }, [updateSpine]);

  // Redraw/morph the spine after layout commits. Keyed on everything that moves the
  // nodes: mode, filters, trivia (heights), and rows mid-exit. A filter commit arms
  // spineMorphNext so this tweens; everything else redraws instantly.
  useLayoutEffect(() => {
    if (mode !== "through") return;
    const animate = spineMorphNext.current;
    spineMorphNext.current = false;
    updateSpine(animate);
  }, [mode, showLife, showHobby, showSchool, showTrivia, rowLeaving, updateSpine]);

  // Resize + a safety redraw after fonts/layout settle (spine depends on measured px).
  useEffect(() => {
    const onResize = () => updateSpineRef.current(false);
    window.addEventListener("resize", onResize);
    const safety = setTimeout(() => updateSpineRef.current(false), 80);
    return () => {
      window.removeEventListener("resize", onResize);
      clearTimeout(safety);
      cancelAnimationFrame(spineRaf.current);
    };
  }, []);

  // Dial tutorial: a returning guest (seen flag set) skips straight to 'gone';
  // a new guest sees the hand rock, then rest after 5s (matching the swivel run).
  useEffect(() => {
    // Dev-only affordance: `?dial=1` force-replays the cue, ignoring the seen flag,
    // so you can watch it without clearing localStorage. `import.meta.env.DEV` is a
    // static `false` in production builds, so this whole branch is tree-shaken out
    // and never ships.
    const forceReplay =
      import.meta.env.DEV && new URLSearchParams(window.location.search).has("dial");
    let seen = false;
    if (!forceReplay) {
      try {
        seen = !!localStorage.getItem(SEEN_DIAL_KEY);
      } catch {
        // localStorage unavailable — treat as a fresh guest and show the cue
      }
    }
    if (seen) {
      tutDoneRef.current = true;
      setTutorialPhase("gone");
      return;
    }
    tutRestTimer.current = setTimeout(() => {
      setTutorialPhase((p) => (p === "swivel" ? "resting" : p));
    }, 5000);
  }, []);

  // One spark shortly after mount, so the grid greets a fresh visitor with a
  // beat of life instead of a wall of dormant tiles.
  useEffect(() => {
    const t = setTimeout(primeOneSpark, 500);
    return () => clearTimeout(t);
  }, [primeOneSpark]);

  useEffect(() => {
    return () => {
      collapseTimers.current.forEach((timer) => clearTimeout(timer));
      collapseTimers.current.clear();
      if (cullDebounce.current) clearTimeout(cullDebounce.current);
      clearTimeout(primeTimer.current);
      clearTimeout(tutRestTimer.current);
      clearTimeout(tutLeaveTimer.current);
      clearTimeout(tutGoneTimer.current);
      clearTimeout(rowLeaveTimer.current);
      clearTimeout(rowBusyTimer.current);
    };
  }, []);

  // First interaction with either slider dismisses the tutorial (once): follow the
  // knob for a beat (momentum), then genie away, and remember it forever.
  const dismissTutorial = useCallback(() => {
    if (tutDoneRef.current) return;
    tutDoneRef.current = true;
    clearTimeout(tutRestTimer.current);
    try {
      localStorage.setItem(SEEN_DIAL_KEY, "1");
    } catch {
      // best-effort; if it can't persist, the cue just reappears next visit
    }
    setTutorialPhase("following");
    tutLeaveTimer.current = setTimeout(() => {
      setTutorialPhase("leaving");
      tutGoneTimer.current = setTimeout(() => setTutorialPhase("gone"), 620);
    }, 250);
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
    // Reset scroll so switching modes never strands you mid-page in the new view.
    // Routes every entry point through here: header toggle + both bottom CTAs.
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  const setBias = (v: number) => {
    dismissTutorial(); // first drag on either control retires the tutorial hand
    setBiasState(v); // live — slider position + in-range tile opacity/scale track the drag
    try {
      localStorage.setItem(BIAS_KEY, String(v));
    } catch {}
    if (cullDebounce.current) clearTimeout(cullDebounce.current);
    cullDebounce.current = setTimeout(() => {
      scheduleCull(v); // debounced — the actual reflow
      // ~120ms after the reflow settles, kick one tile so the new arrangement
      // doesn't sit dormant. Cleared/rescheduled on every drag so only the final
      // settle primes.
      clearTimeout(primeTimer.current);
      primeTimer.current = setTimeout(primeOneSpark, 120);
    }, 180);
  };

  const isGallery = mode === "gallery";
  const showTutorial = isGallery && tutorialPhase !== "gone";

  // Assign each tile a banner reveal effect: its `bannerFx` override, else a random
  // one. Recomputed per page load (fresh Math.random each mount); only read on hover
  // (client), so the differing SSR value is never rendered → no hydration mismatch.
  const bannerFxById = useMemo(
    () =>
      Object.fromEntries(
        gallery.map((g) => [
          g.id,
          g.bannerFx ?? BANNER_FX_VALUES[Math.floor(Math.random() * BANNER_FX_VALUES.length)],
        ]),
      ) as Record<string, BannerFx>,
    [gallery],
  );
  const hoveredItem = useMemo(() => gallery.find((g) => g.id === hover) ?? null, [gallery, hover]);
  const bannerOn = isGallery && !!hoveredItem?.bannerImagePreview;
  // Update the sticky banner src+fx only when hovering a tile that HAS a preview, so
  // leaving a tile keeps the last image on screen while `on` fades it out.
  useEffect(() => {
    if (hoveredItem?.bannerImagePreview) {
      setBannerSrcFx({ src: r2(hoveredItem.bannerImagePreview), fx: bannerFxById[hoveredItem.id] });
    }
  }, [hoveredItem, bannerFxById]);

  // Two IntersectionObservers drive the pill's three states (cleaner than the
  // mockup's scroll math): one on the inline control (scrolled past?), one on the
  // dock-zone spacer (in view?). Keyed on isGallery since both elements only exist
  // while the Gallery is rendered. The dock observer's -40px bottom rootMargin
  // mirrors the mockup's `dockZone.top < innerHeight - 40` threshold.
  useEffect(() => {
    if (!isGallery) {
      setInlinePast(false);
      setDockInView(false);
      return;
    }
    const observers: IntersectionObserver[] = [];
    if (inlineBiasRef.current) {
      const io = new IntersectionObserver(([e]) => setInlinePast(!e.isIntersecting));
      io.observe(inlineBiasRef.current);
      observers.push(io);
    }
    if (dockZoneRef.current) {
      const io = new IntersectionObserver(([e]) => setDockInView(e.isIntersecting), {
        rootMargin: "0px 0px -40px 0px",
      });
      io.observe(dockZoneRef.current);
      observers.push(io);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [isGallery]);

  // hidden while the inline control is still on screen; once past, it floats fixed
  // over the grid, then docks in-flow once the dock zone scrolls up into view.
  const floatState: "hidden" | "fixed" | "docked" = !inlinePast
    ? "hidden"
    : dockInView
      ? "docked"
      : "fixed";

  // Same three-state model for the Throughline filter pill, its own two observers
  // (top chip row + dock buffer). Keyed on !isGallery since those elements only
  // exist while the Throughline is rendered.
  useEffect(() => {
    if (isGallery) {
      setThroughPast(false);
      setThroughDockInView(false);
      return;
    }
    const observers: IntersectionObserver[] = [];
    if (throughAnchorRef.current) {
      const io = new IntersectionObserver(([e]) => setThroughPast(!e.isIntersecting));
      io.observe(throughAnchorRef.current);
      observers.push(io);
    }
    if (throughDockRef.current) {
      const io = new IntersectionObserver(([e]) => setThroughDockInView(e.isIntersecting), {
        rootMargin: "0px 0px -40px 0px",
      });
      io.observe(throughDockRef.current);
      observers.push(io);
    }
    return () => observers.forEach((o) => o.disconnect());
  }, [isGallery]);

  const throughFloatState: "hidden" | "fixed" | "docked" = !throughPast
    ? "hidden"
    : throughDockInView
      ? "docked"
      : "fixed";

  // Rendered timeline rows = currently-visible entries PLUS any still mid-exit, so
  // exiting rows stay mounted through their fade. Order preserved for stable parity.
  const throughRows = useMemo(
    () =>
      throughline.filter(
        (e) => isVisibleEvent(e, showLife, showHobby, showSchool) || rowLeaving.includes(e.id),
      ),
    [throughline, showLife, showHobby, showSchool, rowLeaving, isVisibleEvent],
  );

  // The filter chips, reused in the inline row and both floating/docked pills. Order:
  // life · school · hobby · trivia (school defaults ON, so it starts active).
  const filterChips = () => (
    <>
      <ToggleChip label="life events" active={showLife} accent="#4f9d69" onToggle={toggleLife} />
      <ToggleChip label="school" active={showSchool} accent="#7d5bd6" onToggle={toggleSchool} />
      <ToggleChip
        label="hobby projects"
        active={showHobby}
        accent="#2f8fd4"
        onToggle={toggleHobby}
      />
      <ToggleChip label="trivia" active={showTrivia} accent="#e0a92e" onToggle={toggleTrivia} />
    </>
  );

  // The glowing chip pill shared by the fixed and docked Throughline filter controls
  // (vivid-orange bloom, slower 3.5s pulse — distinct from the Gallery bias pill).
  const filterPill = (extraClass: string) => (
    <div
      className={`inline-flex items-center gap-[9px] bg-white border-2 border-ink rounded-[40px] px-[13px] py-[8px] ${extraClass}`}
      style={{
        boxShadow: "0 10px 34px rgba(26,24,21,.22), 0 0 27px 6px rgba(248,99,0,.6)",
        animation: "fadein .28s ease both, glowpulseThrough 3.5s ease-in-out .3s infinite",
      }}
    >
      {filterChips()}
    </div>
  );

  // Live (not debounced): which tiles are past the threshold right now, so
  // they immediately start fading even before their collapse timer is set.
  const culledSetLive = useMemo(() => cullFor(bias), [bias, cullFor]);

  const items = useMemo(
    () =>
      gallery.map((it) => {
        const match = domain === "all" || it.domain === domain;
        const dist = Math.abs(it.meter - bias);
        // Distance from the dial is conveyed by opacity only. Visible tiles stay
        // at a uniform 1:1 (no emphasis or hover scale bump) so every read-only
        // art<->code tick renders at an identical size across the grid — scaling
        // the whole tile stretched the marker. Cull/enter scale-down still lives
        // in the JSX below, but those frames are invisible so the tick isn't seen.
        let op = 1 - (dist / 100) * SPECTRUM_CONFIG.fadeStrength;
        if (!match) op = 0.1;
        if (hover === it.id) op = 1;

        let phase: Phase;
        if (collapsed.has(it.id)) phase = "collapsed";
        else if (culledSetLive.has(it.id)) phase = "culled";
        else if (entering.has(it.id)) phase = "entering";
        else phase = "normal";

        return { ...it, op, phase };
      }),
    [gallery, domain, bias, hover, collapsed, entering, culledSetLive],
  );

  const visibleItems = useMemo(() => items.filter((it) => it.phase !== "collapsed"), [items]);

  const [gridRef] = useAutoAnimate<HTMLDivElement>(REFLOW_ANIMATION);

  return (
    <>
      <header className="flex items-center justify-between gap-5 flex-wrap pt-[26px] pb-[22px] max-[600px]:justify-center max-[600px]:text-center">
        <div>
          <div className="font-hand font-bold text-[30px] leading-[.9] -rotate-2 inline-block">
            Hoan Nguyen
          </div>
          <div className="font-mono text-[10.5px] tracking-[.04em] text-muted mt-1">
            MUSHOGENSHIN MEDIA · HOUSTON TX
          </div>
        </div>

        <div className="inline-flex items-center bg-white border-2 border-ink rounded-full p-1 shadow-[3px_3px_0_rgba(0,0,0,.14)]">
          <button
            onClick={() => setMode("gallery")}
            className={`${btnBase} ${isGallery ? "bg-ink text-white" : "bg-transparent text-ink"}`}
          >
            ◫&nbsp;&nbsp;Gallery
          </button>
          <button
            onClick={() => setMode("through")}
            className={`${btnBase} inline-flex items-center gap-[6px] ${!isGallery ? "bg-ink text-white" : "bg-transparent text-ink"}`}
          >
            <RoadIcon />
            Throughline
          </button>
        </div>

        <nav className="flex gap-4 font-mono text-[11.5px] items-center">
          <a href="#about" className="text-ink">
            about
          </a>
          <a href="https://github.com/mushogenshin" className="text-ink">
            github
          </a>
          <a href="https://artstation.com/mushogenshin" className="text-ink">
            artstation
          </a>
          <a href="https://www.linkedin.com/in/hoan-trong-nguyen" className="text-ink">
            linkedin
          </a>
        </nav>
      </header>

      {isGallery ? (
        <div className="animate-fadeup" key="gallery">
          {/* split hero (position:relative + overflow:hidden already) — hosts the
              banner cover swap as its first child; columns get position:relative and
              the tagline card z-[2] so it stays above the overlay (z-1). */}
          <div className="relative grid grid-cols-2 min-h-[280px] border-[2.5px] border-ink rounded-2xl overflow-hidden shadow-[6px_7px_0_rgba(0,0,0,.14)] max-[680px]:flex max-[680px]:flex-col max-[680px]:min-h-0 max-[680px]:shadow-[5px_6px_0_rgba(0,0,0,.14)]">
            <BannerOverlay src={bannerSrcFx.src} on={bannerOn} fx={bannerSrcFx.fx} />
            <div
              className="relative p-[22px_24px] flex flex-col justify-between"
              style={{
                background:
                  "repeating-linear-gradient(48deg,#f5dccb,#f5dccb 11px,#f8e6d9 11px,#f8e6d9 22px)",
              }}
            >
              <div className="font-hand font-bold text-[44px] text-art leading-[.9]">ART</div>
              <div className="font-mono text-[11px] text-[#a5502f] leading-[1.7]">
                sculpture
                <br />
                anatomy
                <br />
                figure &amp; deformation
              </div>
            </div>
            <div
              className="relative p-[22px_24px] flex flex-col justify-between items-end text-right"
              style={{
                background:
                  "repeating-linear-gradient(48deg,#d6e0f7,#d6e0f7 11px,#e4ebfa 11px,#e4ebfa 22px)",
              }}
            >
              <div className="font-mono font-bold text-[40px] text-code leading-[.9] tracking-[-.02em]">
                CODE
              </div>
              <div className="font-mono text-[11px] text-[#3a5bb5] leading-[1.7]">
                rust · c++
                <br />
                unreal · houdini
                <br />
                pipeline &amp; systems
              </div>
            </div>
            <div className="absolute z-[2] left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(62%,440px)] bg-white border-[2.5px] border-ink rounded-[13px] p-[22px_24px] text-center shadow-[4px_5px_0_rgba(0,0,0,.16)] max-[680px]:static max-[680px]:left-auto max-[680px]:top-auto max-[680px]:translate-x-0 max-[680px]:translate-y-0 max-[680px]:w-auto max-[680px]:rounded-none max-[680px]:border-0 max-[680px]:border-t-[2.5px] max-[680px]:shadow-none max-[680px]:p-[20px_22px]">
              <div className="text-[20px] font-semibold leading-[1.25]">
                Operating greatly in the realm between{" "}
                <span className="font-hand font-bold text-art text-[26px]">Art</span> &amp;{" "}
                <span className="font-hand font-bold text-code text-[26px]">Programming</span>
              </div>
              <div className="font-mono text-[11px] text-muted mt-[10px]">
                an artist who kept following problems into the code — and never stopped
              </div>
            </div>
          </div>

          {/* bias + filter controls */}
          <div
            ref={inlineBiasRef}
            className="my-[30px] mb-[22px] flex gap-[26px] items-center flex-wrap"
          >
            <div className="flex-[1_1_320px] min-w-[280px]">
              <div className="flex justify-between font-mono text-[10.5px] text-muted mb-[7px]">
                <span className="text-art">← more ART</span>
                <span className="text-code">more CODE →</span>
              </div>
              {/* relative wrapper hosts the tutorial hand so its left:{bias}% maps to the track */}
              <div className="relative">
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={bias}
                  onChange={(e) => setBias(+e.target.value)}
                  className="bias-range w-full relative z-[2]"
                />
                {showTutorial && <TutorialHand bias={bias} phase={tutorialPhase} gap={18} />}
              </div>
              <div className="text-center font-mono text-[10.5px] text-muted mt-[9px]">
                lean the spectrum
              </div>
            </div>
            <div className="flex flex-wrap gap-[7px]">
              {DOMAINS.map((d) => (
                <button key={d} onClick={() => setDomain(d)} className={chipClass(domain === d)}>
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* work grid */}
          <div
            ref={gridRef}
            className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]"
          >
            {visibleItems.map((it) => {
              const isFading = it.phase === "culled" || it.phase === "entering";
              const fadeScale = it.phase === "culled" ? 0.9 : 0.96;
              // Hover text treatment: the body (not the header) adopts the tile's
              // own color, ink flips to a luminance-picked legible tone, and the
              // ART↔CODE meter fades out. Transitions live on the elements always,
              // so the revert animates too. See handoff/tile-images-and-hover.md.
              const ink = bestInk(it.color);
              const dark = ink === "#ffffff";
              const hv = hover === it.id;
              return (
                <a key={it.id} href={`/work/${it.id}`} data-id={it.id} className="block text-inherit">
                  {/* Fade + cull/enter scale live on this inner card, NOT on the <a> grid child
                      above: auto-animate measures the <a>'s box (transforms included) to detect
                      reflow, so a transform on it can read as a resize and get animated — the
                      settle-time shrink/expand kink. Keeping the <a> transform-free leaves its
                      measured size constant, so auto-animate only ever animates true positional
                      movement. Visible tiles render at scale 1 (emphasis is opacity-only); only
                      culled/entering tiles scale down, and they're invisible while they do. */}
                  <div
                    className="bg-white border-2 border-ink rounded-xl overflow-hidden shadow-[3px_4px_0_rgba(0,0,0,.13)]"
                    style={{
                      opacity: isFading ? 0 : it.op,
                      transform: `scale(${isFading ? fadeScale : 1})`,
                      transition: TILE_TRANSITION,
                      pointerEvents: isFading ? "none" : undefined,
                    }}
                    onMouseEnter={() => setHover(it.id)}
                    onMouseLeave={() => setHover(null)}
                  >
                    <div
                      className="relative aspect-[4/3] border-b-2 border-ink flex items-end p-[10px]"
                      style={{ background: it.color }}
                    >
                      <span className="absolute z-10 top-[9px] left-[9px] font-mono text-[9.5px] bg-ink text-white px-[7px] py-[2px] rounded-full">
                        {it.domain}
                      </span>
                      <span className="absolute z-10 top-[9px] right-[11px] font-mono text-[10px] text-black/50">
                        {it.year}
                      </span>
                      {it.image ? (
                        /* Preflight trap (see CLAUDE.md): this header is a
                           small positioned box, so Preflight's `img { max-width:
                           100% }` can resolve against ~0 and collapse the image.
                           `maxWidth:"none"` inline clears the reset; object-cover
                           + explicit width/height keeps it filling the 4:3 frame
                           without CLS. */
                        <img
                          src={r2(it.image)}
                          alt={it.imageAlt ?? it.title}
                          width={640}
                          height={480}
                          loading="lazy"
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ maxWidth: "none" }}
                        />
                      ) : (
                        <span className="font-mono text-[9px] text-black/50">{it.slot}</span>
                      )}
                    </div>
                    <div
                      className="px-[15px] pb-[15px] pt-[13px]"
                      style={{
                        background: hv ? it.color : "#fff",
                        transition: "background .25s ease",
                      }}
                    >
                      <div
                        className="text-[16.5px] font-semibold leading-[1.15]"
                        style={{ color: hv ? ink : "#1a1815", transition: "color .25s ease" }}
                      >
                        {it.title}
                      </div>
                      <div
                        className="text-[12.5px] leading-[1.45] my-[6px] mb-[13px] min-h-[36px]"
                        style={{
                          color: hv
                            ? dark
                              ? "rgba(255,255,255,.85)"
                              : "rgba(0,0,0,.62)"
                            : "#5c574e",
                          transition: "color .25s ease",
                        }}
                      >
                        {it.blurb}
                      </div>
                      <div
                        className="flex items-center gap-2"
                        style={{ opacity: hv ? 0 : 1, transition: "opacity .3s ease" }}
                      >
                        <span className="font-mono text-[8px] text-art">ART</span>
                        <div
                          className="relative flex-1 h-[5px] rounded-[3px]"
                          style={{
                            background: "linear-gradient(90deg,#e0531f,#f0c94a 50%,#2f6df0)",
                          }}
                        >
                          {/* Electric-current discharge on the extreme (art-/code-heavy)
                              tiles only. Purely decorative: pointer-events:none and stacked
                              below the marker (marker z-[3] vs overlay z-index:2 from
                              teslaForTile) so it never blocks the link or hides the read-only
                              position marker. See src/config/tesla.ts. */}
                          {(() => {
                            const tesla = teslaById[it.id];
                            if (!tesla) return null;
                            // When this tile is the one primed after a reset, swap in the
                            // negative-delay animation and re-key the overlay so React
                            // remounts it — restarting the CSS animation from its ignition
                            // point. The nonce in the key means re-priming the same tile
                            // (rotor wrap) fires a fresh spark. Everything else re-renders
                            // (hover/dial) leave the key and style string untouched, so
                            // they never disturb an in-flight spark.
                            const nonce = primed[it.id];
                            const isPrimed = nonce != null;
                            return (
                              <div
                                key={isPrimed ? `tesla-${it.id}-${nonce}` : `tesla-${it.id}`}
                                data-tesla
                                data-electric={tesla.kind}
                                style={
                                  isPrimed
                                    ? { ...tesla.overlayStyle, animation: tesla.primedAnimation }
                                    : tesla.overlayStyle
                                }
                              >
                                <svg
                                  width="100%"
                                  height="26"
                                  viewBox="0 0 200 26"
                                  preserveAspectRatio="none"
                                  style={{
                                    position: "absolute",
                                    top: "50%",
                                    left: 0,
                                    transform: "translateY(-50%)",
                                    // Preflight sets svg{display:block} (fine here, it's
                                    // absolutely positioned); force overflow:visible so the
                                    // jitter/glow isn't clipped to the 26px box.
                                    overflow: "visible",
                                  }}
                                >
                                  {/* glow strand */}
                                  <path
                                    d={tesla.veinPath}
                                    fill="none"
                                    stroke={tesla.strokeGlow}
                                    strokeWidth={tesla.veinW}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    filter={tesla.filterUrl}
                                  />
                                  {/* mid strand */}
                                  <path
                                    d={tesla.veinPath2}
                                    fill="none"
                                    stroke={tesla.strokeMid}
                                    strokeWidth={tesla.veinW2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                    filter={tesla.filterUrl}
                                  />
                                  {/* crisp core wire — no filter (reuses path 1) */}
                                  <path
                                    d={tesla.veinPath}
                                    fill="none"
                                    stroke={tesla.strokeCore}
                                    strokeWidth={tesla.veinW3}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    vectorEffect="non-scaling-stroke"
                                  />
                                </svg>
                              </div>
                            );
                          })()}
                          <div
                            key="marker"
                            className="absolute top-1/2 z-[3] w-[3px] h-[11px] rounded-[1.5px] bg-ink -translate-y-1/2 -translate-x-1/2 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]"
                            style={{ left: `${it.meter}%` }}
                          />
                        </div>
                        <span className="font-mono text-[8px] text-code">CODE</span>
                      </div>
                    </div>
                  </div>
                </a>
              );
            })}
          </div>

          {/* dock zone: the floating pill docks in-flow here (close under the grid)
              once this spacer scrolls into view, so it never overlaps the CTA/footer.
              Layout order below: grid → dock zone → CTA → footer. */}
          <div
            ref={dockZoneRef}
            data-dock-zone
            className="relative flex items-center justify-center min-h-[70px] pt-[26px]"
          >
            {floatState === "docked" && (
              <BiasPill bias={bias} onBias={setBias} variant="docked" />
            )}
          </div>

          {/* symmetric bottom CTA — mirrors the Throughline's "browse as a gallery" */}
          <div className="text-center mt-[72px]">
            <div className="font-hand font-bold text-2xl text-muted">
              prefer the story to the grid?
            </div>
            <button
              onClick={() => setMode("through")}
              className="mt-4 inline-flex items-center gap-[7px] font-mono text-xs bg-ink text-white rounded-full px-[22px] py-[11px] cursor-pointer border-none"
            >
              <RoadIcon />
              trace the throughline →
            </button>
          </div>
        </div>
      ) : (
        <div className="animate-fadeup" key="through">
          <div className="max-w-[760px] my-2">
            <div className="font-mono text-[11px] text-muted tracking-[.05em] mb-[14px]">
              // THE THROUGHLINE
            </div>
            <h1 className="text-[clamp(30px,4.6vw,52px)] leading-[1.04] font-bold mb-[18px]">
              An artist who kept following problems into the technical side — and{" "}
              <span className="font-hand text-art">never stopped.</span>
            </h1>
            <p className="text-base leading-[1.6] text-[#4a453d] max-w-[640px]">
              Born in a rural, post-war mountain town in Vietnam. Spoke Pascal to a machine before
              I ever left it. Drawing, then architecture, then animation, then the long detour
              into code that turned out not to be a detour at all. Follow the thread.
            </p>
            {/* opt-in filters, all default OFF. Anchored so the floating pill knows
                when this row has scrolled away. */}
            <div
              ref={throughAnchorRef}
              className="flex items-center gap-2 flex-wrap mt-[22px]"
            >
              {filterChips()}
              <span className="font-mono text-[10.5px] text-[#a29b8c]">show more of the thread</span>
            </div>
          </div>

          <div data-timeline className="relative mt-[52px] pl-[2px]">
            {/* Winding-road spine — updateSpine fills this <svg> imperatively (straight
                by default, serpentine when filters are on). Rendered first / z-0 so the
                node dots (below) sit on top of the line. No viewBox → 1 unit = 1px. */}
            <svg
              ref={spineRef}
              data-spine
              className="absolute inset-0 w-full h-full overflow-visible pointer-events-none z-0"
              aria-hidden="true"
            />
            {throughRows.map((e, i) => {
              // Parity counts EVERY rendered row (incl. those mid-exit), so sides stay
              // put during a fade-out; the zig-zag only re-alternates at commit, where
              // FLIP animates the flip. An authored `side` pins an entry.
              const side = e.side ?? sideForIndex(i);
              const color = ACCENT_COLORS[e.accent];
              const revealTrivia = showTrivia && !!e.trivia;
              const leaving = rowLeaving.includes(e.id);
              return (
                <div
                  key={e.id}
                  data-row
                  data-row-id={e.id}
                  className="relative grid grid-cols-2 mb-6.5 transition-opacity duration-300 max-[680px]:block max-[680px]:pl-9.5 max-[680px]:mb-5"
                  style={{ opacity: leaving ? 0 : 1, pointerEvents: leaving ? "none" : undefined }}
                >
                  <div
                    className={
                      side === "l"
                        ? "col-start-1 text-right pr-[34px] max-[680px]:text-left max-[680px]:p-0"
                        : "col-start-2 text-left pl-[34px] max-[680px]:p-0"
                    }
                  >
                    <div className="bg-white border-2 border-ink rounded-xl px-[18px] py-[16px] shadow-[3px_4px_0_rgba(0,0,0,.12)]">
                      <div className="font-mono text-[13px] font-bold" style={{ color }}>
                        {e.year}
                      </div>
                      <div className="text-[18px] font-semibold leading-[1.15] my-[3px]">
                        {e.title}
                      </div>
                      <div className="text-[13px] leading-[1.5] text-[#5c574e]">{e.body}</div>
                      {/* trivia reveal — inherits the cell's text-align (hugs the spine),
                          responsive-correct via the cell's max-[680px]:text-left */}
                      {revealTrivia && (
                        <div
                          className="mt-[11px] pt-[10px] border-t border-dashed border-[#d8d2c4]"
                          style={{ animation: "fadeup .3s ease both" }}
                        >
                          <span
                            className="block font-mono text-[9px] tracking-[.08em] mb-[3px]"
                            style={{ color }}
                          >
                            TRIVIA
                          </span>
                          <span className="font-hand text-[15px] leading-[1.35] text-[#6b6559]">
                            {e.trivia}
                          </span>
                        </div>
                      )}
                      {/* Subtle link to the moment's Thread Detail page, shown only for
                          entries that have one (threadSlug set). Inline-block so it hugs
                          the cell's spine-side text-align, like the trivia block. */}
                      {e.threadSlug && (
                        <a
                          href={`/thread/${e.threadSlug}`}
                          className="inline-block mt-[11px] font-mono text-[10px] tracking-[.04em] hover:underline"
                          style={{ color }}
                        >
                          the moment →
                        </a>
                      )}
                    </div>
                  </div>
                  <div
                    className="absolute left-[calc(50%-9px)] top-4 w-[18px] h-[18px] rounded-full border-[2.5px] border-ink max-[680px]:-left-px"
                    style={{ background: color, boxShadow: "0 0 0 4px #f4f1ea" }}
                  />
                </div>
              );
            })}
          </div>

          {/* dock zone: the floating filter pill docks in-flow here (under the
              timeline, above the CTA) once it scrolls into view. */}
          <div
            ref={throughDockRef}
            data-through-dock
            className="relative flex items-center justify-center min-h-[70px] pt-[30px]"
          >
            {throughFloatState === "docked" && filterPill("relative z-[1]")}
          </div>

          <div className="text-center mt-[72px]">
            <div className="font-hand font-bold text-2xl text-[#4f9d69]">
              …and the thread keeps going.
            </div>
            <button
              onClick={() => setMode("gallery")}
              className="mt-4 font-mono text-xs bg-ink text-white rounded-full px-[22px] py-[11px] cursor-pointer border-none"
            >
              browse the work as a gallery →
            </button>
          </div>
        </div>
      )}

      {/* Floating Throughline filter pill — the three chips, surfaced fixed at
          bottom-center once the top chip row scrolls away (then docks; see the dock
          zone above). Centered via a full-width flex wrapper (no translateX). */}
      {!isGallery && throughFloatState === "fixed" && (
        <div className="fixed left-0 right-0 bottom-[18px] z-[60] flex justify-center pointer-events-none">
          {filterPill("pointer-events-auto")}
        </div>
      )}

      {/* Floating bias control — the same bias/setBias, surfaced fixed at
          bottom-center once the inline slider scrolls away (it later docks in-flow;
          see the dock zone in the Gallery block). The tutorial hand rides the fixed
          copy only. */}
      {isGallery && floatState === "fixed" && (
        <BiasPill
          bias={bias}
          onBias={setBias}
          variant="fixed"
          tutorial={
            showTutorial ? <TutorialHand bias={bias} phase={tutorialPhase} gap={26} /> : null
          }
        />
      )}
    </>
  );
}
