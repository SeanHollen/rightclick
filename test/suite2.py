import sys, time, json, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import start, chrome, close_menus, menu_open
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.actions.action_builder import ActionBuilder
from selenium.webdriver.common.keys import Keys
from cases import CASES

BASE = "http://localhost:8765/"
R = os.path.expanduser("~/rightclick-newtab/research/")
SCR = "/tmp/claude-1000/-home-seanhollen/b6c076c5-0bb4-4a37-bf74-b79e927290aa/scratchpad/"
EXTS = {
    "oracle": None,
    "mine": os.path.expanduser("~/rightclick-newtab/dist/right-click-new-tab-firefox.zip"),
    "bgdam-ff-0.0.9": R + "firefox/right-click-link-new-tab/0.0.9resigned1/x.xpi",
    "hedworth-ff-0.0.7": R + "firefox/right-click-opens-link-new-tab/0.0.7/x.xpi",
    "rightlinks-ff-0.5b12": R + "firefox/right-links/0.5b12/x.xpi",
    "hedworth-chrome-0.1.1": R + "ported/hedworth-chrome-0.1.1.xpi",
    "bgtab-chrome-1.5": R + "ported/bgtab-chrome-1.5.xpi",
}

def tabs(d):
    return chrome(d, """
      const out = [];
      for (const w of Services.wm.getEnumerator('navigator:browser')) {
        out.push(w.gBrowser.tabs.map(t => {
          let u = t.linkedBrowser.currentURI.spec;
          if (u === 'about:blank' && t.linkedBrowser.userTypedValue) u = t.linkedBrowser.userTypedValue;
          return u.replace(/^http:\\/\\/(localhost|127.0.0.1):8765\\//, '') + (t.selected ? '*' : '') +
                 (t.pinned ? '[pin]' : '') + (t.userContextId ? '[c' + t.userContextId + ']' : '') + (t.group ? '[g]' : '');
        }).join(' '));
      }
      return out.join(' || ');""")

def reset(d, url, container=0):
    chrome(d, """
      const [url, uc] = arguments;
      for (const w of [...Services.wm.getEnumerator('navigator:browser')]) if (w !== window) w.close();
      const t = gBrowser.addTab(url, {triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(), userContextId: uc});
      gBrowser.selectedTab = t;
      for (const x of [...gBrowser.tabs]) if (x !== t) gBrowser.removeTab(x);
      window.focus();""", url, container)
    d.switch_to.window(d.window_handles[0])

def point_of(d, c):
    expr = c.get("point") or "(() => { const r = document.getElementById('target').getBoundingClientRect(); return [r.left + Math.min(20, r.width / 2), r.top + r.height / 2]; })()"
    return d.execute_script("return " + expr)

def do_click(d, c, button):
    action = c.get("action", "right")
    if action == "shift":
        ActionChains(d).key_down(Keys.SHIFT).context_click(d.find_element(By.ID, "target")).key_up(Keys.SHIFT).perform()
        return
    x, y = point_of(d, c)
    ab = ActionBuilder(d)
    p = ab.pointer_action
    p.move_to_location(int(x), int(y)).pointer_down(button=button)
    if action == "hold": p.pause(0.7)
    if action == "jitter": p.move_by(3, 2)
    if action == "drag-left": p.move_by(-30 if c.get("point") else -40, 0)
    if action == "drag-right": p.move_by(40, 0)
    if action == "drag-up": p.move_by(0, -30 if c.get("point") else -40)
    p.pointer_up(button=button)
    ab.perform()

def run_case(d, i, c, oracle):
    reset(d, BASE + "case/%d.html" % i)
    time.sleep(2.0 if c.get("slow") else 1.0)
    time.sleep(c.get("wait", 0))
    if c.get("slow"):
        assert d.execute_script("return document.readyState") != "complete", "slow page finished loading early"
    do_click(d, c, 1 if oracle else 2)
    time.sleep(0.8)
    menu = menu_open(d)
    close_menus(d)
    page_menu = bool(d.execute_script("return !!window.__pageMenu"))
    time.sleep(0.6)
    t = tabs(d).split(" ")
    opened = t[1:]
    got = d.execute_script("return window.__got || []")
    if c.get("want_page_menu"):
        ok = opened == [] and page_menu
    elif c["expect"]:
        ok = opened == [c["expect"]] and menu != "open" and not page_menu
    else:
        ok = opened == [] and (menu == "open" or not c.get("menu", True))
    missing = [e for e in c.get("want_events", []) if e not in got]
    ok = ok and not missing
    why = []
    if missing: why.append("page never got " + ",".join(missing))
    if c.get("want_page_menu"):
        why += [] if page_menu else ["site's menu blocked"]
        if opened: why.append("opened " + ",".join(opened))
        return {"ok": ok, "why": "; ".join(why), "tabs": t}
    if c["expect"] and opened != [c["expect"]]: why.append("no tab opened" if not opened else "opened " + ",".join(opened))
    if not c["expect"] and opened: why.append("opened " + ",".join(opened))
    if c["expect"] and menu == "open": why.append("native menu shown")
    if page_menu: why.append("site's own menu shown")
    if not c["expect"] and c.get("menu", True) and menu != "open": why.append("normal menu suppressed")
    return {"ok": ok, "why": "; ".join(why), "tabs": t}

# ---------- ordering ----------
def E(d, i): return d.find_element(By.ID, i)
def clk(d, ids, b):
    for i in ids:
        ab = ActionBuilder(d); ab.pointer_action.move_to(E(d, i)).pointer_down(button=b).pointer_up(button=b); ab.perform()
        time.sleep(0.35); close_menus(d)
def rapid(d, ids, b):
    ab = ActionBuilder(d)
    for i in ids: ab.pointer_action.move_to(E(d, i)).pointer_down(button=b).pointer_up(button=b)
    ab.perform()
def select(d, part):
    chrome(d, "gBrowser.selectedTab = gBrowser.tabs.find(t => t.linkedBrowser.currentURI.spec.includes(arguments[0]));", part); time.sleep(0.3)
def back_to_index(d):
    select(d, "index.html")
    for h in d.window_handles:
        d.switch_to.window(h)
        if d.current_url.endswith("index.html"): break

def ordering(b):
    def seq(d): clk(d, ["l1", "l2", "l3"], b)
    def fast(d): rapid(d, ["l1", "l2", "l3", "l4", "l5"], b)
    def mixed(d): clk(d, ["l1"], 1); clk(d, ["l2"], b); clk(d, ["l3"], 1); clk(d, ["l4"], b)
    def switch(d): clk(d, ["l1", "l2"], b); select(d, "t/1.html"); back_to_index(d); clk(d, ["l3", "l4"], b)
    def close(d):
        clk(d, ["l1", "l2", "l3"], b)
        chrome(d, "gBrowser.removeTab(gBrowser.tabs.find(t => t.linkedBrowser.currentURI.spec.includes('t/2.html')));")
        clk(d, ["l4"], b)
    def unrelated(d):
        chrome(d, "for (const u of ['about:robots','about:mozilla']) gBrowser.addTab(u,{triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()});")
        clk(d, ["l1", "l2"], b)
    def pinned(d):
        chrome(d, "gBrowser.addTab('about:robots',{triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()}); gBrowser.pinTab(gBrowser.selectedTab);")
        clk(d, ["l1", "l2"], b)
    def group(d):
        chrome(d, "const p = Services.scriptSecurityManager.getSystemPrincipal(); gBrowser.addTab('about:robots',{triggeringPrincipal: p}); gBrowser.addTabGroup([gBrowser.selectedTab], {label: 'g', color: 'blue'});")
        clk(d, ["l1", "l2"], b)
    def moved_source(d):
        chrome(d, "const p = Services.scriptSecurityManager.getSystemPrincipal(); gBrowser.addTab('about:robots',{triggeringPrincipal: p}); gBrowser.addTab('about:mozilla',{triggeringPrincipal: p});")
        clk(d, ["l1"], b)
        chrome(d, "gBrowser.moveTabTo(gBrowser.selectedTab, {tabIndex: gBrowser.tabs.length - 1}) ?? 0")
        clk(d, ["l2"], b)
    def two_windows(d):
        # a second window is opened and focused, then a link in the first window is clicked
        chrome(d, "const w = OpenBrowserWindow(); w.addEventListener('load', () => w.focus(), {once: true});"); time.sleep(1.5)
        clk(d, ["l1"], b)
    return dict(sequential=seq, rapid=fast, mixed_with_middle_clicks=mixed, switch_away_and_back=switch,
                close_child_then_open=close, unrelated_tabs_to_right=unrelated, source_pinned=pinned,
                source_in_tab_group=group, source_tab_moved=moved_source, other_window_focused=two_windows)

def main(name):
    path = EXTS[name]
    oracle = path is None
    if path and name == "mine":
        os.system("~/rightclick-newtab/build.sh >/dev/null")
    d = start(path)
    res = {"order": {}, "edge": {}}
    try:
        b = 1 if oracle else 2
        for sname, fn in ordering(b).items():
            reset(d, BASE + "index.html"); time.sleep(1.0)
            try: fn(d)
            except Exception as e: res["order"][sname] = "ERR " + str(e).split("\n")[0][:100]; continue
            time.sleep(1.2); close_menus(d)
            res["order"][sname] = tabs(d)
        reset(d, BASE + "index.html", container=1); time.sleep(1.0)
        clk(d, ["l1"], b); time.sleep(1)
        res["order"]["container_tab"] = tabs(d)
        for i, c in enumerate(CASES):
            if oracle and (not c["expect"] or c.get("want_page_menu")): continue
            try: res["edge"][c["name"]] = run_case(d, i, c, oracle)
            except Exception as e: res["edge"][c["name"]] = {"ok": False, "why": "ERR " + str(e).split("\n")[0][:100], "tabs": []}
        reset(d, BASE + "perf.html"); time.sleep(0.5)
        for _ in range(60):
            v = d.execute_script("return window.__perf")
            if v is not None: break
            time.sleep(0.5)
        res["perf_ms"] = v
    finally:
        d.quit()
    json.dump(res, open(f"results/{name}{os.environ.get('RUN', '')}.json", "w"), indent=1)

if __name__ == "__main__":
    main(sys.argv[1])
