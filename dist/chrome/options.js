'use strict';

const foreground = document.getElementById('foreground');
const excludedSites = document.getElementById('excludedSites');

platform.api.storage.local.get({ foreground: false, excludedSites: '' }).then(settings => {
  foreground.checked = settings.foreground;
  excludedSites.value = settings.excludedSites;
});

foreground.addEventListener('change', () => {
  platform.api.storage.local.set({ foreground: foreground.checked });
});
excludedSites.addEventListener('input', () => {
  platform.api.storage.local.set({ excludedSites: excludedSites.value });
});
