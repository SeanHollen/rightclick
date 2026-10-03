// Chrome counterpart of ../suite2.py: same edge-case pages (cases.json is
// exported from ../cases.py), same ordering scenarios, native middle-click as
// the oracle. Usage: node suite.mjs <name>
import puppeteer from 'puppeteer';
import fs from 'node:fs';

const HOME = process.env.HOME;
const BASE = 'http://localhost:8765/';
const EXTS = {
  oracle: null,
  mine: `${HOME}/rightclick-newtab/dist/chrome`,
  'hedworth-chrome-0.1.1': `${HOME}/rightclick-newtab/research/chrome-unpacked/hedworth-chrome-0.1.1`,
  'bgtab-chrome-1.5': `${HOME}/rightclick-newtab/research/chrome-unpacked/bgtab-chrome-1.5`,
  'verlane-1.0': `${HOME}/rightclick-newtab/research/chrome-unpacked/verlane-1.0`,
};
const PROBE = new URL('./probe', import.meta.url).pathname;
const CASES = JSON.parse(fs.readFileSync(new URL('./cases.json', import.meta.url)));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DEFAULT_POINT = "(() => { const r = document.getElementById('target').getBoundingClientRect(); return [r.left + Math.min(20, r.width / 2), r.top + r.height / 2]; })()";

const name = process.argv[2];
const extPath = EXTS[name];
const oracle = extPath === null;

const browser = await puppeteer.launch({
  headless: true,
  enableExtensions: extPath ? [extPath, PROBE] : [PROBE],
  // Ubuntu's AppArmor blocks the sandbox of downloaded Chrome builds; this
  // browser only ever loads the local test server.
  args: ['--window-size=1200,900', '--no-sandbox'],
});
const sw = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/sw.js'));
const worker = await sw.worker();
const page = (await browser.pages())[0];
await page.setViewport({ width: 1200, height: 800 });
// Runs before extension content scripts, so it sees every contextmenu event
// and can tell afterwards whether anything cancelled it (= no native menu).
await page.evaluateOnNewDocument(() => {
  addEventListener('contextmenu', e => {
    if (e.button !== 2) return;
    window.__ctxSeen = true;
    setTimeout(() => { window.__nativeMenu = !e.defaultPrevented; });
  }, true);
});
await page.goto(BASE + 't/home.html');
const home = await worker.evaluate(async () => (await chrome.tabs.query({ url: '*://*/t/home.html' }))[0].id);

const tabs = () => worker.evaluate(async () => {
  const wins = (await chrome.windows.getAll({ populate: true })).sort((a, b) => a.id - b.id);
  return wins.map(w => w.tabs.map(t =>
    (t.pendingUrl || t.url).replace(/^http:\/\/(localhost|127\.0\.0\.1):8765\//, '') +
    (t.active ? '*' : '') + (t.pinned ? '[pin]' : '') + (t.groupId > -1 ? '[g]' : '')).join(' ')).join(' || ');
});

async function reset(url, slow) {
  await worker.evaluate(async home => {
    for (const w of await chrome.windows.getAll({ populate: true })) {
      if (!w.tabs.some(t => t.id === home)) await chrome.windows.remove(w.id);
    }
    await chrome.tabs.ungroup(home).catch(() => {});
    await chrome.tabs.update(home, { active: true, pinned: false });
    const others = (await chrome.tabs.query({})).filter(t => t.id !== home).map(t => t.id);
    if (others.length) await chrome.tabs.remove(others);
  }, home);
  page.goto(url, { timeout: 60000 }).catch(() => {});
  await sleep(slow ? 2000 : 1000);
}

async function press(x, y, button, action = 'right') {
  await page.mouse.move(x, y);
  if (action === 'shift') await page.keyboard.down('Shift');
  await page.mouse.down({ button });
  if (action === 'hold') await sleep(700);
  if (action === 'jitter') await page.mouse.move(x + 3, y + 2);
  const drag = { 'drag-left': [-40, 0], 'drag-right': [40, 0], 'drag-up': [0, -40] }[action];
  if (drag) await page.mouse.move(x + drag[0], y + drag[1], { steps: 5 });
  await page.mouse.up({ button });
  if (action === 'shift') await page.keyboard.up('Shift');
}

async function frameState() {
  let seen = false, native = false;
  for (const f of page.frames()) {
    try {
      const [s, n] = await f.evaluate(() => [!!window.__ctxSeen, !!window.__nativeMenu]);
      seen ||= s; native ||= n;
    } catch (e) { /* detached frame */ }
  }
  return seen ? (native ? 'open' : 'closed') : 'unknown';
}

async function runCase(i, c) {
  await reset(`${BASE}case/${i}.html`, c.slow);
  await sleep((c.wait || 0) * 1000);
  if (c.slow && (await page.evaluate(() => document.readyState)) === 'complete') throw new Error('slow page finished early');
  const [x, y] = await page.evaluate(c.point || DEFAULT_POINT);
  let action = c.action || 'right';
  if (action === 'drag-left' && c.point) action = 'drag-left30';
  if (action === 'drag-up' && c.point) action = 'drag-up30';
  if (action.endsWith('30')) {
    await page.mouse.move(x, y); await page.mouse.down({ button: oracle ? 'middle' : 'right' });
    await page.mouse.move(x + (action === 'drag-left30' ? -30 : 0), y + (action === 'drag-up30' ? -30 : 0), { steps: 5 });
    await page.mouse.up({ button: oracle ? 'middle' : 'right' });
  } else {
    await press(x, y, oracle ? 'middle' : 'right', action);
  }
  await sleep(800);
  const menu = await frameState();
  const pageMenu = await page.evaluate(() => !!window.__pageMenu).catch(() => false);
  const got = await page.evaluate(() => window.__got || []).catch(() => []);
  await sleep(600);
  const t = (await tabs()).split(' || ')[0].split(' ');
  const opened = t.slice(1);
  const why = [];
  let ok;
  const missing = (c.want_events || []).filter(e => !got.includes(e));
  if (missing.length) why.push('page never got ' + missing.join(','));
  if (c.want_page_menu) {
    ok = opened.length === 0 && pageMenu;
    if (!pageMenu) why.push("site's menu blocked");
    if (opened.length) why.push('opened ' + opened.join(','));
  } else if (c.expect) {
    ok = opened.length === 1 && opened[0] === c.expect && menu !== 'open' && !pageMenu;
    if (!(opened.length === 1 && opened[0] === c.expect)) why.push(opened.length ? 'opened ' + opened.join(',') : 'no tab opened');
    if (menu === 'open') why.push('native menu shown');
    if (pageMenu) why.push("site's own menu shown");
  } else {
    const wantMenu = c.menu !== false;
    ok = opened.length === 0 && (!wantMenu || menu === 'open');
    if (opened.length) why.push('opened ' + opened.join(','));
    if (wantMenu && menu !== 'open') why.push(menu === 'unknown' ? 'menu state unknown' : 'normal menu suppressed');
  }
  ok = ok && !missing.length;
  return { ok, why: why.join('; '), tabs: t, menu };
}

// ---------- ordering ----------
async function center(id) {
  return page.evaluate(id => { const r = document.getElementById(id).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, id);
}
async function clk(ids, button, pause = 350) {
  for (const id of ids) {
    const [x, y] = await center(id);
    await page.mouse.move(x, y); await page.mouse.down({ button }); await page.mouse.up({ button });
    await sleep(pause);
  }
}
const sel = part => worker.evaluate(async part => {
  const t = (await chrome.tabs.query({})).find(t => (t.pendingUrl || t.url).includes(part));
  await chrome.tabs.update(t.id, { active: true });
}, part).then(() => sleep(300));
const extraTabs = urls => worker.evaluate(async urls => { for (const url of urls) await chrome.tabs.create({ url, active: false }); }, urls);

function ordering(b) {
  return {
    sequential: () => clk(['l1', 'l2', 'l3'], b),
    rapid: () => clk(['l1', 'l2', 'l3', 'l4', 'l5'], b, 0),
    mixed_with_middle_clicks: async () => { await clk(['l1'], 'middle'); await clk(['l2'], b); await clk(['l3'], 'middle'); await clk(['l4'], b); },
    switch_away_and_back: async () => { await clk(['l1', 'l2'], b); await sel('t/1.html'); await sel('index.html'); await clk(['l3', 'l4'], b); },
    close_child_then_open: async () => {
      await clk(['l1', 'l2', 'l3'], b);
      await worker.evaluate(async () => { const t = (await chrome.tabs.query({})).find(t => t.url.includes('t/2.html')); await chrome.tabs.remove(t.id); });
      await clk(['l4'], b);
    },
    unrelated_tabs_to_right: async () => { await extraTabs(['about:blank#r1', 'about:blank#r2']); await clk(['l1', 'l2'], b); },
    source_pinned: async () => { await extraTabs(['about:blank#r1']); await worker.evaluate(h => chrome.tabs.update(h, { pinned: true }), home); await clk(['l1', 'l2'], b); },
    source_in_tab_group: async () => { await extraTabs(['about:blank#r1']); await worker.evaluate(h => chrome.tabs.group({ tabIds: [h] }), home); await clk(['l1', 'l2'], b); },
    source_tab_moved: async () => {
      await extraTabs(['about:blank#r1', 'about:blank#r2']);
      await clk(['l1'], b);
      await worker.evaluate(h => chrome.tabs.move(h, { index: -1 }), home);
      await clk(['l2'], b);
    },
    source_navigated_then_open: async () => {
      await clk(['l1', 'l2'], b);
      await page.goto(BASE + 'index.html?again'); await sleep(500);
      await clk(['l3'], b);
    },
    child_moved_away_then_open: async () => {
      await extraTabs(['about:blank#r1']);
      await clk(['l1', 'l2'], b);
      await worker.evaluate(async () => { const t = (await chrome.tabs.query({})).find(t => t.url.includes('t/1.html')); await chrome.tabs.move(t.id, { index: -1 }); });
      await clk(['l3'], b);
    },
    unrelated_moved_between_children: async () => {
      await extraTabs(['about:blank#r1']);
      await clk(['l1', 'l2'], b);
      await worker.evaluate(async () => { const t = (await chrome.tabs.query({})).find(t => t.url.includes('#r1')); await chrome.tabs.move(t.id, { index: 2 }); });
      await clk(['l3'], b);
    },
    other_window_focused: async () => { await worker.evaluate(() => chrome.windows.create({ focused: true, url: 'about:blank#w2' })); await sleep(1000); await clk(['l1'], b); },
  };
}

const res = { order: {}, edge: {} };
const ONLY_ORDER = process.env.ONLY_ORDER;
try {
  const b = oracle ? 'middle' : 'right';
  for (const [sname, fn] of Object.entries(ordering(b))) {
    await reset(BASE + 'index.html');
    try { await fn(); } catch (e) { res.order[sname] = 'ERR ' + e.message.slice(0, 100); continue; }
    await sleep(1200);
    res.order[sname] = await tabs();
  }
  for (const [i, c] of ONLY_ORDER ? [] : CASES.entries()) {
    if (oracle && (!c.expect || c.want_page_menu)) continue;
    try { res.edge[c.name] = await runCase(i, c); }
    catch (e) { res.edge[c.name] = { ok: false, why: 'ERR ' + e.message.slice(0, 100), tabs: [] }; }
  }
  await reset(BASE + 'perf.html');
  let v = null;
  for (let k = 0; k < 60 && v === null; k++) { v = await page.evaluate(() => window.__perf); if (v === null) await sleep(500); }
  res.perf_ms = v;
} finally {
  await browser.close();
}
fs.mkdirSync(new URL('./results', import.meta.url), { recursive: true });
fs.writeFileSync(new URL(`./results/${name}${process.env.RUN || ''}.json`, import.meta.url), JSON.stringify(res, null, 1));
