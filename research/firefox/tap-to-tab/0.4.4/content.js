"use strict";

let pending;
let lastNode;
let skipOver;  //prevent triple clicks
let blacklist = false;

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

  let n = e.target || {};

  for(let i = 4; (i >= 0) && n && !n.href; i--) {
    n = n.parentNode;
  }
  if(!n) return;

  if(skipOver === n) {  //prevent triple clicks
    skipOver = null;
    return;
  }

  let last = lastNode;
  lastNode = n;
  let good = e.isTrusted
    && n.href
    && /^(https?|ftps?|file):/i.test(n.href)
    && (n.getAttribute("href") !== "#")
    && (!n.hasAttribute("target") || n.getAttribute("target") !== "_self");

  if(pending) {
    if(n === last) {
      clearTimeout(pending);
      pending = null;
      chrome.runtime.sendMessage({newTab: n.href});
      stopEvent(e);

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