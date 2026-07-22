# Legacy Zola site

This directory holds the **previous** mushogenshin.com — a [Zola](https://www.getzola.org/)
static site (Anatole theme) that the current Astro + Tailwind site replaces.
It is kept for reference only: content to migrate, copy to reuse, and assets to
pull forward. Nothing in here is part of the Astro build.

## What's here

| Path | What it was |
|------|-------------|
| `config.toml` | Zola site config (base URL, theme, markdown/highlighting) |
| `content/` | All Markdown posts + section indexes (the real source content) |
| `templates/` | Custom Tera templates layered over the Anatole theme |
| `themes/` | Vendored Zola themes as git submodules (`anatole` = the one in use; `anpu`, `float` = unused experiments) |
| `static/` | Static assets (logos, platform icons) served as-is |
| `Makefile` | `make s` (`zola serve`) / `make b` (`zola build`) |

## Content still worth migrating

The published posts and — notably — two unpublished drafts live under `content/`:
`content/sd-openpose-controlnet-limitations.md` (anatomy ↔ generative-AI posing)
and `content/unreal-procedural-anim.md` (supports the Fossil Skater procedural-
animation story). See `docs/Site_Technical_Brief_for_Claude_Design.md` for the
fuller inventory.

## Running the old site (if ever needed)

```sh
cd legacy && zola serve   # requires a local Zola install
```

Once its content and assets have been fully carried into the Astro site, this
whole directory can be deleted — its history stays in git.
