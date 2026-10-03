(function (root, factory) {
  const api = factory();
  root.OpenLinkRules = api;
  if (typeof module === "object" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const DEFAULTS = Object.freeze({
    enabled: true,
    openInBackground: false,
    position: "adjacent",
    scope: "all",
    ignoreHashLinks: true,
    ignoreDownloads: true,
    respectModifiedClicks: true,
    siteRules: {}
  });

  function normalizeSettings(value) {
    const input = value && typeof value === "object" ? value : {};
    const siteRules = {};
    if (input.siteRules && typeof input.siteRules === "object") {
      for (const [pattern, enabled] of Object.entries(input.siteRules)) {
        const clean = normalizePattern(pattern);
        if (clean && typeof enabled === "boolean") siteRules[clean] = enabled;
      }
    }
    return {
      enabled: typeof input.enabled === "boolean" ? input.enabled : DEFAULTS.enabled,
      openInBackground: typeof input.openInBackground === "boolean" ? input.openInBackground : DEFAULTS.openInBackground,
      position: input.position === "end" ? "end" : DEFAULTS.position,
      scope: input.scope === "external" ? "external" : DEFAULTS.scope,
      ignoreHashLinks: typeof input.ignoreHashLinks === "boolean" ? input.ignoreHashLinks : DEFAULTS.ignoreHashLinks,
      ignoreDownloads: typeof input.ignoreDownloads === "boolean" ? input.ignoreDownloads : DEFAULTS.ignoreDownloads,
      respectModifiedClicks: typeof input.respectModifiedClicks === "boolean" ? input.respectModifiedClicks : DEFAULTS.respectModifiedClicks,
      siteRules
    };
  }

  function normalizePattern(value) {
    let pattern = String(value || "").trim().toLowerCase();
    if (!pattern) return "";
    try {
      if (pattern.includes("://")) pattern = new URL(pattern).hostname;
    } catch (_) {
      return "";
    }
    pattern = pattern.replace(/^www\./, "").replace(/\.$/, "");
    if (pattern.startsWith("*.")) {
      const suffix = pattern.slice(2);
      return validHostname(suffix) ? `*.${suffix}` : "";
    }
    return validHostname(pattern) ? pattern : "";
  }

  function validHostname(value) {
    return value === "localhost" || (/^[a-z0-9.-]+$/.test(value) && !value.includes("..") && !value.startsWith(".") && !value.endsWith("."));
  }

  function normalizeHostname(value) {
    return String(value || "").toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  }

  function getSiteOverride(hostname, siteRules) {
    const host = normalizeHostname(hostname);
    if (!host || !siteRules) return null;
    if (typeof siteRules[host] === "boolean") return siteRules[host];

    let best = null;
    let bestLength = -1;
    for (const [pattern, enabled] of Object.entries(siteRules)) {
      if (!pattern.startsWith("*.") || typeof enabled !== "boolean") continue;
      const suffix = pattern.slice(2);
      if ((host === suffix || host.endsWith(`.${suffix}`)) && suffix.length > bestLength) {
        best = enabled;
        bestLength = suffix.length;
      }
    }
    return best;
  }

  function isEnabledForUrl(url, settings) {
    const normalized = normalizeSettings(settings);
    let hostname = "";
    try { hostname = new URL(url).hostname; } catch (_) { return false; }
    const override = getSiteOverride(hostname, normalized.siteRules);
    return override === null ? normalized.enabled : override;
  }

  function evaluateLink(rawUrl, pageUrl, settings) {
    const normalized = normalizeSettings(settings);
    let target;
    let page;
    try {
      target = new URL(rawUrl, pageUrl);
      page = new URL(pageUrl);
    } catch (_) {
      return { eligible: false, reason: "invalid" };
    }
    if (!/^(https?|file):$/.test(target.protocol)) return { eligible: false, reason: "scheme" };
    if (normalized.ignoreHashLinks && target.origin === page.origin && target.pathname === page.pathname && target.search === page.search && target.hash) {
      return { eligible: false, reason: "same-document" };
    }
    if (normalized.scope === "external" && target.origin === page.origin) return { eligible: false, reason: "same-origin" };
    return { eligible: true, url: target.href };
  }

  return { DEFAULTS, normalizeSettings, normalizePattern, normalizeHostname, getSiteOverride, isEnabledForUrl, evaluateLink };
});
