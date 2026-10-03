"use strict";

let openTabFront = false;
let openTabEnd = false;
let blacklist = {};

chrome.runtime.onMessage.addListener((msg, sender, reply) => {
  if(sender.id !== chrome.runtime.id) return;

  if(msg.newTab) {
    let o = {
      active: openTabFront,
      url: msg.newTab,
      openerTabId: sender.tab.id
    };
    if(!openTabEnd) o.index = sender.tab.index + 1;
    chrome.tabs.create(o);

  } else if(msg.checkDomain) {
    let dom = msg.checkDomain;

    if(blacklist[dom]) {
      reply({blacklist: true});
    } else {
      let pos = dom.lastIndexOf(".", dom.lastIndexOf(".") - 1);

      if(pos >= 0 && blacklist[ dom.substr(pos + 1) ]) {
        reply({blacklist: true});
      } else {
        reply({});
      }
    }
  }
});

function setOptions(o) {
  openTabFront = !!o.openTabFront;
  openTabEnd = !!o.openTabEnd;
  if(o.blacklist) {
    blacklist = {};
    o.blacklist.split("\n").forEach(n => {
      blacklist[n] = true;
    });
  }
}

chrome.storage.onChanged.addListener(() => {
  chrome.storage.local.get(null, setOptions);
});

chrome.storage.local.get(null, setOptions);