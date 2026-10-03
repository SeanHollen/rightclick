'use strict';

// Firefox provides promises; wrap callbacks to also support Chrome 88+.
globalThis.extensionApi = (() => {
    if (typeof browser !== 'undefined') return browser;

    function wrap(owner, name) {
        return (...args) => new Promise((resolve, reject) => {
            owner[name](...args, result => {
                const error = chrome.runtime.lastError;
                if (error) reject(new Error(error.message));
                else resolve(result);
            });
        });
    }

    return {
        runtime: {
            onMessage: chrome.runtime.onMessage,
            sendMessage: wrap(chrome.runtime, 'sendMessage')
        },
        storage: {
            onChanged: chrome.storage.onChanged,
            sync: {
                get: wrap(chrome.storage.sync, 'get'),
                set: wrap(chrome.storage.sync, 'set'),
                remove: wrap(chrome.storage.sync, 'remove')
            }
        },
        tabs: chrome.tabs && {
            get: wrap(chrome.tabs, 'get'),
            query: wrap(chrome.tabs, 'query'),
            create: wrap(chrome.tabs, 'create')
        }
    };
})();
