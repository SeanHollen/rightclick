'use strict';

// Firefox-specific behaviour. Shared code only talks to `platform`.
const platform = {
  api: browser,

  // The toolbar button.
  action: browser.browserAction,

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

// The excluded-sites list: one host per line, each also covering its
// subdomains. A leading "*." is accepted and ignored.
function siteEntries(list) {
  return list.split('\n')
    .map(line => line.trim().toLowerCase().replace(/^\*\.?/, ''))
    .filter(Boolean);
}

function siteEntryMatches(entry, host) {
  host = host.toLowerCase();
  return host === entry || host.endsWith('.' + entry);
}

function siteListMatches(list, host) {
  return siteEntries(list).some(entry => siteEntryMatches(entry, host));
}
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

// Toolbar button: turn the extension off or on for the site in the tab.
// Turning it on removes every entry covering the site, so a site disabled
// via its parent domain is turned back on too.
async function toggleSite(tab) {
  let host;
  try {
    host = await platform.api.tabs.sendMessage(tab.id, { type: 'get-site' }, { frameId: 0 });
  } catch (e) {
    return; // no content script here (browser pages, add-on stores)
  }
  if (!host) return;
  const { excludedSites } = await platform.api.storage.local.get({ excludedSites: '' });
  const entries = siteEntries(excludedSites);
  const kept = entries.filter(entry => !siteEntryMatches(entry, host));
  const updated = kept.length < entries.length ? kept : [...entries, host.toLowerCase()];
  // Every tab on the site hears about the change and reports its new state.
  await platform.api.storage.local.set({ excludedSites: updated.join('\n') });
}

function showSiteState(tabId, host, excluded) {
  const { action } = platform;
  action.setBadgeText({ tabId, text: excluded ? 'OFF' : '' });
  action.setBadgeBackgroundColor({ tabId, color: '#666' });
  action.setTitle({
    tabId,
    title: excluded ? `Right Click New Tab is off on ${host}. Click to turn it on.`
                    : `Right Click New Tab is on. Click to turn it off for ${host}.`
  });
}

platform.action.onClicked.addListener(tab => { toggleSite(tab).catch(() => {}); });

platform.api.runtime.onMessage.addListener((message, sender) => {
  if (message && message.type === 'site-state' && sender.tab && sender.frameId === 0) {
    showSiteState(sender.tab.id, String(message.host), !!message.excluded);
  }
  return false;
});
