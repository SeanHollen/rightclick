'use strict';

// Chromium-specific behaviour (Chrome, Edge, Brave, Opera, Vivaldi). Shared
// code only talks to `platform`.
const platform = {
  api: chrome,

  // Deepest node in open shadow roots; closed ones are retargeted to their
  // host and are looked into by the shared code via shadowRootOf().
  eventOrigin(event) {
    return event.composedPath()[0] || event.target;
  },

  // Extension-only accessor that also returns closed shadow roots. Only HTML
  // elements can host one, and the API throws for anything else (e.g. SVG).
  shadowRootOf(element) {
    if (!(element instanceof HTMLElement)) return null;
    try {
      return chrome.dom.openOrClosedShadowRoot(element) || null;
    } catch (e) {
      return null;
    }
  },

  // chrome.tabs.create ignores openerTabId when positioning and appends to the
  // end of the window, so reproduce Chrome's middle-click rule: after the run
  // of tabs opened from the source that directly follows it (stopping at the
  // first tab that isn't one), else right after the source.
  async newTabProps(source) {
    const tabs = (await chrome.tabs.query({ windowId: source.windowId })).sort((a, b) => a.index - b.index);
    const current = tabs.find(tab => tab.id === source.id) || source;
    let index = current.index;
    while (index + 1 < tabs.length && tabs[index + 1].openerTabId === source.id) index++;
    return { index: index + 1 };
  },

  // A middle-clicked tab joins the source tab's group; created tabs do not.
  async afterCreate(tab, source) {
    const current = await chrome.tabs.get(source.id);
    if (current.groupId !== -1 && tab.groupId !== current.groupId) {
      await chrome.tabs.group({ groupId: current.groupId, tabIds: [tab.id] });
    }
  }
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
