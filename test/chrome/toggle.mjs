// Toolbar button test (Chrome), counterpart of ../toggle.py. Headless Chrome
// has no toolbar, so the button's click handler (toggleSite) is called in the
// extension's service worker; badges are read back with chrome.action.
import puppeteer from 'puppeteer';

const HOME = process.env.HOME;
const EXT = process.argv[2] || `${HOME}/rightclick-newtab/dist/chrome`;
const PROBE = new URL('./probe', import.meta.url).pathname;
const BASE = 'http://localhost:8765/';
const OTHER = 'http://127.0.0.1:8765/'; // a second site on the same server
const sleep = ms => new Promise(r => setTimeout(r, ms));

const browser = await puppeteer.launch({
  headless: true, enableExtensions: [EXT, PROBE], args: ['--window-size=1200,900', '--no-sandbox'],
});
const workerOf = async file => (await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith(file))).worker();
const probe = await workerOf('/sw.js');
const ext = await workerOf('/background.js');

const failures = [];
function check(name, ok, detail = '') {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(detail)));
  if (!ok) failures.push(name);
}

async function open(url) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 800 });
  await page.evaluateOnNewDocument(() => {
    addEventListener('contextmenu', e => {
      if (e.button !== 2) return;
      setTimeout(() => { window.__nativeMenu = !e.defaultPrevented; });
    }, true);
  });
  await page.goto(url);
  await sleep(500);
  return page;
}

const tabIdOf = page => probe.evaluate(async url => (await chrome.tabs.query({})).find(t => t.url === url).id, page.url());
const badge = async page => ext.evaluate(tabId => chrome.action.getBadgeText({ tabId }), await tabIdOf(page));
const title = async page => ext.evaluate(tabId => chrome.action.getTitle({ tabId }), await tabIdOf(page));
async function pressButton(page) {
  await page.bringToFront();
  await ext.evaluate(tabId => toggleSite({ id: tabId }), await tabIdOf(page));
  await sleep(800);
}

async function rightClickLink(page) {
  await page.bringToFront();
  await page.evaluate(() => { window.__nativeMenu = undefined; });
  await probe.evaluate(() => { self.created.length = 0; });
  const r = await (await page.$('a')).boundingBox();
  await page.mouse.click(r.x + 5, r.y + r.height / 2, { button: 'right' });
  await sleep(800);
  const created = await probe.evaluate(() => self.created.splice(0));
  const menu = await page.evaluate(() => window.__nativeMenu);
  await probe.evaluate(async keep => {
    const extra = (await chrome.tabs.query({})).filter(t => !keep.includes(t.id)).map(t => t.id);
    if (extra.length) await chrome.tabs.remove(extra);
  }, await Promise.all(pages.map(tabIdOf)));
  return created.length === 1 && !menu ? 'tab' : menu && !created.length ? 'menu' : `created=${created.length} menu=${menu}`;
}

const pages = [];
for (const url of [BASE + 'index.html', BASE + 'index.html?second', OTHER + 'index.html']) pages.push(await open(url));
for (const p of await browser.pages()) if (!pages.includes(p)) await p.close();
const [a, b, other] = pages;

check('starts on: no badge', await badge(a) === '', await badge(a));
check('starts on: right-click opens tab', await rightClickLink(a) === 'tab');

await pressButton(a);
check('turned off: badge OFF', await badge(a) === 'OFF', await badge(a));
check('turned off: tooltip names the site', (await title(a)).includes('off on localhost'), await title(a));
check('turned off: right-click shows normal menu', await rightClickLink(a) === 'menu');
check('other tab, same site: badge OFF', await badge(b) === 'OFF', await badge(b));
check('other tab, same site: normal menu', await rightClickLink(b) === 'menu');
check('other site: no badge', await badge(other) === '', await badge(other));
check('other site: right-click opens tab', await rightClickLink(other) === 'tab');

await a.reload(); await sleep(800);
check('reload on disabled site: badge OFF', await badge(a) === 'OFF', await badge(a));
await a.goto(OTHER + 't/home.html'); await sleep(800);
check('navigate disabled site -> other site: badge cleared', await badge(a) === '', await badge(a));
await a.goto(BASE + 'index.html'); await sleep(800);
check('navigate back: badge OFF', await badge(a) === 'OFF', await badge(a));

await pressButton(a);
check('turned on again: badge cleared', await badge(a) === '', await badge(a));
check('turned on again: right-click opens tab', await rightClickLink(a) === 'tab');
check('turned on again: other tab on site cleared', await badge(b) === '', await badge(b));

await pressButton(other);
check('second site off', await badge(other) === 'OFF', await badge(other));
await pressButton(other);
check('second site on again', await badge(other) === '', await badge(other));

// Browser pages have no content script: pressing the button does nothing.
await a.goto('chrome://version'); await sleep(500);
await pressButton(a);
await a.goto(BASE + 'index.html'); await sleep(800);
check('button on browser page: no change', await badge(a) === '' && await rightClickLink(a) === 'tab', await badge(a));

await browser.close();
console.log('\n' + (failures.length ? `${failures.length} FAILED: ${failures.join(', ')}` : 'ALL PASS'));
process.exit(failures.length ? 1 : 0);
