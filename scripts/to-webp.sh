#!/usr/bin/env bash
#
# to-webp.sh — convert images to WebP with the site's standard settings.
#
# Wraps `cwebp` (from Google's libwebp; `brew install webp`) with the exact
# encode flags we've standardised on for R2 assets:
#   -q 82        visually-lossless quality; good size/quality trade for photos
#                and flat art alike (2–3.5 MB PNGs → ~30–110 KB in practice)
#   -m 6         slowest/best compression search
#   -metadata none   strip EXIF/ICC/XMP (privacy + a few extra KB saved)
#
# Each source `foo.png` is written next to it as `foo.webp`. Sources are left
# untouched. Accepted inputs: png, jpg, jpeg, tiff, tif, bmp (cwebp's set);
# existing `.webp` files are skipped so re-runs are idempotent.
#
# ── Usage ─────────────────────────────────────────────────────────────────────
#   1. By file path(s):   ./scripts/to-webp.sh a.png b.jpg …
#   2. By directory:      ./scripts/to-webp.sh path/to/dir
#   3. Recursive:         ./scripts/to-webp.sh -r path/to/dir
#
# Options:
#   -r, --recursive   Recurse into subdirectories (only affects directory args).
#   -q, --quality N   Override quality (0–100; default 82).
#   -f, --force       Re-encode even if the .webp already exists (default: skip).
#   -h, --help        Show this help.
#
# Files and directories can be mixed in one invocation. Exit status is non-zero
# if any conversion fails.
set -euo pipefail

QUALITY=82
RECURSIVE=0
FORCE=0

die() { printf 'to-webp: %s\n' "$1" >&2; exit 1; }

usage() {
  # Print the leading comment block (lines starting with '#'), sans shebang.
  sed -n '3,/^set -/p' "$0" | sed 's/^# \{0,1\}//; s/^#//' | sed '$d'
  exit "${1:-0}"
}

command -v cwebp >/dev/null 2>&1 || die "cwebp not found — install with 'brew install webp'"

# ── Parse args: options may precede or be interleaved with paths ──────────────
PATHS=()
while [ $# -gt 0 ]; do
  case "$1" in
    -r|--recursive) RECURSIVE=1; shift ;;
    -f|--force)     FORCE=1; shift ;;
    -q|--quality)   [ $# -ge 2 ] || die "--quality needs a value"; QUALITY="$2"; shift 2 ;;
    -h|--help)      usage 0 ;;
    --)             shift; while [ $# -gt 0 ]; do PATHS+=("$1"); shift; done ;;
    -*)             die "unknown option: $1" ;;
    *)              PATHS+=("$1"); shift ;;
  esac
done

[ "${#PATHS[@]}" -gt 0 ] || usage 1
[[ "$QUALITY" =~ ^[0-9]+$ ]] && [ "$QUALITY" -le 100 ] || die "quality must be 0–100"

converted=0 skipped=0 failed=0

# Convert one source file to a sibling .webp.
convert_one() {
  local src="$1" out="${1%.*}.webp"
  if [ -e "$out" ] && [ "$FORCE" -eq 0 ]; then
    printf '  skip   %s (exists; use -f to force)\n' "$out"
    skipped=$((skipped + 1))
    return 0
  fi
  if cwebp -q "$QUALITY" -m 6 -metadata none "$src" -o "$out" >/dev/null 2>&1; then
    printf '  ✓ %7d B  %s\n' "$(stat -f%z "$out" 2>/dev/null || stat -c%s "$out")" "$out"
    converted=$((converted + 1))
  else
    printf '  ✗ FAILED  %s\n' "$src" >&2
    failed=$((failed + 1))
  fi
}

# Emit every convertible file under a directory, respecting $RECURSIVE. Uses
# -print0/read to survive spaces and newlines in paths. `.webp` is excluded so
# we never try to re-encode our own output.
list_dir() {
  # Two explicit branches rather than a "${depth[@]}" array — an empty array
  # expansion trips `set -u` on macOS's stock bash 3.2.
  local dir="$1"
  local types=( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg'
                -o -iname '*.tif' -o -iname '*.tiff' -o -iname '*.bmp' )
  if [ "$RECURSIVE" -eq 1 ]; then
    find "$dir" -type f \( "${types[@]}" \) -print0
  else
    find "$dir" -maxdepth 1 -type f \( "${types[@]}" \) -print0
  fi
}

for p in "${PATHS[@]}"; do
  if [ -d "$p" ]; then
    printf '%s%s\n' "$p/" "$([ "$RECURSIVE" -eq 1 ] && echo ' (recursive)')"
    while IFS= read -r -d '' f; do convert_one "$f"; done < <(list_dir "$p")
  elif [ -f "$p" ]; then
    convert_one "$p"
  else
    printf '  ✗ not found: %s\n' "$p" >&2
    failed=$((failed + 1))
  fi
done

printf '\nconverted %d · skipped %d · failed %d\n' "$converted" "$skipped" "$failed"
[ "$failed" -eq 0 ]
