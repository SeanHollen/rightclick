'use strict';

(() => {
    const api = globalThis.extensionApi;
    let settings = {};
    let loaded = false;
    let enabled = false;
    let mouseDown = null;
    const changesDuringLoad = {};

    function updateDomain() {
        const hasDomainList = typeof settings['domain-list'] === 'string';
        const list = hasDomainList ? settings['domain-list'] : settings['blacklisted-domains'];
        const usingLegacy = !hasDomainList && typeof settings['blacklisted-domains'] === 'string';
        const mode = usingLegacy ? 'blacklist' : settings['list-mode'];
        const hostname = window.location.hostname.toLowerCase();
        const matches = (typeof list === 'string' ? list : '').split('\n').some(entry => {
            const pattern = entry.trim().toLowerCase();
            if (!pattern) return false;
            if (pattern === '*') return true;
            if (pattern.startsWith('*')) {
                const suffix = pattern.slice(1).replace(/^\./, '');
                return !!suffix && (hostname === suffix || hostname.endsWith('.' + suffix));
            }
            return hostname === pattern;
        });
        enabled = loaded && (mode === 'whitelist' ? matches : !matches);
        mouseDown = null;
    }

    api.storage.onChanged.addListener((changes, area) => {
        if (area !== 'sync') return;
        for (const [key, change] of Object.entries(changes)) {
            settings[key] = change.newValue;
            if (!loaded) changesDuringLoad[key] = change.newValue;
        }
        updateDomain();
    });

    api.storage.sync.get(null).then(values => {
        settings = { ...values, ...changesDuringLoad };
        loaded = true;
        updateDomain();
    }).catch(error => console.warn('Could not load link settings:', error.message));

    function modified(event) {
        return event.altKey || event.shiftKey || event.ctrlKey || event.metaKey;
    }

    function findLink(event) {
        const anchor = event.composedPath().find(node =>
            node instanceof Element && node.matches('a[href]'));
        if (!anchor) return null;
        try {
            const url = new URL(anchor.getAttribute('href'), document.baseURI);
            // Leave scripts and external application links to the browser.
            return ['http:', 'https:'].includes(url.protocol) ? { anchor, url: url.href } : null;
        } catch (error) {
            return null;
        }
    }

    // Delegation covers existing links, dynamic content and open shadow roots
    // without observing mutations or attaching listeners to individual links.
    document.addEventListener('mousedown', event => {
        mouseDown = null;
        if (!enabled || event.button !== 2 || modified(event)) return;
        const link = findLink(event);
        if (link) mouseDown = { anchor: link.anchor, x: event.screenX, y: event.screenY };
    }, true);

    document.addEventListener('mouseup', event => {
        const start = mouseDown;
        mouseDown = null;
        if (!enabled || !start || event.button !== 2 || modified(event)) return;
        if (Math.abs(event.screenX - start.x) >= 5 || Math.abs(event.screenY - start.y) >= 5) return;
        const link = findLink(event);
        if (!link || link.anchor !== start.anchor) return;

        event.preventDefault();
        api.runtime.sendMessage({ button: 'right', url: link.url }).then(opened => {
            if (!opened) console.warn('Could not open link.');
        }).catch(error => console.warn('Could not open link:', error.message));
    }, true);

    document.addEventListener('contextmenu', event => {
        if (enabled && event.button === 2 && !modified(event) && findLink(event)) {
            event.preventDefault();
        }
    }, true);

    document.addEventListener('click', event => {
        if (!enabled || !settings['link-left-click-prevent-new-tab'] ||
            event.button !== 0 || modified(event) || event.defaultPrevented) return;
        const link = findLink(event);
        if (!link || link.anchor.hasAttribute('download')) return;

        // Set the target just for this click, preserving native navigation and
        // page click handlers. _self also overrides a <base target="_blank">.
        const target = link.anchor.getAttribute('target');
        link.anchor.setAttribute('target', '_self');
        setTimeout(() => {
            if (link.anchor.getAttribute('target') !== '_self') return;
            if (target === null) link.anchor.removeAttribute('target');
            else link.anchor.setAttribute('target', target);
        }, 0);
    }, true);
})();
