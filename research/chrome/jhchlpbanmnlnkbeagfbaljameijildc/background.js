"use strict";

importScripts("rules.js");

const DEFAULTS = globalThis.OpenLinkRules.DEFAULTS;

chrome.runtime.onInstalled.addListener(async () => {
  const stored = await chrome.storage.local.get(Object.keys(DEFAULTS));
  const missing = {};
  for (const [key, value] of Object.entries(DEFAULTS)) {
    if (stored[key] === undefined) missing[key] = value;
  }
  if (Object.keys(missing).length) await chrome.storage.local.set(missing);
  await updateBadge();
});

chrome.runtime.onStartup.addListener(updateBadge);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.enabled) updateBadge();
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "toggle-extension") return;
  const { enabled = true } = await chrome.storage.local.get("enabled");
  await chrome.storage.local.set({ enabled: !enabled });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "open-link" || !Number.isInteger(sender.tab?.id)) return;
  return openLink(message, sender.tab);
});

async function openLink(message, sourceTab) {
  let url;
  try {
    const parsed = new URL(message.url);
    if (!/^(https?|file):$/.test(parsed.protocol)) return { ok: false };
    url = parsed.href;
  } catch (_) {
    return { ok: false };
  }

  const createProperties = {
    url,
    active: !message.openInBackground,
    windowId: sourceTab.windowId,
    openerTabId: sourceTab.id
  };
  if (message.position !== "end" && Number.isInteger(sourceTab.index)) createProperties.index = sourceTab.index + 1;
  await chrome.tabs.create(createProperties);
  return { ok: true };
}

async function updateBadge() {
  const { enabled = true } = await chrome.storage.local.get("enabled");
  await chrome.action.setBadgeText({ text: enabled ? "ON" : "OFF" });
  await chrome.action.setBadgeBackgroundColor({ color: enabled ? "#147D64" : "#697386" });
  await chrome.action.setBadgeTextColor({ color: "#FFFFFF" }).catch(() => {});
}
