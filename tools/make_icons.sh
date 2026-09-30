#!/bin/sh
# Redraws the icons in icons/ from tools/icon.js - with the JavaScript
# engine, Quick Look and sips that come with macOS, nothing to install.
#
#   sh tools/make_icons.sh
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
work=$(mktemp -d)
"$JSC" -m tools/icon.js > "$work/icon.svg" || exit 1
qlmanage -t -s 1024 -o "$work" "$work/icon.svg" > /dev/null 2>&1
sips -s format png -z 512 512 "$work/icon.svg.png" --out icons/icon-512.png > /dev/null
sips -s format png -z 192 192 "$work/icon.svg.png" --out icons/icon-192.png > /dev/null
sips -s format png -z 180 180 "$work/icon.svg.png" --out icons/apple-touch-icon.png > /dev/null
rm -rf "$work"
echo "icons redrawn"
