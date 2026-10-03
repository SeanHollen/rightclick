"use strict";

let openTabFront = false;
let openTabEnd = false;
let openDiscarded = false;
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
    if(openDiscarded && !openTabFront) o.discarded = true;
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

chrome.runtime.onInstalled.addListener(({reason}) => {
  if(reason === "install") {  //move the user away from the AMO page
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html")
    });
  }
});

function setOptions(o) {
  openTabFront = !!o.openTabFront;
  openTabEnd = !!o.openTabEnd;
  openDiscarded = !!o.openDiscarded;
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