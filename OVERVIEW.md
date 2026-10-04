# Right Click New Tab: overview

Right-clicking a link opens it in a new tab, at the position a middle-click would have used. One shared codebase builds a Firefox extension (MV2) and a Chromium extension (MV3: Chrome, Edge, Brave, Opera, Vivaldi).

## Why it exists

Extensions that already do this are unreliable in three ways:

1. **They miss links.** On many sites the right-click falls through to the normal context menu and no tab opens. The causes were the same across extensions:
   - attaching listeners late (`document_idle`) or only when the page changes;
   - listening for `mousedown`/`mouseup`, which never fire when a page calls `preventDefault()` on `pointerdown` (carousels, sliders, drag libraries);
   - listening at a point the page can stop first (`stopPropagation` in a window capture listener);
   - not handling shadow DOM, SVG links, `<area>`, srcdoc iframes or pages that call `document.open()`.
2. **They put tabs in the wrong place.** Several use `index: current + 1`, so clicking links 1, 2, 3 gives tabs in the order 3, 2, 1. Others ignore what the browser does after you switch tabs, close a child tab or middle-click between right-clicks. Most open into the wrong window when another window has focus.
3. **They fire on things that aren't links.** Some open a tab for `href="#"`, images or canvases, or for a link that sits under the element you clicked. Some open two tabs for nested links, or open a tab after a right-button drag.

Extensions of this kind have also been reported as malware. A personal, unlisted build doesn't depend on anyone else's store listing or update channel.

## How it works

- **Content script** (`src/common/content.js`), injected at `document_start` into every frame, including `about:blank` and srcdoc frames:
  - Window capture listeners for `pointerdown`, `contextmenu` and `pointerup`. They are registered before any page script, so the page can't block them. Pointer events still fire when the page cancels mouse events.
  - On press, it finds the link under the cursor by walking the flattened tree: into open and closed shadow roots, through slots, and out via `ShadowRoot.host`. Only `<a href>`, `<area href>` and SVG `href`/`xlink:href` links with an `http(s)` URL count.
  - It cancels `contextmenu` only for those links. This works whether the menu event fires on press (Linux, macOS) or on release (Windows).
  - On release, it opens the tab unless the pointer moved more than 6 px in any direction or a modifier key is held. The URL is read at release, as a middle-click would, so links whose href is rewritten on press are honoured. If the page removed the link meanwhile, the URL from the press is used.
  - A `MutationObserver` on `document` re-adds the listeners after `document.open()` wipes them.
- **Background** (`src/common/background.js`) creates tabs one at a time, in click order.
- **Per-browser code** (`src/platform/*.js`) is kept behind a small `platform` object:

| | Firefox | Chromium |
|---|---|---|
| Tab position | `openerTabId` and no index; Firefox applies its own middle-click rule | `tabs.create` appends to the end, so the extension computes Chrome's rule: after the contiguous run of tabs opened from the source, else right after the source |
| Tab groups | native | new tab added to the source tab's group |
| Closed shadow roots | `event.originalTarget`, `openOrClosedShadowRoot` | `chrome.dom.openOrClosedShadowRoot` (HTML elements only) |
| Containers | `cookieStoreId` passed through | n/a |
| Toolbar button | `browserAction` | `action` |

## What it deliberately doesn't do

- **No tab for anything without a URL:** `<button>`, `role="link"`, `href="#"`, `javascript:`/`mailto:`/`data:` links, images, canvases, or links inside editable areas. These keep their normal right-click behaviour.
- **No telemetry, remote configuration or network requests.** Permissions are `storage` (Firefox also needs `cookies`, for containers). There are no host permissions beyond the content script match.
- **No work outside the right button.** Other clicks return at the first check, and nothing scans or tags links on the page.

Holding Shift, Ctrl, Alt or Meta while right-clicking, or using the keyboard menu key, shows the normal context menu. The toolbar button turns the extension off or on for the current site.

## Results

Every scenario is also run with a native middle-click and no extension. That run is the reference for correct tab order.

**69 synthetic edge cases and tab-order scenarios** (`test/cases.py`). The pages cover the constructions above: shadow DOM, frames, page scripts that swallow events, SVG/area links, drags, holds and false-positive traps.

| Extension | Firefox: edge cases / 69 | Firefox: order / 11 | Chrome: edge cases / 69 | Chrome: order / 13 |
|---|---|---|---|---|
| **This extension** | **69** | **11** | **69** | **13** |
| Right Click Opens Link New Tab 0.1.1 (Chrome) | 50 | 8 | 50 | 10 |
| Right Links WE 0.5b12 | 44 | 10 | n/a | n/a |
| Right Click Opens Link in a Background Tab 1.5 | 42 | 8 | 41 | 5 |
| Right Click Opens Link New Tab Correct Order 0.0.9 | 40 | 8 | n/a | n/a |
| Right Click Opens Link New Tab 0.0.7 (Firefox) | 28 | 2 | n/a | n/a |
| Open Link on Right Click 1.0 | n/a | n/a | 16 | 0 |

Chrome-only extensions were ported to Firefox MV2 to run the Firefox suite.

**Real sites:** about 35 sites (news, search, shopping, forums, docs, social), picking real links before and after scrolling.
- Firefox: 246/246 correct.
- Chrome: 243/243 correct.

"Correct" means exactly one new tab, with the link's URL, no context menu, and the source page unchanged. Seven Bing results open a slightly different URL. That matches Bing's native middle-click, which strips a tracking parameter.

**Page cost:** on a page with 3,000 links and 300 consecutive DOM changes, the measured time was 1222–1229 ms, against 1235 ms with no extension. The two extensions that rescan the page on every change took about 3600 ms.

## Known limitations

- **It can't run where browsers block extensions:** the PDF viewer, Reader View, `about:`/`chrome://` pages, and the add-on stores.
- **Opened tabs carry no referrer.** Tab-creation APIs can't set one.
- **It can't hide the menu if `dom.event.contextmenu.enabled` is false.** That Firefox setting stops pages and extensions from suppressing the context menu, so the menu still appears.
- **Pseudo-links have no URL.** Buttons and `div`s that navigate through JavaScript keep the normal right-click.
- **Firefox needs a signed build to install permanently.** The plan is unlisted signing on addons.mozilla.org.

See `README.md` for build, install and test commands.
