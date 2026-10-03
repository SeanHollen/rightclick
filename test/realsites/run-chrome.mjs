// Real-site pass for the Chrome build with Playwright: open each site in a
// headless browser, right-click a sample of real links, and record anything
// other than "exactly one new tab with the link's URL, no native menu, page
// untouched". Usage: node run-chrome.mjs [extensionDir] [outName]
import { chromium } from 'playwright';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const select = require('./select.js');
const HOME = os.homedir();
const EXT = process.argv[2] || `${HOME}/rightclick-newtab/dist/chrome`;
const OUT = process.argv[3] || 'chrome-mine';
const PROBE = `${HOME}/rightclick-newtab/test/chrome/probe`;
const SITES = JSON.parse(fs.readFileSync(new URL('./sites.json', import.meta.url))).slice(+(process.env.START || 0));
const PICK = fs.readFileSync(new URL('./pick.js', import.meta.url), 'utf8');
const CONSENT = fs.readFileSync(new URL('./consent.js', import.meta.url), 'utf8');
const PER_PASS = 4;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const context = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'rc-')), {
  channel: 'chromium',
  headless: true,
  viewport: { width: 1280, height: 900 },
  // Headless Chromium says "HeadlessChrome", which many sites block outright.
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  args: [`--disable-extensions-except=${EXT},${PROBE}`, `--load-extension=${EXT},${PROBE}`],
});
await context.addInitScript(() => {
  addEventListener('contextmenu', e => {
    if (e.button !== 2) return;
    window.__ctxSeen = true;
    setTimeout(() => { window.__nativeMenu = !e.defaultPrevented; });
  }, true);
});
let probe;
while (!probe) {
  probe = context.serviceWorkers().find(w => w.url().endsWith('/sw.js'));
  if (!probe) await context.waitForEvent('serviceworker', { timeout: 10000 }).catch(() => {});
}
let page = context.pages()[0] || await context.newPage();

async function closeOthers() {
  await probe.evaluate(async () => {
    const [keep] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    const others = (await chrome.tabs.query({})).filter(t => t.id !== keep.id).map(t => t.id);
    if (others.length) await chrome.tabs.remove(others);
  });
}

async function menuState() {
  let seen = false, native = false;
  for (const f of page.frames()) {
    const r = await f.evaluate(() => [!!window.__ctxSeen, !!window.__nativeMenu]).catch(() => [false, false]);
    seen ||= r[0]; native ||= r[1];
  }
  return seen ? (native ? 'open' : 'suppressed') : 'no contextmenu event';
}

async function resetFlags() {
  for (const f of page.frames()) await f.evaluate(() => { window.__ctxSeen = false; window.__nativeMenu = false; }).catch(() => {});
}

async function freshPage() {
  // A new tab per site, so a navigation still pending from a failed site
  // cannot interrupt the next one.
  const old = page;
  page = await context.newPage();
  page.on('dialog', d => d.dismiss().catch(() => {}));
  await page.bringToFront();
  await old.close().catch(() => {});
}

async function load(url, scrolled) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(3000);
  for (const f of page.frames()) {
    const clicked = await f.evaluate(CONSENT).catch(() => null);
    if (clicked) { consentClicked = clicked; await sleep(1500); break; }
  }
  if (scrolled) { await page.evaluate(() => scrollTo(0, innerHeight * 1.2)); await sleep(1200); }
}

let consentClicked = null;
const results = [];
for (const site of SITES) {
  await freshPage();
  consentClicked = null;
  const rec = { site, passes: [], error: null };
  results.push(rec);
  // A hung page (bot check, endless redirect) must not stall the whole run.
  let timer;
  const timeout = new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('site timed out after 150s')), 150000); });
  try { await Promise.race([timeout, testSite(site, rec)]); }
  catch (e) { rec.error = e.message.split('\n')[0]; }
  clearTimeout(timer);
  rec.consent = consentClicked;
  await closeOthers().catch(() => {});
  const c = rec.passes.flatMap(p => p.clicks);
  console.log(`${site}: ${c.filter(x => x.ok).length}/${c.filter(x => x.ok !== null).length} ok${rec.error ? ' ERROR ' + rec.error : ''}`);
  fs.writeFileSync(new URL(`./${OUT}.json`, import.meta.url), JSON.stringify(results, null, 1));
}
await context.close();

async function testSite(site, rec) {
  {
    for (const scrolled of [false, true]) {
      await load(site, scrolled);
      const info = await page.evaluate(PICK);
      const pass = { scrolled, title: info.title, landed: info.url, total: info.total, covered: info.covered, pseudo: info.pseudo, clicks: [] };
      rec.passes.push(pass);
      for (const cand of select(info.links, PER_PASS)) {
        const before = page.url();
        // Park the mouse so hover popups from the previous click close.
        await page.mouse.move(2, 2); await sleep(400);
        // Layout may have shifted since the scan: find the same link again.
        const now = (await page.evaluate(PICK)).links.find(l => l.href === cand.href);
        if (!now) { pass.clicks.push({ ...cand, result: 'skipped: link covered/moved before click (hover popup, carousel)', ok: null }); continue; }
        await resetFlags();
        await probe.evaluate(() => { self.created.length = 0; });
        await page.mouse.move(now.x, now.y);
        await page.mouse.down({ button: 'right' });
        await page.mouse.up({ button: 'right' });
        await sleep(1500);
        const created = await probe.evaluate(() => self.created.splice(0));
        const menu = await menuState();
        const after = page.url();
        const notes = [];
        if (created.length === 0) notes.push('NO TAB');
        if (created.length > 1) notes.push(`${created.length} tabs`);
        if (created.length === 1 && created[0] !== now.href) notes.push(`opened different URL: ${created[0]}`);
        if (menu === 'open') notes.push('native menu shown');
        if (after !== before) notes.push(`source page navigated to ${after}`);
        pass.clicks.push({ ...now, created, menu, ok: notes.length === 0, result: notes.join('; ') || 'ok' });
        await closeOthers();
        if (after !== before) await load(site, scrolled);
      }
    }
  }
}
