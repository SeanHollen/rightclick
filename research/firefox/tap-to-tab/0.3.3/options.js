function addTxt(n, txt) {
  n.parentNode.appendChild(document.createTextNode(txt));
}

!function(doc) {
  let list = doc.querySelectorAll("input[type=radio]");

  chrome.storage.local.get(null, function(o) {
    list[o.openTabFront ? 0 : 1].checked = true;
  });

  list[0].onchange = list[1].onchange = function() {
    chrome.storage.local.set({openTabFront: list[0].checked});
  };

  addTxt(list[0], chrome.i18n.getMessage("open_tab_front"));
  addTxt(list[1], chrome.i18n.getMessage("open_tab_background"));

  doc.querySelector("a").textContent = chrome.i18n.getMessage("suggest_link");
}(document);