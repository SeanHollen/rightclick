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
