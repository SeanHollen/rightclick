import { chromium } from 'playwright';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const PROBE = `${os.homedir()}/rightclick-newtab/test/chrome/probe`;
const PICK = fs.readFileSync(new URL('./pick.js', import.meta.url), 'utf8');
const ctx = await chromium.launchPersistentContext(fs.mkdtempSync(path.join(os.tmpdir(), 'rc-')), { channel: 'chromium', headless: true, viewport: { width: 1280, height: 900 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  args: [`--disable-extensions-except=${PROBE}`, `--load-extension=${PROBE}`] });
let probe; while (!(probe = ctx.serviceWorkers().find(w => w.url().endsWith('/sw.js')))) await ctx.waitForEvent('serviceworker');
const page = ctx.pages()[0];
await page.goto('https://www.bing.com/search?q=firefox+extensions', { waitUntil: 'domcontentloaded' }); await new Promise(r => setTimeout(r, 3000));
const links = (await page.evaluate(PICK)).links.filter(l => l.href.includes('/ck/a?')).slice(0, 3);
for (const l of links) {
  await probe.evaluate(() => { self.created.length = 0; });
  await page.mouse.move(l.x, l.y); await page.mouse.down({ button: 'middle' }); await page.mouse.up({ button: 'middle' });
  await new Promise(r => setTimeout(r, 1500));
  const c = await probe.evaluate(() => self.created.splice(0));
  console.log('href had ntb=1:', l.href.endsWith('&ntb=1'), '| native middle-click opened ntb=1:', c.map(u => u.endsWith('&ntb=1')));
}
await ctx.close();
