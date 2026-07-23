/**
 * Cloudflare R2 asset URL helper.
 *
 * All image URLs on the site are built from a single base URL held in the
 * `PUBLIC_R2_BASE_URL` env var. The `PUBLIC_` prefix is required by Astro/Vite
 * so the value is inlined into the client bundle — `HomeApp` is a `client:load`
 * React island, so it needs the base URL at runtime in the browser, not just
 * during the server build.
 *
 * Because every asset path funnels through `r2()`, migrating the bucket's
 * public endpoint (see the custom-domain TODO below) is a one-line env change,
 * never a code change.
 *
 * ── Access strategy ──────────────────────────────────────────────────────────
 * Currently pointed at R2's `*.r2.dev` development URL. That endpoint is
 * rate-limited and Cloudflare explicitly marks it "not for production" — it's
 * here so we can wire up and test image insertion before touching DNS.
 *
 * TODO(custom-domain): once the apex domain's DNS sits behind Cloudflare, bind
 * the bucket to a subdomain (e.g. `cdn.mushogenshin.com`) and set
 * `PUBLIC_R2_BASE_URL=https://cdn.mushogenshin.com`. No code changes needed —
 * only the `.env` value. Ask and I'll walk through the Cloudflare dashboard
 * steps (bucket → Settings → Custom Domains, DNS record, cache rules).
 */
const BASE = import.meta.env.PUBLIC_R2_BASE_URL ?? "";

/**
 * Resolve a Gallery/asset image reference to a URL.
 *
 * @param key  Either an R2 object key (recommended, e.g. `"cascina/cover.webp"`)
 *             or a full `http(s)://` URL. A key is prefixed with
 *             `PUBLIC_R2_BASE_URL` so it migrates with the bucket (one env change,
 *             no data edits); a leading slash is tolerated and stripped. A full
 *             URL is returned **as-is** — an escape hatch for one-off covers on a
 *             different host, at the cost of not auto-migrating with the base.
 * @returns    Absolute URL (or a root-relative path if `PUBLIC_R2_BASE_URL` is
 *             unset, so local dev never produces `undefined/...`).
 *
 * @example r2("cascina/cascina-2016-b.webp")
 *   → "https://cdn.mushogenshin.com/cascina/cascina-2016-b.webp"  (base prefixed)
 * @example r2("https://cdn.mushogenshin.com/cascina/cascina-2016-b.webp")
 *   → unchanged
 */
export const r2 = (key: string): string =>
  /^https?:\/\//i.test(key) ? key : `${BASE}/${key.replace(/^\/+/, "")}`;
