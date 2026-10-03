import sys, time, json; sys.path.insert(0, '.')
from harness import *

R = "/home/seanhollen/rightclick-newtab/research/firefox/"
SCR = "/tmp/claude-1000/-home-seanhollen/b6c076c5-0bb4-4a37-bf74-b79e927290aa/scratchpad/"
EXTS = {
    "none (middle-click oracle)": None,
    "MINE": SCR + "mine.xpi",
    "bgdam Right Click Opens Link New Tab Correct Order 0.0.9": R + "right-click-link-new-tab/0.0.9resigned1/x.xpi",
    "hedworth Right Click Opens Link New Tab 0.0.7": R + "right-click-opens-link-new-tab/0.0.7/x.xpi",
    "Right Links WE 0.5b12": R + "right-links/0.5b12/x.xpi",
}

def E(d, i): return d.find_element(By.ID, i)

def clicks(d, ids, button, pause=0.35):
    for i in ids:
        el = E(d, i)
        if button == 2: rclick(d, el)
        else: mclick(d, el)
        time.sleep(pause)
        close_menus(d)

def rapid(d, ids, button):
    ab = ActionBuilder(d)
    for i in ids:
        ab.pointer_action.move_to(E(d, i)).pointer_down(button=button).pointer_up(button=button)
    ab.perform()

def select(d, url_part):
    chrome(d, "gBrowser.selectedTab = gBrowser.tabs.find(t => t.linkedBrowser.currentURI.spec.includes(arguments[0]));", url_part)
    time.sleep(0.3)

def select_index(d):
    select(d, "index.html")
    d.switch_to.window(d.window_handles[0])  # content focus follows selected tab via chrome; re-sync below
    for h in d.window_handles:
        d.switch_to.window(h)
        if d.current_url.endswith("index.html"): break

def order_scenarios(btn):
    def s_seq(d):
        clicks(d, ["l1", "l2", "l3"], btn)
    def s_rapid(d):
        rapid(d, ["l1", "l2", "l3", "l4", "l5"], btn)
    def s_mixed(d):
        # first and third via native middle-click, second via button under test
        clicks(d, ["l1"], 1); clicks(d, ["l2"], btn); clicks(d, ["l3"], 1)
    def s_switch_back(d):
        clicks(d, ["l1", "l2"], btn); select(d, "t/1.html"); select_index(d); clicks(d, ["l3", "l4"], btn)
    def s_close_child(d):
        clicks(d, ["l1", "l2", "l3"], btn)
        chrome(d, "gBrowser.removeTab(gBrowser.tabs.find(t => t.linkedBrowser.currentURI.spec.includes('t/2.html')));")
        clicks(d, ["l4"], btn)
    def s_unrelated_right(d):
        chrome(d, "for (const u of ['about:robots','about:mozilla']) gBrowser.addTab(u,{triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()});")
        clicks(d, ["l1", "l2"], btn)
    return {"sequential 3": s_seq, "rapid 5 (one action chain)": s_rapid, "mixed with native middle-clicks": s_mixed,
            "switch away & back": s_switch_back, "close a child, open another": s_close_child,
            "unrelated tabs already to the right": s_unrelated_right}

def edge_scenarios():
    def one(i):
        return lambda d: (rclick(d, E(d, i)), time.sleep(0.35))
    def closed(d):
        host = E(d, "closedhost")
        ActionChains(d).move_to_element_with_offset(host, -host.size["width"] // 2 + 40, 0).context_click().perform()
        time.sleep(0.35)
    def iframe(d):
        d.switch_to.frame(E(d, "frame")); rclick(d, E(d, "framelink")); d.switch_to.default_content(); time.sleep(0.35)
    def drag(d):
        rclick(d, E(d, "l1"), dx=40); time.sleep(0.35)
    def shift(d):
        shift_rclick(d, E(d, "l1")); time.sleep(0.35)
    def dyn(d):
        time.sleep(0.5); rclick(d, E(d, "dyn")); time.sleep(0.35)
    return {"child span stops propagation": (one("stopspan"), "t/7"),
            "open shadow root": (lambda d: (rclick(d, d.execute_script("return document.getElementById('openhost').shadowRoot.getElementById('shadowopen')")), time.sleep(.35)), "t/11"),
            "closed shadow root": (closed, "t/12"),
            "SVG <a>": (one("svglink"), "t/8"),
            "<area> image map": (one("arealink"), "t/9"),
            "link inside iframe": (iframe, "t/5"),
            "link added after load": (dyn, "t/6"),
            "page has custom contextmenu": (one("custommenu"), "t/10"),
            "javascript: link (should NOT open)": (one("jslink"), None),
            "href=\"#\" (should NOT open)": (one("hashlink"), None),
            "data: link (should NOT open)": (one("mailto"), None),
            "right-drag 40px (should NOT open)": (drag, None),
            "shift+right-click (should NOT open)": (shift, None)}

results = {}
if len(sys.argv) > 1: EXTS = {k: v for k, v in EXTS.items() if any(a in k for a in sys.argv[1:])}
for name, path in EXTS.items():
    d = start(path)
    res = results[name] = {"order": {}, "edge": {}}
    try:
        btn = 1 if path is None else 2
        for sname, fn in order_scenarios(btn).items():
            reset(d)
            try: fn(d)
            except Exception as e: res["order"][sname] = "ERR " + str(e)[:80]; continue
            time.sleep(1.2); close_menus(d)
            res["order"][sname] = tab_urls(d)
        # container tab
        reset(d, container=1)
        clicks(d, ["l1"], btn); time.sleep(1)
        res["order"]["container tab"] = tab_urls(d)
        if path:
            for ename, (fn, want) in edge_scenarios().items():
                reset(d)
                try: fn(d)
                except Exception as e: res["edge"][ename] = "ERR " + str(e)[:80]; continue
                time.sleep(1.0)
                menu = menu_open(d); close_menus(d)
                tabs = tab_urls(d)
                custom = d.execute_script("return window.customMenuShown")
                opened = tabs[1:]
                ok = (opened == [want + ".html"] and menu == "closed" and not custom) if want else (opened == [])
                res["edge"][ename] = {"ok": ok, "tabs": tabs, "native_menu": menu, "page_menu": custom}
    finally:
        d.quit()
    print(name, json.dumps(res, indent=1), flush=True)
json.dump(results, open("results.json", "w"), indent=1)
