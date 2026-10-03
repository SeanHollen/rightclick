"use strict";

var pending;
var lastNode;
var skipOver;

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
  var n = e.target || {};

  for(let i = 4; (i >= 0) && n && !n.href; i--) {
    n = n.parentNode;
  }
  if(!n) return;

  if(skipOver === n) {
    skipOver = null;
    return;
  }

  var last = lastNode;
  lastNode = n;
  var good = e.isTrusted && n.href && /^(https?|ftps?|file):/i.test(n.href);

  if(pending) {
    if(n === last) {
      clearTimeout(pending);
      pending = null;
      stopEvent(e);
      browser.runtime.sendMessage({newTab:n.href});

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