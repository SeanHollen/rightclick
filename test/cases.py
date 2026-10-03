"""Edge-case pages. Each case: html body (+ optional head), how to click, what should happen.

expect: target path that should open in exactly one new tab, or None (no tab;
        the normal context menu should appear unless menu=False).
point:  JS expression returning [x, y] viewport coords to right-click; default
        is the centre of #target.
action: right | hold | jitter | drag-left | drag-right | shift
"""
CSS = """<style>
body{font:15px sans-serif;margin:20px}
a,.box{display:inline-block;padding:8px 14px;border:1px solid #888;min-width:140px}
iframe{border:0;width:300px;height:70px;display:block}
</style>"""

FRAME_LINK = '<a href="/t/1.html" style="position:absolute;left:10px;top:10px;width:150px;height:30px;border:1px solid #888">frame link</a>'
FRAME_POINT = "(() => { const r = document.getElementById('f').getBoundingClientRect(); return [r.left + 60, r.top + 25]; })()"

CENTER = "(() => { const r = document.getElementById('target').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; })()"

def wc(mode, slotted=True):
    inner = '<a href="/t/1.html" part=link style="display:inline-block;padding:8px 14px;border:1px solid #888"><slot></slot></a>' if slotted \
        else '<a href="/t/1.html" style="display:inline-block;padding:8px 14px;border:1px solid #888">shadow link</a>'
    return f"""<my-button id=host><span id=target>{'Docs' if slotted else ''}</span></my-button>
<script>customElements.define('my-button', class extends HTMLElement {{
  constructor() {{ super(); this.attachShadow({{mode: '{mode}'}}).innerHTML = '{inner}'; }} }});</script>"""

CASES = [
  # ---------- should open ----------
  dict(name="plain link", group="basic", body='<a id=target href="/t/1.html">plain</a>', expect="t/1.html"),
  dict(name="relative href + <base>", group="basic", head='<base href="/t/">', body='<a id=target href="1.html">based</a>', expect="t/1.html"),
  dict(name="href with surrounding whitespace", group="basic", body='<a id=target href="   /t/1.html \n ">spaces</a>', expect="t/1.html"),
  dict(name="target=_blank rel=noopener", group="basic", body='<a id=target target=_blank rel=noopener href="/t/1.html">blank</a>', expect="t/1.html"),
  dict(name="link wrapping an <img>", group="basic", body='<a href="/t/1.html"><img id=target width=120 height=40 style="background:#cfc" src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="></a>', expect="t/1.html"),
  dict(name="icon link: <svg><use> inside <a>", group="basic",
       body='<svg style="display:none"><symbol id=ic viewBox="0 0 10 10"><rect width=10 height=10 fill=#36c /></symbol></svg><a href="/t/1.html"><svg id=target width=40 height=40><use href="#ic"/></svg> icon</a>', expect="t/1.html"),
  dict(name="stretched-link card (::after overlay)", group="basic",
       body='<div class=box style="position:relative;width:300px;height:120px"><p id=target>card text (not inside the link)</p><a href="/t/1.html" style="position:static;border:0">Read more</a><style>a::after{content:"";position:absolute;inset:0}</style></div>', expect="t/1.html"),
  dict(name="link inside a modal <dialog>", group="basic",
       body='<dialog id=dlg><a id=target href="/t/1.html">dialog link</a></dialog><script>document.getElementById("dlg").showModal()</script>', expect="t/1.html"),
  dict(name="XHTML document (application/xhtml+xml)", group="basic", xhtml=True, body='<a id="target" href="/t/1.html">xhtml link</a>', expect="t/1.html"),

  dict(name="child element stops propagation of every mouse/pointer event", group="page scripts",
       body='<a href="/t/1.html"><span id=target>child swallows events</span></a><script>for (const t of ["pointerdown","pointerup","mousedown","mouseup","click","auxclick","contextmenu"]) document.getElementById("target").addEventListener(t, e => e.stopPropagation());</script>', expect="t/1.html"),
  dict(name="page's window-level capture listener swallows mouse events (drag library)", group="page scripts",
       head='<script>for (const t of ["pointerup","mouseup","click","auxclick","mousedown"]) window.addEventListener(t, e => { if (e.button === 2) e.stopImmediatePropagation(); }, true);</script>',
       body='<a id=target href="/t/1.html">swallowed at window</a>', expect="t/1.html"),
  dict(name="carousel: preventDefault() on pointerdown (kills mousedown/mouseup)", group="page scripts",
       body='<div class=box id=car><a id=target href="/t/1.html">slide link</a></div><script>document.getElementById("car").addEventListener("pointerdown", e => e.preventDefault());</script>', expect="t/1.html"),
  dict(name="slider: pointerdown preventDefault + setPointerCapture", group="page scripts",
       body='<div class=box id=car style="width:300px"><a id=target href="/t/1.html">captured slide link</a></div><script>const c = document.getElementById("car"); c.addEventListener("pointerdown", e => { e.preventDefault(); c.setPointerCapture(e.pointerId); });</script>', expect="t/1.html"),
  dict(name="link re-rendered on mousedown (React-style state change)", group="page scripts",
       body='<div id=wrap><a id=target href="/t/1.html">re-rendered</a></div><script>document.getElementById("wrap").addEventListener("mousedown", () => { const a = document.querySelector("#wrap a"); a.replaceWith(a.cloneNode(true)); });</script>', expect="t/1.html"),
  dict(name="href rewritten on mousedown (search-result tracking)", group="page scripts",
       body='<a id=target href="/t/2.html">tracked</a><script>document.getElementById("target").addEventListener("mousedown", e => { e.currentTarget.href = "/t/1.html"; });</script>', expect="t/1.html"),
  dict(name="anti-right-click site (contextmenu blocked by page)", group="page scripts",
       head='<script>window.addEventListener("contextmenu", e => e.preventDefault(), true); document.oncontextmenu = () => false;</script>',
       body='<a id=target href="/t/1.html">no right click here</a>', expect="t/1.html"),
  dict(name="site shows its own custom context menu", group="page scripts",
       body='<a id=target href="/t/1.html">custom menu</a><script>document.addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', expect="t/1.html", page_menu=True),
  dict(name="link added 300ms after load (SPA / infinite scroll)", group="page scripts", wait=0.6,
       body='<div id=h></div><script>setTimeout(() => document.getElementById("h").innerHTML = \'<a id=target href="/t/1.html">late link</a>\', 300);</script>', expect="t/1.html"),
  dict(name="root element replaced after load", group="page scripts", wait=0.6,
       body='<script>setTimeout(() => { const h = document.createElement("html"); h.innerHTML = \'<body><a id=target href="/t/1.html" style="display:inline-block;padding:8px">new root</a></body>\'; document.documentElement.replaceWith(h); }, 200);</script>', expect="t/1.html"),
  dict(name="document.open()/write() after load", group="page scripts", wait=0.8,
       body='<script>setTimeout(() => { document.open(); document.write(\'<a id=target href="/t/1.html" style="display:inline-block;padding:8px">rewritten doc</a>\'); document.close(); }, 200);</script>', expect="t/1.html"),
  dict(name="page still loading (slow third-party script)", group="page scripts", slow=True, body='<a id=target href="/t/1.html">loading page</a>', expect="t/1.html"),

  dict(name="open shadow root", group="shadow DOM", body=wc("open", slotted=False), point="(() => { const r = document.getElementById('host').shadowRoot.querySelector('a').getBoundingClientRect(); return [r.left + 20, r.top + 10]; })()", expect="t/1.html"),
  dict(name="closed shadow root", group="shadow DOM", body=wc("closed", slotted=False), point="(() => { const r = document.getElementById('host').getBoundingClientRect(); return [r.left + 20, r.top + 10]; })()", expect="t/1.html"),
  dict(name="web component: slotted text inside shadow <a> (open)", group="shadow DOM", body=wc("open"), expect="t/1.html"),
  dict(name="web component: slotted text inside shadow <a> (closed)", group="shadow DOM", body=wc("closed"), expect="t/1.html"),
  dict(name="shadow root nested in shadow root", group="shadow DOM",
       body='<div id=host></div><script>const s1 = document.getElementById("host").attachShadow({mode:"open"}); s1.innerHTML = "<div id=h2></div>"; s1.getElementById("h2").attachShadow({mode:"open"}).innerHTML = \'<a href="/t/1.html" style="display:inline-block;padding:8px">deep link</a>\';</script>',
       point="(() => { const r = document.getElementById('host').getBoundingClientRect(); return [r.left + 20, r.top + 10]; })()", expect="t/1.html"),

  dict(name="SVG <a href>", group="link types", body='<svg width=160 height=40><a href="/t/1.html"><rect id=target width=160 height=40 fill="#ccf"/></a></svg>', expect="t/1.html"),
  dict(name="SVG <a xlink:href>", group="link types", body='<svg width=160 height=40 xmlns:xlink="http://www.w3.org/1999/xlink"><a xlink:href="/t/1.html"><rect id=target width=160 height=40 fill="#fcc"/></a></svg>', expect="t/1.html"),
  dict(name="<area> in an image map", group="link types", body='<img id=target width=160 height=40 style="background:#cfc" usemap="#m" src="data:image/gif;base64,R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs="><map name=m><area shape=rect coords="0,0,160,40" href="/t/1.html"></map>', expect="t/1.html"),
  dict(name="nested links (inner one wins)", group="link types",
       body='<a id=outer href="/t/2.html" style="padding:20px">outer </a><script>const i = document.createElement("a"); i.id = "target"; i.href = "/t/1.html"; i.textContent = "inner"; document.getElementById("outer").appendChild(i);</script>', expect="t/1.html"),

  dict(name="same-origin iframe", group="frames", body='<iframe id=f src="/frame.html"></iframe>', point=FRAME_POINT, expect="t/1.html"),
  dict(name="cross-origin iframe", group="frames", body='<iframe id=f src="http://127.0.0.1:8765/frame.html"></iframe>', point=FRAME_POINT, expect="t/1.html"),
  dict(name="srcdoc iframe", group="frames", body=f'<iframe id=f srcdoc=\'{FRAME_LINK}\'></iframe>', point=FRAME_POINT, expect="t/1.html"),
  dict(name="about:blank iframe filled by script", group="frames", body=f'<iframe id=f></iframe><script>const d = document.getElementById("f").contentDocument; d.open(); d.write(\'{FRAME_LINK}\'); d.close();</script>', point=FRAME_POINT, expect="t/1.html"),
  dict(name="sandboxed iframe", group="frames", body='<iframe id=f sandbox src="/frame.html"></iframe>', point=FRAME_POINT, expect="t/1.html"),
  dict(name="srcdoc iframe nested in an iframe", group="frames",
       body='<iframe id=f srcdoc="<body style=margin:0></body>"></iframe><script>const f = document.getElementById("f"); f.onload = () => { const i = f.contentDocument.createElement("iframe"); i.style.cssText = "border:0;width:300px;height:70px"; i.srcdoc = FRAME_LINK_JS; f.contentDocument.body.appendChild(i); };</script>'.replace("FRAME_LINK_JS", repr(FRAME_LINK)),
       point=FRAME_POINT, expect="t/1.html"),

  dict(name="held for 700ms before release", group="mouse handling", action="hold", body='<a id=target href="/t/1.html">slow press</a>', expect="t/1.html"),
  dict(name="3px hand jitter during click", group="mouse handling", action="jitter", body='<a id=target href="/t/1.html">jittery</a>', expect="t/1.html"),

  # ---------- should NOT open ----------
  dict(name="javascript: link", group="should keep normal menu", body='<a id=target href="javascript:void(0)">js</a>', expect=None),
  dict(name='href="#"', group="should keep normal menu", body='<a id=target href="#">hash</a>', expect=None),
  dict(name="data: link", group="should keep normal menu", body='<a id=target href="data:text/plain,hi">data</a>', expect=None),
  dict(name="<a> without href (JS pseudo-link)", group="should keep normal menu", body='<a id=target onclick="location=\'/t/1.html\'">no href</a>', expect=None),
  dict(name="image that is not a link", group="should keep normal menu", body='<img id=target width=120 height=40 style="background:#ccf" src="/t/pixel.gif">', expect=None),
  dict(name="canvas that is not a link", group="should keep normal menu", body='<canvas id=target width=120 height=40 style="background:#fcf"></canvas>', expect=None),
  dict(name="plain text", group="should keep normal menu", body='<p><span id=target>just text</span></p>', expect=None),
  dict(name="link inside a rich-text editor (contenteditable)", group="should keep normal menu", body='<div contenteditable class=box>Edit me <a id=target href="/t/1.html">editable link</a></div>', expect=None),
  dict(name="shift+right-click", group="should keep normal menu", action="shift", body='<a id=target href="/t/1.html">shift</a>', expect=None),
  dict(name="right-drag 40px left (cancel)", group="should keep normal menu", action="drag-left", body='<p style="padding-left:80px"><a id=target href="/t/1.html">drag left</a></p>', expect=None, menu=False),
  dict(name="right-drag 40px up (cancel)", group="should keep normal menu", action="drag-up", body='<p style="padding-top:80px"><a id=target href="/t/1.html">drag up</a></p>', expect=None, menu=False),
  dict(name="right-drag 30px left, staying on a wide link (cancel)", group="should keep normal menu", action="drag-left", body='<a id=target href="/t/1.html" style="width:400px">wide link</a>', point=CENTER, expect=None, menu=False),
  dict(name="right-drag 30px up, staying on a tall link (cancel)", group="should keep normal menu", action="drag-up", body='<a id=target href="/t/1.html" style="height:120px">tall link</a>', point=CENTER, expect=None, menu=False),
  dict(name="right-drag 40px right (cancel)", group="should keep normal menu", action="drag-right", body='<a id=target href="/t/1.html">drag right</a>', expect=None, menu=False),
  {'name': 'custom element with its own right-click menu (file-manager row)', 'group': "false positives (site's own right-click)", 'body': '<file-row id=target class=box style="display:block;width:300px">report.pdf</file-row><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': 'div role="link" with its own right-click menu', 'group': "false positives (site's own right-click)", 'body': '<div id=target role=link tabindex=0 class=box onclick="location=\'/t/1.html\'">pseudo link</div><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': '<button> with its own right-click menu', 'group': "false positives (site's own right-click)", 'body': '<button id=target class=box>Options</button><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': 'canvas game using right mouse button', 'group': "false positives (site's own right-click)", 'body': '<canvas id=target width=300 height=100 style="background:#eef"></canvas><script>window.__got = []; for (const t of ["mousedown","mouseup","pointerdown","pointerup"]) addEventListener(t, e => { if (e.button === 2) window.__got.push(t); }); document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True, 'want_events': ['pointerdown', 'mousedown', 'pointerup', 'mouseup']},
  {'name': 'image editor: image with its own right-click menu', 'group': "false positives (site's own right-click)", 'body': '<img id=target width=160 height=60 style="background:#ccf" src="/t/pixel.gif"><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': '<a href="#"> used as a button, with its own menu', 'group': "false positives (site's own right-click)", 'body': '<a id=target href="#" onclick="return false">Menu ▾</a><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': '<a href=javascript:> with its own menu', 'group': "false positives (site's own right-click)", 'body': '<a id=target href="javascript:void(0)">Actions</a><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': '<a> without href inside an app, with its own menu', 'group': "false positives (site's own right-click)", 'body': '<a id=target class=box>Channel</a><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': 'custom element with an href attribute (not a link) and its own menu', 'group': "false positives (site's own right-click)", 'body': '<x-card id=target href="/t/1.html" class=box style="display:block;width:300px">card with href attr</x-card><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': 'SVG icon <use xlink:href> (not a link) with its own menu', 'group': "false positives (site's own right-click)", 'body': '<svg style="display:none"><symbol id=ic viewBox="0 0 10 10"><rect width=10 height=10 fill=#c63 /></symbol></svg><svg id=target width=60 height=60 xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="#ic"/></svg><script>document.getElementById("target").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': 'rich-text editor: link inside contenteditable with editor menu', 'group': "false positives (site's own right-click)", 'body': '<div contenteditable class=box>Edit <a id=target href="/t/1.html">a link</a> here</div><script>document.querySelector("[contenteditable]").addEventListener("contextmenu", e => { e.preventDefault(); window.__pageMenu = true; });</script>', 'expect': None, 'want_page_menu': True},
  {'name': 'page right-button handlers on a real link still receive mousedown/mouseup', 'group': "false positives (site's own right-click)", 'body': '<a id=target href="/t/1.html">tracked link</a><script>window.__got = []; for (const t of ["mousedown","mouseup","pointerdown","pointerup"]) addEventListener(t, e => { if (e.button === 2) window.__got.push(t); });</script>', 'expect': 't/1.html', 'want_page_menu': False, 'want_events': ['pointerdown', 'mousedown', 'pointerup', 'mouseup']},
]

PERF_PAGE = CSS + """<div id=links></div><script>
const box = document.getElementById('links');
box.innerHTML = Array.from({length: 3000}, (_, i) => '<a href="/t/' + i + '.html">l' + i + '</a>').join(' ');
window.__perf = null;
setTimeout(() => {
  const t0 = performance.now(); let n = 0;
  (function tick() {
    const s = document.createElement('span'); s.textContent = n; box.appendChild(s); s.remove();
    if (++n < 300) setTimeout(tick, 0); else window.__perf = performance.now() - t0;
  })();
}, 500);
</script>"""

def page(c):
    if c.get("xhtml"):
        return ('<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>x</title>' + CSS.replace('<style>', '<style>/*<![CDATA[*/').replace('</style>', '/*]]>*/</style>') +
                '</head><body>' + c["body"] + '</body></html>')
    return '<!doctype html><meta charset=utf-8><title>' + c["name"] + '</title>' + CSS + c.get("head", "") + c["body"]
