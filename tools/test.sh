#!/bin/sh
# Runs every check: the game's logic tests (with the JavaScript engine that
# comes with macOS - nothing to install) and the offline file list.
#
#   sh tools/test.sh
cd "$(dirname "$0")/.." || exit 1
JSC=/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc
output=$("$JSC" -m tests/all.js 2>&1)
echo "$output"
echo "$output" | tail -1 | grep -q '^PASSED' || exit 1
python3 tools/check_assets.py || exit 1
