# Right Click New Tab

Right-clicking a link opens it in a new tab, placed exactly where a middle-click
would have put it. Works in Firefox and Chromium browsers (Chrome, Edge, Brave,
Opera, Vivaldi).

- Shift+right-click (Firefox) or the keyboard menu key still gives the normal menu.
- Only real links (`<a href>`, `<area href>`, SVG links) with an http(s) URL are
  handled. Buttons, `href="#"`, `javascript:` links, images and links in
  editable areas keep their normal right-click behaviour.
- Options: open in foreground instead of background; sites to disable it on.

## Layout

```
src/common/          shared code (content script, background, options page)
src/platform/        per-browser dispatchers: firefox.js, chrome.js
src/manifest.*.json  per-browser manifests (Firefox MV2, Chrome MV3)
build.sh             builds dist/firefox, dist/chrome and their .zip packages
test/                synthetic edge-case suites + real-site runs
research/            downloaded competitor extensions (all versions)
```

Browser differences live only in `src/platform/*.js`:

| | Firefox | Chromium |
|---|---|---|
| Tab placement | left to Firefox (`openerTabId`, no index) | emulates Chrome's middle-click rule (`tabs.create` would append to the end) |
| Tab groups | native | new tab joined to the source's group |
| Closed shadow roots | `event.originalTarget`, `openOrClosedShadowRoot` | `chrome.dom.openOrClosedShadowRoot` |
| Containers | `cookieStoreId` passed through | n/a |

## Build

```sh
./build.sh
```

## Install

- **Firefox, permanent:** release Firefox needs a signed package. Sign
  `dist/right-click-new-tab-firefox.zip` as an *unlisted* add-on on
  addons.mozilla.org (`npx web-ext sign --channel=unlisted --source-dir dist/firefox
  --api-key ... --api-secret ...`), then open the resulting .xpi in Firefox.
- **Firefox, temporary:** `about:debugging` → This Firefox → Load Temporary Add-on →
  `dist/firefox/manifest.json` (removed when Firefox restarts).
- **Chrome / Edge / Brave:** `chrome://extensions` → Developer mode → Load unpacked →
  `dist/chrome`.

## Tests

```sh
cd test && python3 server.py &                     # local test pages on :8765
python suite2.py mine                              # Firefox (Selenium); also: oracle, competitor names
(cd chrome && node suite.mjs mine)                 # Chrome (Puppeteer)
python3 report2.py results mine ...                # Firefox report
python3 report2.py chrome/results mine ...         # Chrome report
(cd realsites && node run-chrome.mjs)              # real websites, Chrome (Playwright)
(cd realsites && python run-firefox.py)            # real websites, Firefox (Selenium)
```

After editing `test/cases.py`, re-export for Chrome:
`python3 -c "import json, cases; json.dump(cases.CASES, open('chrome/cases.json', 'w'))"` (from `test/`).

`oracle` runs the same scenarios with a native middle-click and no extension; tab
order is judged against it. Edge cases are defined once in `test/cases.py`
(exported to `test/chrome/cases.json` for the Chrome suite).
