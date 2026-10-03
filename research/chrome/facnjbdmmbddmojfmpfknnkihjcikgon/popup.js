document.addEventListener("DOMContentLoaded", function () {
  chrome.storage.local.get(["enableForAll"], function (items) {
    const isChecked = items.enableForAll || false;
    document.getElementById("enableForAll").checked = isChecked;
    updateBadge(isChecked);
  });

  document
    .getElementById("enableForAll")
    .addEventListener("click", function () {
      const isChecked = this.checked;
      chrome.storage.local.set({ enableForAll: isChecked }, function () {
        updateBadge(isChecked);
      });
    });
});

function updateBadge(isActive) {
  const color = isActive ? [0, 128, 0, 255] : [128, 128, 128, 255];
  const text = isActive ? "ON" : "OFF";
  chrome.action.setBadgeBackgroundColor({ color });
  chrome.action.setBadgeText({ text });
}
