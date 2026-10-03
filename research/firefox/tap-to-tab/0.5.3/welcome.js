document.querySelectorAll("*[i18n]").forEach(n => {
  n.textContent = chrome.i18n.getMessage(n.getAttribute("i18n"));
});

document.title = chrome.i18n.getMessage("thankHeader");