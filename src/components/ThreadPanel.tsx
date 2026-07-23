import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Condensed work data the slide-over renders — a subset of the gallery `WorkItem`,
 * built on the thread page at build time (src/pages/thread/[slug].astro) for every
 * work the moment references (its `produced` ids + any `work:`-typed cross-section
 * chips). No client fetch: it all ships as this island's `works` prop.
 */
export interface PanelWork {
  id: string;
  title: string;
  domain: string;
  yearLabel: string;
  status?: string;
  standfirst: string;
  meter: number;
  color: string;
  slot: string;
  /** Resolved URL of `media[0]` if the work has adopted a cover; else color+slot placeholder. */
  coverImage?: string;
  tools: string[];
  links: { label: string; href: string }[];
}

const MONO = "'JetBrains Mono', monospace";

// Static style fragments (dynamic bits — color, meter%, urls — are merged inline).
const OVERLAY: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 60,
  background: "rgba(26,24,21,.38)",
  animation: "dimIn .25s ease both",
};
const PANEL: CSSProperties = {
  position: "absolute",
  top: 0,
  right: 0,
  bottom: 0,
  width: 620,
  maxWidth: "92vw",
  background: "#f4f1ea",
  borderLeft: "2.5px solid #1a1815",
  boxShadow: "-14px 0 40px rgba(26,24,21,.35)",
  display: "flex",
  flexDirection: "column",
  animation: "panelIn .32s cubic-bezier(.3,0,.2,1) both",
};
const CLOSE_BTN: CSSProperties = {
  width: 30,
  height: 30,
  border: "2px solid #1a1815",
  borderRadius: "50%",
  background: "#fff",
  cursor: "pointer",
  fontSize: 14,
  lineHeight: 1,
  boxShadow: "2px 2px 0 rgba(0,0,0,.12)",
  flex: "0 0 auto",
};
const CHIP: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10,
  border: "1.5px solid #1a1815",
  borderRadius: 16,
  padding: "2px 9px",
  background: "#fff",
};
const LINK_ROW: CSSProperties = {
  fontFamily: MONO,
  fontSize: 10.5,
  color: "#1a1815",
  border: "2px solid #1a1815",
  borderRadius: 10,
  padding: "7px 12px",
  background: "#fff",
  boxShadow: "2px 3px 0 rgba(0,0,0,.12)",
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
};

/**
 * The in-place work panel for a Thread Detail page. The thread view stays mounted
 * underneath — the panel is a right-side slide-over over a scrim (see
 * handoff/thread-detail.md; this is the ONLY place the rejected `/work` overlay
 * variant survives — the full page remains canonical).
 *
 * Wiring: the page's static triggers are real `<a href="/work/{id}" data-work-panel>`
 * anchors (so they navigate to the full page with JS off / in a new tab / for
 * crawlers). This island attaches ONE delegated document click listener that
 * intercepts a plain left-click on such an anchor and opens the panel instead.
 *
 * URL model: opening pushes `/work/{id}` (so copy-URL and browser-back behave — a
 * direct visit to `/work/{id}` renders the full static page, never the panel), and
 * popstate closes back to `/thread/{slug}`. Close via × / backdrop / Esc all route
 * through `history.back()` so state and URL never drift.
 */
export default function ThreadPanel({ works }: { works: Record<string, PanelWork> }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const openRef = useRef<string | null>(null);
  const savedOverflow = useRef<string>("");
  const triggerEl = useRef<HTMLElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    openRef.current = openId;
  }, [openId]);

  // Body scroll-lock while the panel is open (the mock's fixed overlay doesn't need
  // it at mock scale; a real, tall thread page does — restore the prior value, never
  // assume it was "").
  const lockScroll = useCallback((on: boolean) => {
    if (on) {
      savedOverflow.current = document.body.style.overflow;
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = savedOverflow.current;
    }
  }, []);

  const applyOpen = useCallback(
    (id: string) => {
      setOpenId(id);
      lockScroll(true);
    },
    [lockScroll],
  );
  const applyClose = useCallback(() => {
    setOpenId(null);
    lockScroll(false);
    // Return focus to the trigger that opened the panel (a11y).
    triggerEl.current?.focus();
    triggerEl.current = null;
  }, [lockScroll]);

  // User-initiated open: push (first open) or replace (switching works) the URL to
  // /work/{id}, then reflect it in state.
  const openPanel = useCallback(
    (id: string) => {
      const url = `/work/${id}`;
      const entry = { threadPanel: id };
      if (openRef.current == null) history.pushState(entry, "", url);
      else history.replaceState(entry, "", url);
      applyOpen(id);
    },
    [applyOpen],
  );
  // User-initiated close: unwind the pushed history entry so the URL returns to the
  // thread; popstate then does the actual close. Fall back to a direct close if there
  // is nothing to pop.
  const closePanel = useCallback(() => {
    if (history.state && history.state.threadPanel) history.back();
    else applyClose();
  }, [applyClose]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Leave modified / non-primary clicks to the browser (open full page in a new tab).
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const el = (e.target as HTMLElement).closest<HTMLElement>("[data-work-panel]");
      if (!el) return;
      const id = el.dataset.workPanel;
      if (!id || !works[id]) return; // unknown work → let the anchor navigate to the full page
      e.preventDefault();
      triggerEl.current = el;
      openPanel(id);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && openRef.current) {
        e.preventDefault();
        closePanel();
      }
    };
    const onPop = () => {
      const id = history.state?.threadPanel as string | undefined;
      if (id && works[id]) applyOpen(id);
      else applyClose();
    };
    document.addEventListener("click", onClick);
    window.addEventListener("keydown", onKey);
    window.addEventListener("popstate", onPop);
    return () => {
      document.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("popstate", onPop);
    };
  }, [works, openPanel, closePanel, applyOpen, applyClose]);

  // Focus the close button when the panel opens (a11y: move focus into the dialog).
  useEffect(() => {
    if (openId) closeBtnRef.current?.focus();
  }, [openId]);

  if (!openId) return null;
  const w = works[openId];
  if (!w) return null;
  const workUrl = `/work/${w.id}`;

  return (
    <div style={OVERLAY} onClick={closePanel}>
      <div
        style={PANEL}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={w.title}
      >
        {/* header: close · url pill · full-page escape hatch */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "14px 20px",
            borderBottom: "2px solid #1a1815",
            background: "#fff",
          }}
        >
          <button ref={closeBtnRef} type="button" onClick={closePanel} style={CLOSE_BTN} aria-label="Close">
            ×
          </button>
          <span
            style={{
              flex: 1,
              fontFamily: MONO,
              fontSize: 10.5,
              background: "#f4f1ea",
              border: "1.5px solid #d8d2c4",
              borderRadius: 20,
              padding: "4px 12px",
              color: "#6d675c",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            mushogenshin.com
            <span style={{ color: "#a5502f", fontWeight: 700 }}>{workUrl}</span>
          </span>
          <a
            href={workUrl}
            style={{
              fontFamily: MONO,
              fontSize: 10.5,
              color: "#1a1815",
              border: "2px solid #1a1815",
              borderRadius: 20,
              padding: "4px 11px",
              background: "#fff",
              boxShadow: "2px 2px 0 rgba(0,0,0,.12)",
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            full page ↗
          </a>
        </div>

        {/* body */}
        <div style={{ flex: 1, overflow: "auto", padding: "22px 26px 26px" }}>
          <div
            style={{
              position: "relative",
              border: "2px solid #1a1815",
              borderRadius: 12,
              overflow: "hidden",
              aspectRatio: "16 / 9",
              boxShadow: "3px 4px 0 rgba(0,0,0,.13)",
              display: "flex",
              alignItems: "flex-end",
              padding: 10,
              background: w.color,
            }}
          >
            {w.coverImage && (
              <img
                src={w.coverImage}
                alt={w.title}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  maxWidth: "none",
                  objectFit: "cover",
                  display: "block",
                }}
              />
            )}
            {!w.coverImage && (
              <span style={{ fontFamily: MONO, fontSize: 9.5, color: "rgba(0,0,0,.5)" }}>{w.slot}</span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "16px 0 8px", flexWrap: "wrap" }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 10,
                background: "#1a1815",
                color: "#fff",
                padding: "2px 9px",
                borderRadius: 20,
                whiteSpace: "nowrap",
              }}
            >
              {w.domain}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10.5, color: "#8a8378", whiteSpace: "nowrap" }}>
              {w.yearLabel}
            </span>
            {w.status && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: 10,
                  color: "#a5502f",
                  border: "1.5px solid #e78a4e",
                  borderRadius: 20,
                  padding: "1px 8px",
                  background: "#fdf3e4",
                  whiteSpace: "nowrap",
                }}
              >
                {w.status}
              </span>
            )}
          </div>

          <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1.05 }}>{w.title}</div>
          <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#4a453d", margin: "9px 0 14px" }}>
            {w.standfirst}
          </p>

          {/* bare mini meter (no vein — thread pages stay calm) */}
          <div
            style={{
              position: "relative",
              height: 6,
              borderRadius: 3,
              background: "linear-gradient(90deg,#e0531f,#f0c94a 50%,#2f6df0)",
              margin: "18px 0 4px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "50%",
                left: `${w.meter}%`,
                transform: "translate(-50%,-50%)",
                width: 3.5,
                height: 13,
                borderRadius: 2,
                background: "#1a1815",
                boxShadow: "0 0 0 1.5px rgba(255,255,255,.9)",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              fontFamily: MONO,
              fontSize: 9.5,
              color: "#8a8378",
              marginBottom: 16,
            }}
          >
            <span style={{ color: "#c9491a" }}>ART · {w.meter}/100</span>
            <span style={{ color: "#2450c9" }}>CODE</span>
          </div>

          {w.tools.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
              {w.tools.map((t) => (
                <span key={t} style={CHIP}>
                  {t}
                </span>
              ))}
            </div>
          )}

          {w.links.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {w.links.map((l) => (
                <a key={l.href + l.label} href={l.href} target="_blank" rel="noopener" style={LINK_ROW}>
                  <span>{l.label}</span>
                  <span>↗</span>
                </a>
              ))}
            </div>
          )}

          <div
            style={{
              marginTop: 18,
              borderTop: "1.5px dashed #d8d2c4",
              paddingTop: 12,
              fontFamily: MONO,
              fontSize: 10,
              color: "#b3ab9c",
            }}
          >
            esc / × / click outside — the thread is still exactly where you left it.
          </div>
        </div>
      </div>
    </div>
  );
}
