chrome.storage.local.get(["enableForAll"], function (items) {
  if (items.enableForAll) {
    let links = document.querySelectorAll("a");
    links.forEach((link) => {
      link.setAttribute("target", "_blank");
    });
  }
});
