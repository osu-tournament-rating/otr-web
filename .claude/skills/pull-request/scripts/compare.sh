#!/usr/bin/env bash
# Joins a before and an after screenshot into one labeled comparison image.
#
#   compare.sh <before.png> <after.png> <out.png> [caption]
#
# Places the pair side by side, or stacked when either is wider than 900px.
# The caption, when given, names the view, such as "Leaderboard, 390px wide".
# Needs ImageMagick 7 (`magick`).
set -euo pipefail

if [[ $# -lt 3 ]]; then
  echo "usage: compare.sh <before.png> <after.png> <out.png> [caption]" >&2
  exit 2
fi

before=$1 after=$2 out=$3 caption=${4:-}
font=$(fc-match -f '%{file}' 'Inter:style=Medium' 2>/dev/null || true)
font_args=()
[[ -n $font ]] && font_args=(-font "$font")

# Gives one screenshot a hairline border, a label above it, and padding.
panel() {
  local w
  w=$(magick identify -format '%[fx:w+2]' "$1")
  magick "$1" -bordercolor '#d4d4d8' -border 1 \
    \( -background white -fill '#3f3f46' "${font_args[@]}" -pointsize 22 \
       label:"$2" -gravity west -extent "${w}x44" \) \
    +swap -gravity west -background white -append \
    -bordercolor white -border 16 "$3"
}

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
panel "$before" Before "$tmp/before.png"
panel "$after" After "$tmp/after.png"

width=$(magick identify -format '%w\n' "$before" "$after" | sort -n | tail -1)
if (( width > 900 )); then join=-append; else join=+append; fi
magick "$tmp/before.png" "$tmp/after.png" -background white -gravity north \
  "$join" "$tmp/pair.png"

if [[ -n $caption ]]; then
  pair_w=$(magick identify -format '%[fx:w-32]' "$tmp/pair.png")
  magick "$tmp/pair.png" \
    \( -background white -fill '#18181b' "${font_args[@]}" -pointsize 26 \
       label:"$caption" -gravity west -extent "${pair_w}x56" \
       -bordercolor white -border 16x0 \) \
    +swap -background white -gravity west -append \
    -bordercolor white -border 8 "$out"
else
  magick "$tmp/pair.png" -bordercolor white -border 8 "$out"
fi
echo "$out"
