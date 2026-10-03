
# Open Link on Right Click

A Chrome extension that allows users to open links in a new tab when right-clicking on them. The new tab is positioned immediately to the right of the active tab. This extension avoids conflicts with mouse gesture extensions like crxMouse by ignoring actions when the right mouse button is dragged.

## Features

- Open links in a new tab on right-click.
- Automatically positions the new tab to the right of the active tab.
- Ignores mouse gestures by detecting mouse dragging.
- Compatible with most modern Chrome browsers.

## Installation

1. Clone or download this repository:
   ```bash
   git clone https://github.com/verlane/open-link-on-right-click.git
   ```
2. Go to `chrome://extensions` in your Chrome browser.
3. Enable **Developer mode**.
4. Click **Load unpacked** and select the project folder.

## Usage

1. Right-click on any link to open it in a new tab.
2. The new tab will appear directly to the right of the active tab.
3. If the right mouse button is dragged, the extension will ignore the action to avoid conflicts with mouse gesture extensions.

## Development

Feel free to contribute or customize this extension. To make changes:

1. Modify the relevant files (`content.js`, `background.js`, or `manifest.json`).
2. Reload the extension in Chrome by visiting `chrome://extensions` and refreshing the extension.


---

Enjoy using the **Open Link on Right Click** extension! Contributions and feedback are welcome.
