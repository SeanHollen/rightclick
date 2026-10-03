// Driven from the harnesses via worker.evaluate. Records the URL every new
// tab was created with (before redirects).
self.created = [];
chrome.tabs.onCreated.addListener(tab => self.created.push(tab.pendingUrl || tab.url));
