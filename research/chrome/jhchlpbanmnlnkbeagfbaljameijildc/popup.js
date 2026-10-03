"use strict";

const Rules = globalThis.OpenLinkRules;
const controls = {
  enabled: document.querySelector("#enabled"),
  openInBackground: document.querySelector("#openInBackground"),
  scope: document.querySelector("#scope")
};
const siteRule = document.querySelector("#site-rule");
const siteName = document.querySelector("#site-name");
const siteCard = document.querySelector("#site-card");
const saved = document.querySelector("#saved");
let settings;
let hostname = "";
let saveTimer;

init();

async function init() {
  const [stored, tabs] = await Promise.all([
    chrome.storage.local.get(Rules.DEFAULTS),
    chrome.tabs.query({ active: true, currentWindow: true })
  ]);
  settings = Rules.normalizeSettings(stored);
  for (const [key, element] of Object.entries(controls)) {
    if (element.type === "checkbox") element.checked = settings[key];
    else element.value = settings[key];
    element.addEventListener("change", () => saveSetting(key, element.type === "checkbox" ? element.checked : element.value));
  }

  try {
    const url = new URL(tabs[0]?.url || "");
    if (!/^(https?|file):$/.test(url.protocol) || !url.hostname) throw new Error("restricted");
    hostname = Rules.normalizeHostname(url.hostname);
    siteName.textContent = hostname;
    const exact = settings.siteRules[hostname];
    siteRule.value = exact === true ? "on" : exact === false ? "off" : "inherit";
    siteRule.addEventListener("change", saveSiteRule);
  } catch (_) {
    siteName.textContent = "Unavailable on this page";
    siteRule.disabled = true;
    siteCard.style.opacity = ".65";
  }

  document.querySelector("#options").addEventListener("click", () => chrome.runtime.openOptionsPage());
}

async function saveSetting(key, value) {
  settings[key] = value;
  await chrome.storage.local.set({ [key]: value });
  showSaved();
}

async function saveSiteRule() {
  const next = { ...settings.siteRules };
  if (siteRule.value === "inherit") delete next[hostname];
  else next[hostname] = siteRule.value === "on";
  settings.siteRules = next;
  await chrome.storage.local.set({ siteRules: next });
  showSaved();
}

function showSaved() {
  clearTimeout(saveTimer);
  saved.classList.add("show");
  saveTimer = setTimeout(() => saved.classList.remove("show"), 900);
}
