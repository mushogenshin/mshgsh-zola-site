# Hoan Nguyen — Work Context Brief
### A handoff document for Claude Code, to inform a facelift of mushogenshin.com

> Purpose: this is a consolidated map of Hoan's work across every domain, assembled from his CVs, a full LinkedIn rewrite, his Unreal Fest Verse manuscript, and extended discussion. Use it to understand who he is and to help redesign his personal site so it stops burying his own work. Nothing here is filler; each section is real, verifiable work. Where something is NDA-sensitive or needs an asset from Hoan, it's flagged.

---

## 0. The one-line identity

**An artist who kept following problems into the technical side and never stopped.** Current site tagline — *"Operating greatly in the realm between Art and Programming"* — is exactly right and should stay near the center of the redesign. The whole site should express the **art ↔ code duality**, not pick a side.

Contact: info@mushogenshin.com · Studio: Mushogenshin Media LLC (Houston, TX) · US Permanent Resident.

**Biographical throughline (for About / narrative voice):** Born in a rural mountainous, post-war area of Vietnam. First language of code was Pascal (1999). Gifted at drawing, went to Architecture school (2005–2008, HCMC). Studied abroad in the US from 2008. Shifted to animation via AnimationMentor's 18-month Character Animation program (2012). Self-taught Python (2018), then Rust (2020), then Unreal C++. Green card in 2023 after 15 years. Kept two Scheme books since 2010 without fully grasping them at the time. Influences: Christopher Alexander, Isaac Asimov. Also: writes and performs comedy/theater, has a real sense of humor — the site voice should not be sterile.

---

## 1. Work domains (the content map)

### A. Character & Technical Animation — the professional spine
- 12+ years rigging, skinning, deformation across games, VR, film/TV.
- **Deformation depth**: pose-space deformation (PSD) and RBF correctives; the hard cases (shoulders, hips) under multi-layer garment/armor. FACS facial systems, blendshapes, wrinkle maps.
- **Creature range**: bipeds, quadrupeds, winged creatures, mechanical. Andean condor (largest wingspan), jellyfish (joint-budgeted tentacles), dragons, raptors, triceratops, leopard.
- **Rig tooling**: mGear (incl. RBF), Advanced Skeleton, Rapid Rig Modular, ngSkinTools, Skin Wrangler, braverabbit SHAPES & Smooth Weight, weightDriver, ZooTools.
- **Anatomy-driven**: reads deformation and silhouette as an artist, not only a rigger. This is the differentiator.
- **NDA-sensitive** (Hoan decides what to surface publicly): undead-creature VR work on a major TV franchise (RBF armor, wrinkle maps, a modular limb/weapon/armor swap tool); film-VFX-adjacent work. Keep franchise/client names out unless Hoan confirms rights.

### B. Tools, Pipeline & Systems Engineering
- **Asset Wrangler → Rusty Hunter**: rewrote a studio asset-management platform from Python/PyQt into Rust + immediate-mode GUI (egui). Motivation: the old stack was structurally stuck (mayapy backend on Py2, frontend Py3, decade of accretion, duck-typed runtime failures in front of artists). Result: runtime errors gone, instant cold start, scaled to 100–150 artists across 30+ productions. Added a headless Ubuntu WebSocket service (tokio-tungstenite, protobuf) as a real-time, heavily-contended shared source of truth for delivery lists.
- **miniTools2**: unassigned initiative — unified a department's scattered, self-installed Maya scripts under one roof; now serves ~70 artists. The name is a humble fossil from when he was new and didn't want to disturb people. This is his signature "arrive quietly, remove friction" story.
- **Houdini PDG pipelines**: RIDE 4 auto-LOD (8 LODs/part for ~70 Maya-only artists, queued like a render farm); Fota.io turntable rendering at scale with cloud overflow (GridMarkets).
- **StripTheRig**: Maya tool to bake animation off rigs → clean FBX for engine import; enabled dual-engine (Unity + Unreal) delivery.
- **SkyHook**: DCC-as-HTTP-server; migrated to Py3; his fork adds type safeguards.
- **Languages**: Python (12+ yrs), Rust (systems + tooling), C++ (Unreal), MEL, Blueprint. Infra: Linux/Ubuntu, Docker, MongoDB, Postgres, LDAP, self-hosted (Linode/DigitalOcean), AWS EC2.
- **Rust crates (public, GitHub — surface these)**: `mktree` (tree display via egui), `mkpoi` (installs customizations across Maya/ZBrush/Houdini/Photoshop), `mkutil` (clipboard, file dialog, image resizing utilities), `mk_usdcat_all` (PyQt wrapper over usdcat via Hython).

### C. Real-time & Unreal Engine
- **Control Rig** creatures; **Control Rig Physics** (5.6) hands-on and taught. Data-driven rig conforming across heterogeneous skeletons (Fortnite data-asset technique).
- **KineticRPG**: solo-architected UE 5.8 plugin in C++ on the Gameplay Ability System — data-asset authoring model, structured-concurrency primitives modeled on Verse, in-editor tooling with save-time validation, a text DSL with byte-equal round-trip, a node-graph editor. 17+ versions with written decision records + test plans.
- **Fossil Skater** (shipped, Steam + Epic Games Store, 2024): a 3-week Unreal Fellowship build. Dinosaurs race on vehicles worn as skates (one per leg: T-Rex on two cars = 8 wheels; Triceratops on four trucks = 16). **100% procedural creature animation, zero keyframes** — legs spread under steering, spine compresses under braking, neck wobbles through turns (FullBodyIK + DynamicChain). Handling differences fall out of anatomy (both steer only 4 wheels), not tuning. Shown at Unreal Fest Seattle 2024. This is his shipped, procedural-animation flagship — should be a marquee item.
- Motion Matching, Sequencer, Game Features, Enhanced Input.

### D. Programming languages & Verse advocacy
- **The journey is itself content**: Pascal (1999) → self-taught Python (2018) → Rust (2020) → Unreal C++. Framed as problem-driven, not chronological: each language entered his hands because a real problem demanded it.
- **Verse**: deep, ongoing fascination (functional-logic language). Gave the talk **"A Childlike Perspective of the Verse Programming Language"** at **Unreal Fest Bali 2025** (proposal originally for Orlando 2025). Full manuscript lives at https://childlike-verse-lang.web.app/ — covers failure contexts (`decides`/`transacts`), structured concurrency (`sync`/`race`), interfaces-over-inheritance, Scene Graph, and a 90-year history from lambda calculus to Verse, all from a non-programmer's lens. Talk video: youtube watch?v=ih8it5N5IbQ.
- **"A DinoSkater's Guide to UE C++"**: a book-in-progress (longer-format backstory of his UE C++ journey), tied to the Fossil Skater / Truong CG Artist Control Rig tooling.

### E. Fine Art & Sculpture — UNDEREXPOSED, wants resurfaced
- **"Battle of Cascina"** (2014): figurative sculpting project, ~19 figures (after Michelangelo's lost cartoon). Abandoned prematurely. Search "Battle of Cascina by Mushogenshin". Existing blog post framed self-deprecatingly ("How NOT to start a project comprising of 19 figurative sculptures") — the redesign should reframe it as serious figurative work.
- **"Busts of Great Thinkers"** (2016): portrait sculpts of scientists — Isaac Asimov, Richard Feynman, Carl Sagan, Nikola Tesla, etc. Also abandoned prematurely.
- Both were dropped when he "lived under a rock" wishing for recognition, then dove into programming. **Resurfacing these is emotionally central to why he's doing the facelift** — see §4.
- Digital sculpting: ZBrush. 3D-print pipeline: ZBrush → STL → Cura / Chitubox / Bambu Studio. Profiles: Sketchfab, ArtStation, Thingiverse, Cults3D.
- **ASSET GAP**: Claude Code should ask Hoan for images/renders/links for both sculpture bodies — they likely aren't well-archived and need collecting.

### F. Anatomy — the bridge between art and tech
- Human artistic anatomy (trained under **Scott Eaton**: Anatomy for Artists, Digital Figure Sculpting, Facial Anatomy). Comparative **animal** anatomy, self-taught over ~3 years from illuminating books. This knowledge feeds directly into his rigging/deformation quality and his teaching.

### G. Teaching & Pedagogy
- Since 2016, **800+ students** (DPGP TechArt School, and independently), across Vietnam and the US. Subjects: artistic anatomy, character rigging, digital sculpting, Python scripting, tool development, and Unreal Control Rig Physics.
- Genuine fascination with epistemology and pedagogy; sees teaching as core identity, not a sideline. Teaching link: "Human Anatomy for Artists (Vietnamese)."

### H. Shipped products & apps
- **Fossil Skater** (game — §C).
- **Anastomia** (2020–2022, iOS/Android/PC): 3D animal/creature artistic-anatomy learning app (Unity, Django, Firebase, AWS EC2) + Git asset pipeline for a 15-person team.
- **Kineograph** (2025, Flutter, cross-platform: iOS/Android/macOS/Windows/web): frame-by-frame motion & transformation study app.
- **Comparative Animal Anatomy** mobile app (linked under Artistic Anatomy).

### I. Writing & speaking
- Verse essay/manuscript (§D). "DinoSkater's Guide" book (§D). Unreal Fest Bali 2025 speaker; Unreal Fest Seattle 2024 attendee. Blog posts (Battle of Cascina, Houdini-Docker-on-Apple-Silicon, showreel, etc.).

---

## 2. Current site (as-is)

- **Domain**: mushogenshin.com. **Stack history**: WordPress → Hugo → **Zola** (current). Static site.
- **Tagline**: "Operating greatly in the realm between Art and Programming." Portrait: a stylized self-illustration.
- **Nav**: Home · About · UE C++ · Rigging · FossilSkater · Verse Lang · Archive · Links.
- **Home** = reverse-chron post feed (Verse Fest 2025, Unreal Fellowship, 2024 Showreel, Houdini-Docker, Battle of Cascina, etc.).
- **UE C++** = exercise/experiment log + the DinoSkater book teaser.
- **Rigging** = "New Horizons in CG Rigging" (Maya 2010→proficient 2016–19 → sidetracked into pipeline programming 2020–23 → re-excited by SideFX APEX + Epic Control Rig). Marked under construction.
- **Archive** = chronological index. **Links** = Sculptures/Designs, Artistic Anatomy, 3D Printing, Teaching, Programming (GitHub + Rust crates).
- Social: ArtStation, GitHub, LinkedIn, Twitter, Ko-fi/Patreon.

**Honest read of the current site's problem** (same pattern as his résumés): the work is real and deep, but it's scattered across an under-maintained post feed, several sections are "under construction," and the **art/sculpture side is nearly invisible** despite being foundational. The site undersells him exactly the way his 2024 CV did.

---

## 3. Suggested facelift priorities (for Hoan + Claude Code to decide together)

1. **Make the art↔code duality the spine.** A landing that immediately shows both a sculpture and a rig/tool, under the existing tagline. Don't make a visitor choose "is this an artist or an engineer site."
2. **Resurface the sculpture work** (Battle of Cascina, Busts of Great Thinkers) as first-class galleries, reframed as serious figurative/portrait work — not self-deprecating blog footnotes. (Needs assets — ask Hoan.)
3. **Give the flagship projects real pages**, not feed entries: Fossil Skater, KineticRPG, the Verse talk, the Rust crates, the deformation/rigging reel.
4. **Retire "under construction."** Either finish Rigging/UE C++ sections or fold them into project pages.
5. **Keep his voice**: warm, curious, funny, teacherly, a little self-aware. He writes plays; the site can have personality. Avoid corporate-portfolio blandness.
6. **Preserve Zola** unless there's a reason to move; it's working and he's iterated the stack enough.
7. **Thread the throughline**: the biographical arc (Vietnam → drawing → architecture → animation → rigging → Python → Rust → Unreal → Verse) is a genuinely compelling story and could anchor the About page.

---

## 4. Why this matters to him (context, not instruction)

Hoan has a long-standing, self-identified habit of burying his own work and waiting to be recognized rather than putting it forward. The sculpture projects were abandoned partly for that reason. This facelift is his deliberate correction of that pattern. Treat the resurfacing of the abandoned art work with a little care — it's not just content, it's the point.

---

## 5. Asset & link inventory (collect / verify)

- Demo reel (tech art, rigging/animation): youtu.be/VstDNctVLPM
- Verse talk manuscript: https://childlike-verse-lang.web.app/ · talk video: youtube.com/watch?v=ih8it5N5IbQ
- Fossil Skater: Steam + Epic Games Store store pages (get URLs from Hoan)
- GitHub: github.com/mushogenshin (crates: mktree, mkpoi, mkutil, mk_usdcat_all; SkyHook fork)
- USD case study video: youtu.be/zDsFu81Yn5U
- Anastomia, Kineograph, Comparative Animal Anatomy app: store links from Hoan
- Sculpture: Sketchfab, ArtStation, Thingiverse, Cults3D profiles; **Battle of Cascina + Busts of Great Thinkers images — NEEDED**
- Teaching: "Human Anatomy for Artists (Vietnamese)" link
- Support: Patreon / Ko-fi

**Flag for Hoan before publishing**: confirm which film/VR/franchise work can be named publicly (NDA), and gather the sculpture assets — those two are the main blockers to a complete site.
