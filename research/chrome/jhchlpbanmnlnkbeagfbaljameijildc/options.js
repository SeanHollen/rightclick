"use strict";

const Rules = globalThis.OpenLinkRules;
const keys = ["enabled", "openInBackground", "position", "scope", "ignoreHashLinks", "ignoreDownloads", "respectModifiedClicks"];
let settings;

init();

async function init() {
  settings = Rules.normalizeSettings(await chrome.storage.local.get(Rules.DEFAULTS));
  for (const key of keys) {
    const element = document.getElementById(key);
    if (element.type === "checkbox") element.checked = settings[key];
    else element.value = settings[key];
    element.addEventListener("change", async () => {
      const value = element.type === "checkbox" ? element.checked : element.value;
      settings[key] = value;
      await chrome.storage.local.set({ [key]: value });
    });
  }
  renderRules();
  document.querySelector("#add-rule").addEventListener("submit", addRule);
  document.querySelector("#export").addEventListener("click", exportSettings);
  document.querySelector("#import").addEventListener("click", () => document.querySelector("#import-file").click());
  document.querySelector("#import-file").addEventListener("change", importSettings);
  document.querySelector("#reset").addEventListener("click", resetSettings);
}

function renderRules() {
  const body = document.querySelector("#rules-body");
  body.replaceChildren();
  const entries = Object.entries(settings.siteRules).sort(([a], [b]) => a.localeCompare(b));
  if (!entries.length) {
    const row = body.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.className = "hint";
    cell.textContent = "No site-specific rules yet.";
    return;
  }
  for (const [pattern, enabled] of entries) {
    const row = body.insertRow();
    row.insertCell().textContent = pattern;
    row.insertCell().textContent = enabled ? "Always on" : "Always off";
    const action = row.insertCell();
    const button = document.createElement("button");
    button.className = "icon-button";
    button.type = "button";
    button.textContent = "Remove";
    button.setAttribute("aria-label", `Remove ${pattern}`);
    button.addEventListener("click", () => removeRule(pattern));
    action.append(button);
  }
}

async function addRule(event) {
  event.preventDefault();
  const input = document.querySelector("#rule-pattern");
  const error = document.querySelector("#rule-error");
  const pattern = Rules.normalizePattern(input.value);
  if (!pattern) {
    error.textContent = "Enter a valid domain, for example example.com or *.example.com.";
    return;
  }
  error.textContent = "";
  settings.siteRules = { ...settings.siteRules, [pattern]: document.querySelector("#rule-value").value === "on" };
  await chrome.storage.local.set({ siteRules: settings.siteRules });
  input.value = "";
  renderRules();
}

async function removeRule(pattern) {
  const next = { ...settings.siteRules };
  delete next[pattern];
  settings.siteRules = next;
  await chrome.storage.local.set({ siteRules: next });
  renderRules();
}

function exportSettings() {
  const blob = new Blob([JSON.stringify(settings, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "open-link-in-new-tab-settings.json";
  link.click();
  URL.revokeObjectURL(url);
}

async function importSettings(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    settings = Rules.normalizeSettings(JSON.parse(await file.text()));
    await chrome.storage.local.set(settings);
    location.reload();
  } catch (_) {
    document.querySelector("#rule-error").textContent = "That settings file is not valid JSON.";
  } finally {
    event.target.value = "";
  }
}

async function resetSettings() {
  settings = Rules.normalizeSettings(Rules.DEFAULTS);
  await chrome.storage.local.set(settings);
  location.reload();
}
