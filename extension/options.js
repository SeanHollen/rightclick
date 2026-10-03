'use strict';

const foreground = document.getElementById('foreground');
const excludedSites = document.getElementById('excludedSites');

browser.storage.local.get({ foreground: false, excludedSites: '' }).then(settings => {
  foreground.checked = settings.foreground;
  excludedSites.value = settings.excludedSites;
});

foreground.addEventListener('change', () => {
  browser.storage.local.set({ foreground: foreground.checked });
});
excludedSites.addEventListener('input', () => {
  browser.storage.local.set({ excludedSites: excludedSites.value });
});
