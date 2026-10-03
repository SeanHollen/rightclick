"use strict";

let pending;
let lastNode;
let skipOver;
let blacklist = false;
let delay = 300;

window.addEventListener("beforeunload", () => {
  if(pending) {
    clearTimeout(pending);
    pending = null;
  }
}, false);

function scheduleClick(e) {
  let n = e.target;
  let props = {
    clientX: e.clientX, clientY: e.clientY,
    screenX: e.screenX, screenY: e.screenY,
    view: e.view, bubbles: true, cancelable: true
  };
  pending = setTimeout(() => {
    pending = null;
    skipOver = n;
    n.dispatchEvent(new MouseEvent("click", props));
  }, delay);
}

function stopEvent(e) {
  e.preventDefault();
  e.stopPropagation();
}

window.addEventListener("click", e => {
  if(blacklist) return;
  if(e.ctrlKey || e.shiftKey || e.metaKey || e.altKey || e.button !== 0) return;

  let n = e.target;

  if(n && skipOver === n) {  //skip over our own dispatch
    skipOver = null;
    return;
  }

  for(let i = 4; (i >= 0) && n && !n.href; i--) {
    n = n.parentNode;
  }
  if(!n) return;

  let last = lastNode;
  lastNode = n;
  let good = e.isTrusted
    && n.href
    && /^(https?|ftps?|file):/i.test(n.href)
    && (n.getAttribute("href") !== "#");
    //&& (n.getAttribute("target") !== "_self");

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
      scheduleClick(e);
      stopEvent(e);
    }

  } else if(good) {
    scheduleClick(e);
    stopEvent(e);
  }
}, true);

chrome.runtime.sendMessage({checkDomain: location.hostname}, {}, res => {
  if(res) {
    if(res.blacklist) blacklist = true;
    if(res.delay) delay = res.delay;
  }
});