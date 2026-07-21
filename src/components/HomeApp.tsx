import { useEffect, useMemo, useState } from "react";
import { DOMAINS, ITEMS } from "../data/items";
import { EVENTS } from "../data/events";

type Mode = "gallery" | "through";

const MODE_KEY = "mshgsh_mode";
const BIAS_KEY = "mshgsh_bias";

const btnBase =
  "font-mono text-[12.5px] border-none rounded-full px-[18px] py-[9px] cursor-pointer transition-all duration-[180ms] whitespace-nowrap";

function chipClass(active: boolean) {
  return `font-mono text-[11px] border-2 border-ink rounded-full px-3 py-[5px] cursor-pointer transition-all duration-150 ${
    active ? "bg-ink text-white" : "bg-white text-ink"
  }`;
}

export default function HomeApp() {
  const [mode, setModeState] = useState<Mode>("gallery");
  const [bias, setBiasState] = useState(50);
  const [domain, setDomain] = useState<string>("all");
  const [hover, setHover] = useState<string | null>(null);

  useEffect(() => {
    try {
      const m = localStorage.getItem(MODE_KEY);
      const b = localStorage.getItem(BIAS_KEY);
      if (m === "gallery" || m === "through") setModeState(m);
      if (b !== null && !isNaN(+b)) setBiasState(+b);
    } catch {
      // localStorage unavailable (private browsing, etc) — fall back to defaults
    }
  }, []);

  const setMode = (m: Mode) => {
    setModeState(m);
    try {
      localStorage.setItem(MODE_KEY, m);
    } catch {}
  };

  const setBias = (v: number) => {
    setBiasState(v);
    try {
      localStorage.setItem(BIAS_KEY, String(v));
    } catch {}
  };

  const isGallery = mode === "gallery";

  const items = useMemo(
    () =>
      ITEMS.map((it) => {
        const match = domain === "all" || it.domain === domain;
        const dist = Math.abs(it.meter - bias);
        let op = 1 - (dist / 100) * 0.9;
        let scale = 1 + (1 - dist / 100) * 0.02;
        if (!match) {
          op = 0.1;
          scale = 0.97;
        }
        if (hover === it.id) {
          op = 1;
          scale = scale + 0.01;
        }
        return { ...it, op, scale };
      }),
    [domain, bias, hover],
  );

  return (
    <>
      <header className="flex items-center justify-between gap-5 flex-wrap pt-[26px] pb-[22px]">
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
          <div className="relative grid grid-cols-2 min-h-[280px] border-[2.5px] border-ink rounded-2xl overflow-hidden shadow-[6px_7px_0_rgba(0,0,0,.14)]">
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
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(62%,440px)] bg-white border-[2.5px] border-ink rounded-[13px] p-[22px_24px] text-center shadow-[4px_5px_0_rgba(0,0,0,.16)]">
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
          <div className="my-[30px] mb-[22px] flex gap-[26px] items-center flex-wrap">
            <div className="flex-[1_1_320px] min-w-[280px]">
              <div className="flex justify-between font-mono text-[10.5px] text-muted mb-[7px]">
                <span className="text-art">← more ART</span>
                <span>lean the spectrum</span>
                <span className="text-code">more CODE →</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={bias}
                onChange={(e) => setBias(+e.target.value)}
                className="bias-range w-full"
              />
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
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(248px,1fr))]">
            {items.map((it) => (
              <a
                key={it.id}
                href={it.href}
                className="block text-inherit"
                style={{
                  opacity: it.op,
                  transform: `scale(${it.scale})`,
                  transition: "opacity .35s ease, transform .35s ease, box-shadow .2s ease",
                }}
              >
                <div
                  className="bg-white border-2 border-ink rounded-xl overflow-hidden shadow-[3px_4px_0_rgba(0,0,0,.13)]"
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
                          className="absolute top-1/2 w-[11px] h-[11px] rounded-full bg-white border-2 border-ink -translate-y-1/2 -translate-x-1/2"
                          style={{ left: `${it.meter}%` }}
                        />
                      </div>
                      <span className="font-mono text-[8px] text-code">CODE</span>
                    </div>
                  </div>
                </div>
              </a>
            ))}
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
            <div className="absolute left-[calc(50%-1.5px)] top-0 bottom-0 w-[3px] bg-ink" />
            {EVENTS.map((e, i) => (
              <div key={i} className="relative grid grid-cols-2 mb-[26px]">
                <div
                  className={
                    e.side === "l"
                      ? "col-start-1 text-right pr-[34px]"
                      : "col-start-2 text-left pl-[34px]"
                  }
                >
                  <div className="bg-white border-2 border-ink rounded-xl px-[18px] py-[16px] shadow-[3px_4px_0_rgba(0,0,0,.12)]">
                    <div className="font-mono text-[13px] font-bold" style={{ color: e.color }}>
                      {e.year}
                    </div>
                    <div className="text-[18px] font-semibold leading-[1.15] my-[3px]">
                      {e.title}
                    </div>
                    <div className="text-[13px] leading-[1.5] text-[#5c574e]">{e.body}</div>
                  </div>
                </div>
                <div
                  className="absolute left-[calc(50%-9px)] top-4 w-[18px] h-[18px] rounded-full border-[2.5px] border-ink"
                  style={{ background: e.color, boxShadow: "0 0 0 4px #f4f1ea" }}
                />
              </div>
            ))}
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
    </>
  );
}
