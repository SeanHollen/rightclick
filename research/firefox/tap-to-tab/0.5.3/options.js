"use strict";

!function(doc) {
  let storage = chrome.storage.local;

  let where = doc.querySelectorAll("input[name=where]");
  let next = doc.querySelectorAll("input[name=nextto]");
  let discard = doc.querySelectorAll("input[name=discard]");
  let delay = doc.querySelector("input[name=delay]");
  let clickme = doc.getElementById("clickme");
  let black = doc.querySelector("textarea");

  storage.get(null, o => {
    where[o.openTabFront ? 0 : 1].checked = true;
    next[o.openTabEnd ? 1 : 0].checked = true;
    discard[o.openDiscarded ? 1 : 0].checked = true;
    delay.value = o.delay || 300;
    black.value = o.blacklist || "";
  });
  
  where.forEach(n => {
    n.onchange = () => {
      storage.set({openTabFront: where[0].checked});
    };
  });

  next.forEach(n => {
    n.onchange = () => {
      storage.set({openTabEnd: next[1].checked});
    };
  });

  discard.forEach(n => {
    n.onchange = () => {
      storage.set({openDiscarded: discard[1].checked});
    };
  });

  delay.onchange = () => {
    let n = delay.value*1;
    if(n >= 200 && n <= 1000) {
      storage.set({delay: n});
    } else {
      delay.value = 300;
    }
  };

  black.onchange = () => {
    let arr = black.value.split("\n");
    for(let i = arr.length - 1; i >= 0; i--) {
      if(!arr[i]) {
        arr.splice(i, 1);
      } else {
        let n = arr[i].replace(/\*/g, "");
        if(n.charAt(0) === ".") n = n.substr(1);
        if(n.indexOf(" ") > 0) n = n.substr(0, n.indexOf(" "));
        if(n.indexOf("/") > 0) n = n.substr(0, n.indexOf("/"));
        arr[i] = n;
      }
    }
    arr = arr.join("\n");
    black.value = arr;
    storage.set({blacklist: arr});
  };

  let timer = null;
  clickme.onclick = () => {
    let n1 = clickme.nextElementSibling;
    let n2 = n1.nextElementSibling;
    n1.style.opacity = 0.2;
    n2.style.opacity = 0.2;

    if(timer) {
      clearTimeout(timer);
      timer = null;
      n1.style.opacity = 0.4;
      n2.style.opacity = 1;
    } else {
      timer = setTimeout(() => {
        timer = null;
        n1.style.opacity = 1;
        n2.style.opacity = 0.4;
      }, delay.value*1);   
    }
  };

  doc.querySelectorAll("*[i18n]").forEach(n => {
    n.appendChild(doc.createTextNode(chrome.i18n.getMessage(n.getAttribute("i18n"))));
  });

  doc.querySelector("a").textContent = chrome.i18n.getMessage("suggest_link");
  
  try {
    chrome.tabs.create({
      url: chrome.runtime.getURL("welcome.html"),
      active: false,
      discarded: true
    }, res => {
      if(res && res.id) chrome.tabs.remove(res.id);
    });
    document.querySelector("#discardable").removeAttribute("hidden");
  } catch(e) {}

}(document);