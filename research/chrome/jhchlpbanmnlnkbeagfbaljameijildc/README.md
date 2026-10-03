# Open link in new tab

A small, privacy-friendly Chrome/Chromium extension that opens ordinary web links in a new tab. It is enabled by default, keeps its state after browser restarts, and supports dynamic pages without rewriting the DOM.

## Why this version is more reliable

- Captures real link clicks at the document level, so links added later by React/Vue/other SPA frameworks work too.
- Uses the event's composed path, which covers links inside open Shadow DOM.
- Creates tabs through the Manifest V3 service worker instead of relying on popup-prone `window.open()` calls.
- Stores every setting in `chrome.storage.local`; updates never overwrite existing preferences.
- Has exact-domain and wildcard per-site overrides.
- Leaves downloads, same-page anchors, non-web protocols, and modified clicks alone by default.
- Clearly documents browser-enforced limitations instead of promising access Chrome does not provide.

No browsing data is collected or transmitted. There are no analytics, remote scripts, accounts, or network services.

## Install locally

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this directory.
4. Pin **Open link in new tab** if you want quick per-site controls.

The default shortcut is `Alt+Shift+O`. It can be changed at `chrome://extensions/shortcuts`.

## Browser limitations

Chrome does not let extensions inject into browser UI, `chrome://` pages, the Chrome Web Store, or bookmark clicks. A site control implemented only in JavaScript, with no real link URL, may not be discoverable before it runs. These restrictions cannot be bypassed safely by a normal Web Store extension.

## Development

Requires Node.js 18 or newer; there are no package dependencies.

```sh
npm test
npm run check
```

## Privacy

The extension reads link destinations only when you click them, solely to open the requested tab. Settings remain in local Chrome storage. Nothing is sent to the developer or any third party.

## License

MIT
