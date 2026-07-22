import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { DOMAINS, ITEMS } from "../data/items";
import { r2 } from "../config/r2";
import { ACCENT_COLORS, sideForIndex, type ThroughlineEvent } from "../config/throughline";
import { REFLOW_ANIMATION, SPECTRUM_CONFIG, TILE_TRANSITION } from "../config/spectrum";
import { teslaForTile } from "../config/tesla";
import TutorialHand, { type TutorialPhase } from "./TutorialHand";
import BiasPill from "./BiasPill";

const SEEN_DIAL_KEY = "mshgsh_seen_dial";
const LIFE_KEY = "mshgsh_life";
const TRIVIA_KEY = "mshgsh_trivia";

/**
 * The electric-current overlay descriptor for each tile, keyed by id. Computed
 * once at module load: every field is a pure function of the tile's (constant)
 * `meter`, and the seeded vein paths MUST NOT be regenerated per render or the
 * wire visibly twitches on every dial move (see `tesla.ts`). Mid-spectrum tiles
 * map to `null`.
 */
const TESLA_BY_ID: Record<string, ReturnType<typeof teslaForTile>> = Object.fromEntries(
  ITEMS.map((it) => [it.id, teslaForTile(it.meter)]),
);

interface HomeAppProps {
  /** Throughline timeline, loaded from src/data/throughline.yaml by index.astro. */
  throughline: ThroughlineEvent[];
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
 * A Throughline toggle chip (life events / trivia). Shares the Gallery chip
 * vocabulary (mono, ink pill, active = ink fill) plus a leading dot indicator:
 * a hollow ink ring when off, filled with `accent` + a soft glow when on.
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
      className={`inline-flex items-center gap-[7px] font-mono text-[11px] border-2 border-ink rounded-[22px] px-[13px] py-[5px] cursor-pointer transition-all duration-150 ${
        active ? "bg-ink text-white" : "bg-white text-ink"
      }`}
    >
      <span
        className="w-[7px] h-[7px] rounded-full transition-all duration-150"
        style={{
          background: active ? accent : "transparent",
          boxShadow: active
            ? `0 0 0 1.5px ${accent}, 0 0 7px 1px ${accent}`
            : "0 0 0 1.5px #1a1815",
        }}
      />
      {label}
    </button>
  );
}

/** Tiles whose meter sits further than cullThreshold from the dial. */
function cullFor(dial: number): Set<string> {
  return new Set(
    ITEMS.filter((it) => Math.abs(it.meter - dial) > SPECTRUM_CONFIG.cullThreshold).map(
      (it) => it.id,
    ),
  );
}

export default function HomeApp({ throughline }: HomeAppProps) {
  const [mode, setModeState] = useState<Mode>("gallery");
  const [bias, setBiasState] = useState(50);
  const [domain, setDomain] = useState<string>("all");
  const [hover, setHover] = useState<string | null>(null);

  // Throughline opt-in toggles, both default OFF (first paint = clean work-thread,
  // no trivia). `life` filters personal entries in/out; `trivia` reveals facts on
  // already-visible cards. Both persist to localStorage.
  const [showLife, setShowLife] = useState(false);
  const [showTrivia, setShowTrivia] = useState(false);

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
  }, []);

  // Kick one currently-visible electric tile into an immediate discharge. Reads
  // live collapse state via the ref so it's safe to call from a timer. Rotates
  // through the eligible tiles (monotonic counter mod count) so repeated resets
  // spark different tiles; bumping a tile's `primed` counter re-keys its overlay
  // (see the grid) to remount it with the negative-delay `primedAnimation`.
  const primeOneSpark = useCallback(() => {
    const eligible = ITEMS.filter(
      (it) => TESLA_BY_ID[it.id] && !collapsedRef.current.has(it.id),
    );
    if (eligible.length === 0) return;
    const chosen = eligible[primeRotor.current % eligible.length];
    primeRotor.current += 1;
    setPrimed((p) => ({ ...p, [chosen.id]: (p[chosen.id] ?? 0) + 1 }));
  }, []);

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
      if (localStorage.getItem(TRIVIA_KEY) === "1") setShowTrivia(true);
    } catch {
      // localStorage unavailable (private browsing, etc) — fall back to defaults
    }
  }, []);

  // Both toggles persist immediately; life changes the set of entries, trivia only
  // reveals text on already-visible cards.
  const toggleLife = () => {
    const next = !showLife;
    setShowLife(next);
    try {
      localStorage.setItem(LIFE_KEY, next ? "1" : "0");
    } catch {}
  };
  const toggleTrivia = () => {
    const next = !showTrivia;
    setShowTrivia(next);
    try {
      localStorage.setItem(TRIVIA_KEY, next ? "1" : "0");
    } catch {}
  };

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

  // Live (not debounced): which tiles are past the threshold right now, so
  // they immediately start fading even before their collapse timer is set.
  const culledSetLive = useMemo(() => cullFor(bias), [bias]);

  const items = useMemo(
    () =>
      ITEMS.map((it) => {
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
    [domain, bias, hover, collapsed, entering, culledSetLive],
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
            className={`${btnBase} ${!isGallery ? "bg-ink text-white" : "bg-transparent text-ink"}`}
          >
            ↳&nbsp;&nbsp;Throughline
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
          {/* split hero */}
          <div className="relative grid grid-cols-2 min-h-[280px] border-[2.5px] border-ink rounded-2xl overflow-hidden shadow-[6px_7px_0_rgba(0,0,0,.14)] max-[680px]:flex max-[680px]:flex-col max-[680px]:min-h-0 max-[680px]:shadow-[5px_6px_0_rgba(0,0,0,.14)]">
            <div
              className="p-[22px_24px] flex flex-col justify-between"
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
              className="p-[22px_24px] flex flex-col justify-between items-end text-right"
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
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(62%,440px)] bg-white border-[2.5px] border-ink rounded-[13px] p-[22px_24px] text-center shadow-[4px_5px_0_rgba(0,0,0,.16)] max-[680px]:static max-[680px]:left-auto max-[680px]:top-auto max-[680px]:translate-x-0 max-[680px]:translate-y-0 max-[680px]:w-auto max-[680px]:rounded-none max-[680px]:border-0 max-[680px]:border-t-[2.5px] max-[680px]:shadow-none max-[680px]:p-[20px_22px]">
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
              return (
                <a key={it.id} href={it.href} data-id={it.id} className="block text-inherit">
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
                    <div className="px-[15px] pb-[15px] pt-[13px]">
                      <div className="text-[16.5px] font-semibold leading-[1.15]">{it.title}</div>
                      <div className="text-[12.5px] leading-[1.45] text-[#5c574e] my-[6px] mb-[13px] min-h-[36px]">
                        {it.blurb}
                      </div>
                      <div className="flex items-center gap-2">
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
                            const tesla = TESLA_BY_ID[it.id];
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
              className="mt-4 font-mono text-xs bg-ink text-white rounded-full px-[22px] py-[11px] cursor-pointer border-none"
            >
              ↳&nbsp;&nbsp;trace the throughline →
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
            {/* opt-in toggles, both default OFF: life events (filters the set) and
                trivia (reveals facts on visible cards) */}
            <div className="flex items-center gap-2 flex-wrap mt-[22px]">
              <ToggleChip
                label="life events"
                active={showLife}
                accent="#4f9d69"
                onToggle={toggleLife}
              />
              <ToggleChip label="trivia" active={showTrivia} accent="#f0c94a" onToggle={toggleTrivia} />
              <span className="font-mono text-[10.5px] text-[#a29b8c]">show more of the thread</span>
            </div>
          </div>

          <div className="relative mt-[52px] pl-[2px]">
            <div className="absolute left-[calc(50%-1.5px)] top-0 bottom-0 w-[3px] bg-ink max-[680px]:left-1.75" />
            {throughline
              .filter((e) => showLife || !e.life)
              .map((e, i) => {
                // side from the VISIBLE index (post life-filter) so the zig-zag holds
                // under any toggle combo; an authored `side` pins an entry. See handoff.
                const side = e.side ?? sideForIndex(i);
                const color = ACCENT_COLORS[e.accent];
                const revealTrivia = showTrivia && !!e.trivia;
                return (
                  <div
                    key={`${e.year}-${e.title}`}
                    className="relative grid grid-cols-2 mb-6.5 max-[680px]:block max-[680px]:pl-9.5 max-[680px]:mb-5"
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

          <div className="text-center mt-[14px]">
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
