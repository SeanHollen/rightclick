browser.runtime.onMessage.addListener((msg, sender) => {
  if(msg.newTab) {
    browser.tabs.create({
      active: false,
      url: msg.newTab,
      index: sender.tab.index + 1
      //,openerTabId: sender.tab.id
    });
  }
});