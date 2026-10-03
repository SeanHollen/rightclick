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
