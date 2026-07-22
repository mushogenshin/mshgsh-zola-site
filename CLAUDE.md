# mushogenshin.com — project notes for Claude

Static personal site. Stack: **Astro + Tailwind v4 + React islands**, built largely by
porting Claude Design mockups (`Home.dc.html`, etc.) fetched via the claude-design MCP.
The live interactive UI lives in `src/components/HomeApp.tsx` (a `client:load` island).

## Porting Design mockups → Astro + Tailwind: watch for Preflight divergence

Design mockups are **raw HTML/CSS with no Tailwind Preflight**. Our site loads Preflight
via `@import "tailwindcss"` in `src/styles/global.css`, so a component that's a faithful,
byte-accurate port of the mockup can still render **differently** because Tailwind's base
resets apply here but not in the mockup. These failures are **silent** — no error, no
console warning, just wrong layout. Suspect this *before* assuming a logic bug whenever a
ported element looks off.

### Known trap — images collapse to 0×0 (this cost ~2 hours of debugging once)

Preflight ships `img, video { max-width: 100%; height: auto; }`. If a ported `<img>` sits
inside a **zero-size or very small positioned wrapper** — e.g. the tutorial hand's `width:0`
pivot used for rotation — then `max-width: 100%` resolves to `100% of 0 = 0`, overrides the
`width="…"` attribute, and the image renders **0×0 and invisible** (an empty `alt` shows
nothing at all). The mockup never reveals this because it has no Preflight.

- **Fix:** pin the image's own size inline and clear the cap —
  `style={{ width: 32, maxWidth: "none" }}` (inline beats the stylesheet reset).
- **Debugging tell (memorize this):** the element is invisible, but in the console
  `img.naturalWidth` is correct (e.g. `160`) and `img.complete` is `true`, yet
  `img.getBoundingClientRect()` is `width: 0, height: 0`. That combination = a CSS
  **collapse**, not a failed load and not a logic/state bug. Go straight to Preflight/CSS.

More generally, when a ported element is invisible or mis-sized and the JS state looks
right, suspect a Preflight reset first: `img`/`svg` → `display:block`; `button` →
background/border reset; `h1`–`h6`, `ul`, `ol`, `p` → margin + list-style resets; `table`
→ `border-collapse`. Override the specific property inline or with a utility class.
