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
