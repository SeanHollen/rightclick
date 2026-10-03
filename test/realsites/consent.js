// Click a cookie/consent "accept" button if one is showing, so links are not
// all hidden behind the dialog. Returns the button text it clicked, or null.
(() => {
  const RE = /^\s*(accept( all)?( cookies)?|accept and continue|i accept|i agree|agree( and continue)?|allow all( cookies)?|yes, i agree|got it|continue|ok|okay|consent)\s*$/i;
  const roots = [document];
  for (const el of document.querySelectorAll('*')) if (el.shadowRoot) roots.push(el.shadowRoot);
  for (const root of roots) {
    for (const b of root.querySelectorAll('button, [role=button], a.button, input[type=button], input[type=submit]')) {
      const text = (b.innerText || b.value || '').trim();
      const r = b.getBoundingClientRect();
      if (r.width && r.height && RE.test(text)) { b.click(); return text; }
    }
  }
  return null;
})()
