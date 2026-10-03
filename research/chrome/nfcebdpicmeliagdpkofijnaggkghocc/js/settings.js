'use strict';

(() => {
    const storage = globalThis.extensionApi.storage.sync;
    const defaults = {
        'link-right-click': 'back',
        'link-left-click-prevent-new-tab': false,
        'list-mode': 'blacklist',
        'domain-list': ''
    };

    function updateModeLabels(mode) {
        // Keep the saved mode values compatible with existing installations.
        const allowList = mode === 'whitelist';
        document.getElementById('domain-list-label').textContent =
            allowList ? 'Allowed domains:' : 'Denied domains:';
        document.getElementById('domain-list-help').textContent =
            (allowList ? 'Extension will ONLY work on these domains.' :
                'Extension will NOT work on these domains.') +
            ' Enter one domain per line. *.example.com matches example.com and its subdomains.';
    }

    function reportError(error) {
        document.getElementById('settings-status').textContent =
            'Could not save or load settings. Please try again.';
        console.warn('Settings error:', error.message);
    }

    function save(values) {
        storage.set(values).then(() => {
            document.getElementById('settings-status').textContent = '';
        }).catch(reportError);
    }

    document.addEventListener('DOMContentLoaded', async () => {
        const controls = document.querySelectorAll('.settings input, .settings select, .settings textarea');
        controls.forEach(control => { control.disabled = true; });
        try {
            const stored = await storage.get(null);
            // An explicitly empty new list is intentional, not an invitation
            // to resurrect the legacy blacklist.
            if (!Object.prototype.hasOwnProperty.call(stored, 'domain-list') &&
                typeof stored['blacklisted-domains'] === 'string') {
                stored['domain-list'] = stored['blacklisted-domains'];
                stored['list-mode'] = 'blacklist';
                await storage.set({
                    'domain-list': stored['domain-list'],
                    'list-mode': stored['list-mode']
                });
            }
            if (Object.prototype.hasOwnProperty.call(stored, 'blacklisted-domains')) {
                await storage.remove('blacklisted-domains');
            }
            const settings = { ...defaults, ...stored };
            document.getElementById('link-right-click').value = settings['link-right-click'];
            document.getElementById('link-left-click-prevent-new-tab').checked =
                settings['link-left-click-prevent-new-tab'];
            const mode = settings['list-mode'] === 'whitelist' ? 'whitelist' : 'blacklist';
            document.getElementById('mode-' + mode).checked = true;
            document.getElementById('domain-list').value = settings['domain-list'];
            updateModeLabels(mode);

            document.getElementById('link-right-click').addEventListener('change', event => {
                save({ 'link-right-click': event.target.value });
            });
            document.getElementById('link-left-click-prevent-new-tab').addEventListener('change', event => {
                save({ 'link-left-click-prevent-new-tab': event.target.checked });
            });
            document.querySelectorAll('input[name="list-mode"]').forEach(radio => {
                radio.addEventListener('change', event => {
                    if (!event.target.checked) return;
                    updateModeLabels(event.target.value);
                    save({ 'list-mode': event.target.value });
                });
            });
            document.getElementById('domain-list').addEventListener('change', event => {
                save({ 'domain-list': event.target.value.trim() });
            });
            controls.forEach(control => { control.disabled = false; });
        } catch (error) {
            reportError(error);
        }
    }, { once: true });
})();
