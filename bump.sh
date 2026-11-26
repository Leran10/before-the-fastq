#!/bin/sh
# Bump the site version stamp (cache busting + update banner). Usage: ./bump.sh 2026-11-27a
set -e
[ -n "$1" ] || { echo "usage: $0 <version>"; exit 1; }
sed -i '' "s/export const VERSION = '[^']*';/export const VERSION = '$1';/" src/main.js
sed -i '' "s/main\.js?v=[0-9a-zA-Z._-]*/main.js?v=$1/; s/styles\.css?v=[0-9a-zA-Z._-]*/styles.css?v=$1/" index.html
printf '{"v": "%s"}\n' "$1" > version.json
grep -c "$1" src/main.js index.html version.json
