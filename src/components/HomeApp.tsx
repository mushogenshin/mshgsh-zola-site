import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAutoAnimate } from "@formkit/auto-animate/react";
import { DOMAINS, ITEMS } from "../data/items";
import { ACCENT_COLORS, sideForIndex, type ThroughlineEvent } from "../config/throughline";
import { REFLOW_ANIMATION, SPECTRUM_CONFIG, TILE_TRANSITION } from "../config/spectrum";
import TutorialHand, { type TutorialPhase } from "./TutorialHand";

const SEEN_DIAL_KEY = "mshgsh_seen_dial";

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

  // Seeded from the default dial so the first paint already shows the
  // correct cull set — no blank/wrong slots before the mount effect runs.
  const [collapsed, setCollapsed] = useState<Set<string>>(() => cullFor(50));
  const [entering, setEntering] = useState<Set<string>>(() => new Set());

  // Floating bias pill: the inline slider's container is observed; once it
  // scrolls out of view a fixed copy of the same control fades in at the bottom.
  const inlineBiasRef = useRef<HTMLDivElement>(null);
  const [showFloat, setShowFloat] = useState(false);

  // First-visit dial tutorial hand. Phase machine:
  // swivel → resting (after 5s) → following → leaving → gone (on first interaction).
  const [tutorialPhase, setTutorialPhase] = useState<TutorialPhase>("swivel");
  // Gates the hand to client-only: false during SSR and first hydration render, so
  // the cue is never in the server HTML (no flash for returning guests before the
  // seen check runs, and no dependence on localStorage during SSR).
  const [mounted, setMounted] = useState(false);
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
    } catch {
      // localStorage unavailable (private browsing, etc) — fall back to defaults
    }
  }, []);

  // Dial tutorial: a returning guest (seen flag set) skips straight to 'gone';
  // a new guest sees the hand rock, then rest after 5s (matching the swivel run).
  useEffect(() => {
    setMounted(true);
    let seen = false;
    try {
      seen = !!localStorage.getItem(SEEN_DIAL_KEY);
    } catch {
      // localStorage unavailable — treat as a fresh guest and show the cue
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

  useEffect(() => {
    return () => {
      collapseTimers.current.forEach((timer) => clearTimeout(timer));
      collapseTimers.current.clear();
      if (cullDebounce.current) clearTimeout(cullDebounce.current);
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
  };

  const setBias = (v: number) => {
    dismissTutorial(); // first drag on either control retires the tutorial hand
    setBiasState(v); // live — slider position + in-range tile opacity/scale track the drag
    try {
      localStorage.setItem(BIAS_KEY, String(v));
    } catch {}
    if (cullDebounce.current) clearTimeout(cullDebounce.current);
    cullDebounce.current = setTimeout(() => scheduleCull(v), 180); // debounced — the actual reflow
  };

  const isGallery = mode === "gallery";
  const showTutorial = mounted && isGallery && tutorialPhase !== "gone";

  // Reveal the floating bias pill only in Gallery mode and only while the inline
  // control is scrolled out of view. IntersectionObserver avoids scroll-event spam
  // and manual offset math; keyed on isGallery because the inline control (and its
  // ref) only exists while the Gallery is rendered.
  useEffect(() => {
    if (!isGallery) {
      setShowFloat(false);
      return;
    }
    const el = inlineBiasRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setShowFloat(!entry.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [isGallery]);

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
                      <span className="absolute top-[9px] left-[9px] font-mono text-[9.5px] bg-ink text-white px-[7px] py-[2px] rounded-full">
                        {it.domain}
                      </span>
                      <span className="absolute top-[9px] right-[11px] font-mono text-[10px] text-black/50">
                        {it.year}
                      </span>
                      <span className="font-mono text-[9px] text-black/50">{it.slot}</span>
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
                          <div
                            className="absolute top-1/2 w-[3px] h-[11px] rounded-[1.5px] bg-ink -translate-y-1/2 -translate-x-1/2 shadow-[0_0_0_1px_rgba(255,255,255,0.85)]"
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
          </div>

          <div className="relative mt-[52px] pl-[2px]">
            <div className="absolute left-[calc(50%-1.5px)] top-0 bottom-0 w-[3px] bg-ink max-[680px]:left-1.75" />
            {throughline.map((e, i) => {
              const side = sideForIndex(i);
              const color = ACCENT_COLORS[e.accent];
              return (
                <div
                  key={i}
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

      {/* Floating bias control — the same bias/setBias, surfaced at bottom-center
          once the inline slider scrolls away. Centered with auto-margins (never
          transform: translateX) so the opacity-only entry animation can't erase
          the centering; the glow pulse lives in global.css. */}
      {isGallery && showFloat && (
        <div
          role="group"
          aria-label="Art–code spectrum bias"
          className="fixed left-0 right-0 bottom-[18px] z-[60] mx-auto flex items-center gap-3 w-[min(460px,92vw)] bg-white border-2 border-ink rounded-[40px] px-[18px] py-[10px]"
          style={{
            boxShadow: "0 10px 34px rgba(26,24,21,.22), 0 0 34px 7px rgba(139,74,224,.6)",
            animation: "fadein .28s ease both, glowpulse 2.8s ease-in-out .3s infinite",
          }}
        >
          <span className="font-mono text-[10px] text-art whitespace-nowrap">ART</span>
          <div className="relative flex-1">
            <input
              type="range"
              min={0}
              max={100}
              value={bias}
              onChange={(e) => setBias(+e.target.value)}
              aria-label="Bias the gallery toward art or code"
              className="bias-range w-full block"
            />
            {showTutorial && <TutorialHand bias={bias} phase={tutorialPhase} gap={26} />}
          </div>
          <span className="font-mono text-[10px] text-code whitespace-nowrap">CODE</span>
        </div>
      )}
    </>
  );
}
