"use strict";

var openTabFront = false;
var openTabEnd = false;
var blacklist = {};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if(msg.newTab) {
    let o = {
      active: openTabFront,
      url: msg.newTab,
      openerTabId: sender.tab.id
    };
    if(!openTabEnd) o.index = sender.tab.index + 1;
    chrome.tabs.create(o);

  } else if(msg.checkDomain) {
    let tld = msg.checkDomain;
    let pos = tld.lastIndexOf(".", tld.lastIndexOf(".") - 1);
    if(blacklist[tld] || (pos >= 0 && blacklist[tld.substr(pos + 1)])) {
      reply({blacklist: true});
    } else {
      reply({});
    }
  }
});

function getOptions() {
  chrome.storage.local.get(null, o => {
    openTabFront = !!o.openTabFront;
    openTabEnd = !!o.openTabEnd;
    blacklist = {};
    (o.blacklist || "").split("\n").forEach(n => {
      blacklist[n] = true;
    });
  });
}

chrome.storage.onChanged.addListener(getOptions);

getOptions();