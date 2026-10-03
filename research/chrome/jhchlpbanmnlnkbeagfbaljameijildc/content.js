(function () {
  "use strict";

  const Rules = globalThis.OpenLinkRules;
  let settings = Rules.normalizeSettings();
  let ready = false;

  chrome.storage.local.get(Rules.DEFAULTS).then((stored) => {
    settings = Rules.normalizeSettings(stored);
  }).catch(() => {}).finally(() => {
    ready = true;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "local") return;
    const next = { ...settings };
    for (const [key, change] of Object.entries(changes)) next[key] = change.newValue;
    settings = Rules.normalizeSettings(next);
  });

  window.addEventListener("click", onClick, true);

  function onClick(event) {
    if (!ready || !event.isTrusted || event.button !== 0 || event.defaultPrevented) return;
    if (settings.respectModifiedClicks && (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return;
    const pageUrl = effectivePageUrl();
    if (!Rules.isEnabledForUrl(pageUrl, settings)) return;

    const link = findLink(event);
    if (!link || isEditable(link)) return;
    if (settings.ignoreDownloads && link.hasAttribute && link.hasAttribute("download")) return;

    const rawHref = readHref(link);
    if (!rawHref) return;
    const result = Rules.evaluateLink(rawHref, pageUrl, settings);
    if (!result.eligible) return;

    event.preventDefault();
    event.stopImmediatePropagation();

    chrome.runtime.sendMessage({
      type: "open-link",
      url: result.url,
      openInBackground: settings.openInBackground,
      position: settings.position
    }).catch(() => {
      // The extension may have been reloaded while this page stayed open.
      location.assign(result.url);
    });
  }

  function findLink(event) {
    const path = typeof event.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      if (node === document || node === window) break;
      if (node && node.nodeType === Node.ELEMENT_NODE && String(node.localName).toLowerCase() === "a") return node;
    }
    const target = event.target && event.target.nodeType === Node.ELEMENT_NODE ? event.target : event.target?.parentElement;
    return target?.closest?.("a[href]") || null;
  }

  function readHref(link) {
    const href = link.href;
    if (typeof href === "string") return href;
    if (href && typeof href.baseVal === "string") return href.baseVal;
    return link.getAttribute?.("href") || "";
  }

  function isEditable(link) {
    return Boolean(link.closest?.("[contenteditable]:not([contenteditable='false'])"));
  }

  function effectivePageUrl() {
    // about:blank/srcdoc frames inherit their document base from the embedding page.
    if (/^(https?|file):/.test(location.href)) return location.href;
    if (/^(https?|file):/.test(document.baseURI)) return document.baseURI;
    return location.href;
  }
})();
