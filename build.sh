#!/bin/sh
# Builds dist/firefox and dist/chrome (plus .zip packages) from src/.
# Each build gets the shared code from src/common with that browser's
# src/platform/<browser>.js prepended, and src/manifest.<browser>.json.
set -e
cd "$(dirname "$0")"
rm -rf dist
for browser in firefox chrome; do
  out="dist/$browser"
  mkdir -p "$out"
  cp src/common/options.html src/common/options.js src/common/icon-*.png "$out/"
  cp "src/platform/$browser.js" "$out/platform.js"
  for script in content background; do
    cat "src/platform/$browser.js" "src/common/$script.js" > "$out/$script.js"
  done
  cp "src/manifest.$browser.json" "$out/manifest.json"
  (cd "$out" && zip -qr "../right-click-new-tab-$browser.zip" .)
  echo "built $out"
done
