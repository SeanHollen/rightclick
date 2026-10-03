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
  const { foreground } = await browser.storage.local.get({ foreground: false });
  // No `index`: with openerTabId set, Firefox places the tab itself using the
  // same logic as a middle-click (browser.tabs.insertRelatedAfterCurrent,
  // "after the last tab opened from this one", reset when you switch tabs,
  // tab groups). Computing an index ourselves is what breaks ordering.
  const props = {
    url,
    active: foreground,
    openerTabId: source.id,
    windowId: source.windowId,
    cookieStoreId: source.cookieStoreId
  };
  try {
    return await browser.tabs.create(props);
  } catch (e) {
    // The source tab closed or moved windows between click and here.
    delete props.openerTabId;
    delete props.windowId;
    return browser.tabs.create(props);
  }
}

browser.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== 'open-link' || !sender.tab || !isWebUrl(message.url)) {
    return undefined;
  }
  const job = queue.then(() => openLink(message.url, sender.tab));
  queue = job.catch(() => {});
  return job.then(() => true);
});
