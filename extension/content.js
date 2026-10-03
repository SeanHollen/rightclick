'use strict';

(() => {
  const DRAG_TOLERANCE_PX = 6;
  const XLINK_NS = 'http://www.w3.org/1999/xlink';

  // Defaults apply until storage answers, so clicks right after page load
  // behave the same as later ones.
  let excluded = false;

  // The right-button press currently in progress (or just finished), if it
  // started on a link we will handle.
  let pending = null;

  function hostMatches(list) {
    const host = location.hostname.toLowerCase();
    return list.split('\n').some(line => {
      const entry = line.trim().toLowerCase().replace(/^\*\.?/, '');
      return entry && (host === entry || host.endsWith('.' + entry));
    });
  }

  function applySettings(settings) {
    excluded = hostMatches(settings.excludedSites || '');
  }

  browser.storage.local.get({ excludedSites: '' }).then(applySettings, () => {});
  browser.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.excludedSites) {
      applySettings({ excludedSites: changes.excludedSites.newValue });
    }
  });

  function isPlainRightButton(event) {
    return event.button === 2 &&
      !(event.altKey || event.ctrlKey || event.shiftKey || event.metaKey);
  }

  function hrefOf(el) {
    const name = el.localName;
    if (name !== 'a' && name !== 'area') return null;
    if (el.hasAttribute('href')) return el.getAttribute('href');
    // SVG 1.1 links
    if (el.hasAttributeNS(XLINK_NS, 'href')) return el.getAttributeNS(XLINK_NS, 'href');
    return null;
  }

  // The <slot> a light-DOM node is rendered into, including slots inside
  // closed shadow roots (openOrClosedShadowRoot is extension-only).
  function slotOf(node) {
    if (node.assignedSlot) return node.assignedSlot;
    const root = node.parentNode && node.parentNode.openOrClosedShadowRoot;
    if (!root) return null;
    for (const slot of root.querySelectorAll('slot')) {
      for (const assigned of slot.assignedNodes()) {
        if (assigned === node) return slot;
      }
    }
    return null;
  }

  // Innermost link containing the event target, walking the flattened tree.
  // originalTarget is Firefox-only and, unlike target/composedPath(), also
  // reaches into closed shadow roots; ShadowRoot.host climbs back out. Slots
  // matter for web components that wrap light-DOM text in a shadow <a>.
  function findLink(event) {
    let node = event.originalTarget || event.target;
    while (node) {
      if (node.nodeType === Node.ELEMENT_NODE && hrefOf(node) !== null) return node;
      node = slotOf(node) || node.parentNode || node.host;
    }
    return null;
  }

  // Only real navigations become tabs. javascript:, mailto:, "#"-only and
  // similar links keep the normal context menu.
  function urlOf(link) {
    const raw = hrefOf(link);
    if (raw === null || raw.trim() === '' || raw.trim() === '#') return null;
    let url;
    try {
      url = new URL(raw.trim(), link.baseURI);
    } catch (e) {
      return null;
    }
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  }

  // Pointer events rather than mouse events: pages that preventDefault()
  // pointerdown (carousels, sliders, drag libraries) suppress mousedown and
  // mouseup entirely, but pointer events and contextmenu still fire.
  function onPointerDown(event) {
    pending = null;
    if (excluded || !event.isTrusted || event.pointerType !== 'mouse' ||
        !isPlainRightButton(event)) return;
    const link = findLink(event);
    if (!link || link.isContentEditable || !urlOf(link)) return;
    pending = { link, x: event.screenX, y: event.screenY, opened: false };
  }

  // On Linux and macOS contextmenu fires right after pointerdown; on Windows
  // it fires after pointerup. `pending` lives until the next press so both
  // orders are covered. Keyboard-invoked menus (button 0) are never touched.
  function onContextMenu(event) {
    if (!pending || event.button !== 2 || event.shiftKey) return;
    event.preventDefault();
    // Keep the page's own custom menus from appearing on top of the new tab.
    event.stopImmediatePropagation();
  }

  function onPointerUp(event) {
    const press = pending;
    if (!press || press.opened || event.pointerType !== 'mouse' || event.button !== 2) return;
    const moved = Math.abs(event.screenX - press.x) > DRAG_TOLERANCE_PX ||
      Math.abs(event.screenY - press.y) > DRAG_TOLERANCE_PX;
    if (moved || !isPlainRightButton(event)) {
      pending = null;
      return;
    }
    // The pointer stayed put, so it is still over the link even if the page
    // captured the pointer. If the page re-rendered the link meanwhile, use
    // whatever link is under the pointer now. The URL is read at release, as
    // a middle-click would, so hrefs rewritten on press are honoured.
    const link = press.link.isConnected ? press.link : findLink(event);
    const url = link && urlOf(link);
    if (!url) {
      pending = null;
      return;
    }
    press.opened = true;
    browser.runtime.sendMessage({ type: 'open-link', url }).catch(() => {
      // The extension was reloaded/updated under this page; the context menu
      // is already suppressed, so still honour the click.
      window.open(url, '_blank', 'noopener');
    });
  }

  // Window capture listeners registered at document_start run before any
  // listener the page can add, so pages cannot swallow these events first.
  function listen() {
    window.addEventListener('pointerdown', onPointerDown, true);
    window.addEventListener('contextmenu', onContextMenu, true);
    window.addEventListener('pointerup', onPointerUp, true);
  }
  listen();

  // document.open() erases every listener on the window, ours included, and
  // replaces the root element. Re-adding is harmless when nothing was lost.
  new MutationObserver(listen).observe(document, { childList: true });
})();
