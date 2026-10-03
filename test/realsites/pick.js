// Returns right-clickable link candidates in the current viewport, plus
// counts that describe the page. Shared by the Chrome and Firefox runners.
(() => {
  const AD = /doubleclick|googleadservices|googlesyndication|\/aclk|adservice|taboola|outbrain|amazon-adsystem|criteo|adnxs|\/pagead\/|adclick|clicktrack|\/sspa\/click|\/gp\/slredirect|bing\.com\/aclk/i;
  const out = [];
  let covered = 0, total = 0;
  const deepHit = (x, y) => {
    let hit = document.elementFromPoint(x, y);
    while (hit && hit.shadowRoot) {
      const inner = hit.shadowRoot.elementFromPoint(x, y);
      if (!inner || inner === hit) break;
      hit = inner;
    }
    return hit;
  };
  const inside = (a, node) => {
    for (let n = node; n; n = n.assignedSlot || n.parentNode || n.host) if (n === a) return true;
    return false;
  };
  const consider = a => {
    let url;
    const raw = a.getAttribute('href').trim();
    if (raw === '' || raw === '#') return;
    try { url = new URL(raw, a.baseURI); } catch (e) { return; }
    if (!/^https?:$/.test(url.protocol)) return;
    if (url.hash && url.href.split('#')[0] === location.href.split('#')[0]) return;
    if (AD.test(url.href) || /sponsored/i.test(a.rel || '')) return;
    const r = a.getBoundingClientRect();
    if (r.width < 6 || r.height < 6 || r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return;
    const st = getComputedStyle(a);
    if (st.visibility === 'hidden' || +st.opacity === 0) return;
    total++;
    const x = r.left + Math.min(r.width / 2, 25), y = r.top + r.height / 2;
    if (!inside(a, deepHit(x, y))) { covered++; return; }
    out.push({ href: url.href, x, y, text: (a.textContent || a.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 50),
               shadow: a.getRootNode() !== document, svg: a.namespaceURI !== 'http://www.w3.org/1999/xhtml' });
  };
  const walk = root => {
    for (const a of root.querySelectorAll('a[href]')) consider(a);
    for (const el of root.querySelectorAll('*')) if (el.shadowRoot) walk(el.shadowRoot);
  };
  walk(document);
  // Elements that look clickable and navigate-ish but are not links.
  let pseudo = 0;
  for (const el of document.querySelectorAll('[role=link]:not(a), div[onclick], span[onclick], [data-href]:not(a), [data-url]:not(a)')) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight) pseudo++;
  }
  return { links: out, covered, total, pseudo, title: document.title, url: location.href };
})()
