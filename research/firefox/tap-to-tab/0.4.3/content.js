"use strict";

var pending;
var lastNode;
var skipOver;  //prevent triple clicks
var blacklist = false;

window.addEventListener("beforeunload", () => {
  if(pending) {
    clearTimeout(pending);
    pending = null;
  }
}, false);

function scheduleClick(n) {
  pending = setTimeout(() => {
    pending = null;
    skipOver = n;
    n.click();
  }, 300);
}

function stopEvent(e) {
  e.preventDefault();
  e.stopPropagation();
}

window.addEventListener("click", e => {
  if(blacklist) return;
  if(e.ctrlKey || e.shiftKey || e.metaKey || e.altKey || e.button !== 0) return;

  var n = e.target || {};

  for(let i = 4; (i >= 0) && n && !n.href; i--) {
    n = n.parentNode;
  }
  if(!n) return;

  if(skipOver === n) {  //prevent triple clicks
    skipOver = null;
    return;
  }

  var last = lastNode;
  lastNode = n;
  var good = e.isTrusted && n.href && /^(https?|ftps?|file):/i.test(n.href) && (n.getAttribute("href") !== "#");

  if(pending) {
    if(n === last) {
      clearTimeout(pending);
      pending = null;
      stopEvent(e);
      chrome.runtime.sendMessage({newTab: n.href});

      if(n.style.animationName === "bang") {
        n.style.animation = "bong 1.3s ease-in";
      } else {
        n.style.animation = "bang 1.3s ease-in";
      }

    } else if(good) {
      clearTimeout(pending);
      scheduleClick(n);
      stopEvent(e);
    }

  } else if(good) {
    scheduleClick(n);
    stopEvent(e);
  }
}, true);

chrome.runtime.sendMessage({checkDomain: location.hostname}, {}, res => {
  if(res && res.blacklist) blacklist = true;
});