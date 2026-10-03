'use strict';

// Firefox-specific behaviour. Shared code only talks to `platform`.
const platform = {
  api: browser,

  // originalTarget is the node actually under the pointer, even inside closed
  // shadow roots, where event.target is retargeted to the host.
  eventOrigin(event) {
    return event.originalTarget || event.target;
  },

  // Extension-only accessor that also returns closed shadow roots.
  shadowRootOf(element) {
    return element.openOrClosedShadowRoot || null;
  },

  // No index: with openerTabId set, Firefox positions the tab itself exactly
  // like a middle-click (browser.tabs.insertRelatedAfterCurrent, "after the
  // last tab opened from this one", reset when you switch tabs, tab groups).
  // cookieStoreId keeps the tab in the source's container / private window.
  async newTabProps(source) {
    return { cookieStoreId: source.cookieStoreId };
  },

  async afterCreate() {}
};
'use strict';

// Tabs are created one at a time, in the order the clicks arrived.
let queue = Promise.resolve();

function isWebUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch (e) {
    return false;
  }
}

async function openLink(url, source) {
  const { foreground } = await platform.api.storage.local.get({ foreground: false });
  // Where the tab goes is browser-specific; the goal is always the exact spot
  // a middle-click on the same link would have used.
  const props = {
    url,
    active: foreground,
    openerTabId: source.id,
    windowId: source.windowId,
    ...await platform.newTabProps(source)
  };
  let tab;
  try {
    tab = await platform.api.tabs.create(props);
  } catch (e) {
    // The source tab closed or moved windows between click and here.
    delete props.openerTabId;
    delete props.windowId;
    delete props.index;
    return platform.api.tabs.create(props);
  }
  await platform.afterCreate(tab, source).catch(() => {});
  return tab;
}

// sendResponse rather than a returned promise: older Chromium versions do not
// support promise-returning onMessage listeners.
platform.api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'open-link' || !sender.tab || !isWebUrl(message.url)) {
    return false;
  }
  const job = queue.then(() => openLink(message.url, sender.tab));
  queue = job.catch(() => {});
  job.then(() => sendResponse(true), () => sendResponse(false));
  return true;
});
