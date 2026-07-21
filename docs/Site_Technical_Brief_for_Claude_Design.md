# mushogenshin.com — Technical Brief for Claude Design
### Companion to `Hoan_Nguyen_Work_Brief_for_Website.md`

> Design is now connected directly to the `mshgsh-zola-site` GitHub repo, so this only covers what browsing won't tell you: the stack decision, and a couple of easy-to-miss facts.

## Decision: full rebuild, off Zola — final

New stack: **Astro + Tailwind CSS**, static output, with React components mounted only where real interactivity earns it (galleries, hover/parallax on an art↔code landing split, filterable project grids) — chosen over Create React App specifically to avoid its deprecated-dependency baggage. **Images/CDN: Cloudflare R2** (zero egress fees, S3-compatible) once galleries grow — will need the domain's DNS moved behind Cloudflare.

The current repo is content/copy source material, not an IA to preserve. Propose navigation and visual system from scratch, guided by the Work Brief's priorities (art↔code duality landing, first-class sculpture galleries, dedicated flagship-project pages, retiring "under construction" framing).

## Easy to miss when browsing

- Two nav items in the current site are outbound links, not pages: **Fossil Skater** → `fossil-skater.mushogenshin.com` (the shipped game's own site) and **Verse Lang** → `childlike-verse-lang.web.app` (the standalone manuscript site). The new site should link to / showcase these, not rebuild them as internal pages.
- Two posts sit as unpublished drafts and tie directly into the Work Brief's flagship material: `content/sd-openpose-controlnet-limitations.md` (anatomy expertise meets generative-AI posing tools) and `content/unreal-procedural-anim.md` (directly supports the Fossil Skater "100% procedural animation" story). Worth surfacing.
