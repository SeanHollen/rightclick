var openTabFront = false;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if(msg.newTab) {
    chrome.tabs.create({
      active: openTabFront,
      url: msg.newTab,
      index: sender.tab.index + 1
      ,openerTabId: sender.tab.id
    });
  }
});

function getOptions() {
  chrome.storage.local.get(null, o => {
    openTabFront = !!o.openTabFront;
  });
}

chrome.storage.onChanged.addListener(getOptions);

getOptions();