// Listen for messages from the content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "openTab" && message.url) {
    // Get the currently active tab
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0];
      if (activeTab) {
        chrome.tabs.create({
          url: message.url,
          active: true,
          index: activeTab.index + 1 // Open the new tab to the right of the active tab
        });
      } else {
        // Fallback: open tab at the end if no active tab is found
        chrome.tabs.create({
          url: message.url,
          active: true
        });
      }
    });
  }
});
