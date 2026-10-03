'use strict';

// Chrome's service worker has a single entry point. Firefox loads both scripts
// through its manifest instead.
if (typeof importScripts === 'function') importScripts('webext.js');

(() => {
    const api = globalThis.extensionApi;
    let pending = Promise.resolve();

    async function openLink(request, sourceId) {
        const settings = await api.storage.sync.get({ 'link-right-click': 'back' });
        // Resolve the source again in case it moved while this request queued.
        const source = await api.tabs.get(sourceId);
        const tabs = await api.tabs.query({ windowId: source.windowId });
        const lastIndex = tabs.reduce((index, tab) =>
            tab.openerTabId === source.id ? Math.max(index, tab.index) : index,
        source.index);

        await api.tabs.create({
            url: request.url,
            active: settings['link-right-click'] === 'fore',
            windowId: source.windowId,
            index: lastIndex + 1,
            openerTabId: source.id
        });
        return true;
    }

    api.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (!request || request.button !== 'right' ||
            !sender.tab || !Number.isInteger(sender.tab.id) ||
            typeof request.url !== 'string') {
            sendResponse(false);
            return false;
        }

        try {
            if (!['http:', 'https:'].includes(new URL(request.url).protocol)) {
                sendResponse(false);
                return false;
            }
        } catch (error) {
            sendResponse(false);
            return false;
        }

        // Serialize read/create operations so rapid clicks cannot choose the
        // same position. Opener relationships live in the browser, not storage,
        // so closing tabs and restarting the worker cannot stale a counter.
        pending = pending.then(() => openLink(request, sender.tab.id))
            .then(sendResponse, error => {
                console.warn('Could not open link:', error.message);
                sendResponse(false);
            });
        return true;
    });
})();
