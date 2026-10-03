import puppeteer from 'puppeteer';
const mine = process.env.HOME + '/rightclick-newtab/dist/chrome';
const probe = new URL('./probe', import.meta.url).pathname;
const browser = await puppeteer.launch({ headless: true, enableExtensions: [mine, probe], args: ['--window-size=1200,900', '--no-sandbox'] });
const sw = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/sw.js'));
const w = await sw.worker();
const page = (await browser.pages())[0];
await page.evaluateOnNewDocument(() => {
  addEventListener('contextmenu', e => { window.__ctxSeen = true; setTimeout(() => { window.__nativeMenu = !e.defaultPrevented; }); }, true);
});
await page.goto('http://localhost:8765/index.html');
await new Promise(r => setTimeout(r, 1000));
const box = await (await page.$('#l1')).boundingBox();
await page.mouse.move(box.x + 10, box.y + 5);
await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' });
await new Promise(r => setTimeout(r, 1000));
console.log(await page.evaluate(() => [window.__ctxSeen, window.__nativeMenu, window.events]));
console.log(await w.evaluate(async () => (await chrome.tabs.query({})).map(t => [t.windowId, t.index, t.url, t.active])));
await browser.close();
