"use strict";

!function(doc) {
  let storage = chrome.storage.local;

  let where = doc.querySelectorAll("input[name=where]");
  let next = doc.querySelectorAll("input[name=nextto]");
  let black = doc.querySelector("textarea");

  storage.get(null, o => {
    where[o.openTabFront ? 0 : 1].checked = true;
    next[o.openTabEnd ? 1 : 0].checked = true;
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

  doc.querySelectorAll("*[i18n]").forEach(n => {
    n.appendChild(doc.createTextNode(chrome.i18n.getMessage(n.getAttribute("i18n"))));
  });

  doc.querySelector("a").textContent = chrome.i18n.getMessage("suggest_link");
}(document);