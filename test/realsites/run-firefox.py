"""Real-site pass for the Firefox build (Selenium + real Firefox): same sites,
link picker and checks as run-chrome.mjs. Usage: run-firefox.py [xpi] [outName]"""
import json, os, subprocess, sys, time
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.actions.action_builder import ActionBuilder

HERE = os.path.dirname(os.path.abspath(__file__))
XPI = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/rightclick-newtab/dist/right-click-new-tab-firefox.zip")
OUT = sys.argv[2] if len(sys.argv) > 2 else "firefox-mine"
SITES = json.load(open(os.path.join(HERE, "sites.json")))
PICK = "(\n" + open(os.path.join(HERE, "pick.js")).read() + "\n)"
CONSENT = "(\n" + open(os.path.join(HERE, "consent.js")).read() + "\n)"
PER_PASS = 4
SELECT = os.path.join(HERE, "select.js")

def select(links, n):
    js = f"const s=require({json.dumps(SELECT)});process.stdout.write(JSON.stringify(s(JSON.parse(require('fs').readFileSync(0,'utf8')),{n})))"
    return json.loads(subprocess.run(["node", "-e", js], input=json.dumps(links), capture_output=True, text=True).stdout)

o = Options()
o.add_argument("-headless")
o.page_load_strategy = "eager"
o.set_preference("browser.tabs.warnOnClose", False)
d = webdriver.Firefox(options=o, service=Service("/snap/bin/geckodriver", service_args=["--allow-system-access"]))
d.set_window_size(1280, 1000)
d.set_page_load_timeout(30)
d.install_addon(XPI, temporary=True)
time.sleep(1.5)

def chrome(js, *args):
    with d.context(d.CONTEXT_CHROME):
        return d.execute_script(js, *args)

# Record the URL of every tab Firefox is asked to create.
chrome("""if (!window.__created) { window.__created = [];
  const orig = gBrowser.addTab.bind(gBrowser);
  gBrowser.addTab = (url, opts) => { window.__created.push(String(url)); return orig(url, opts); }; }""")

def close_others():
    chrome("for (const t of [...gBrowser.tabs]) if (t !== gBrowser.selectedTab) gBrowser.removeTab(t);")

def menu_state():
    st = chrome("return document.getElementById('contentAreaContextMenu').state")
    chrome("for (const p of document.querySelectorAll('menupopup')) if (p.state === 'open' || p.state === 'showing') p.hidePopup();")
    return "open" if st in ("open", "showing") else "suppressed"

def load(url, scrolled):
    try: d.get(url)
    except Exception: pass  # eager load timed out; use what rendered
    time.sleep(3)
    global consent_clicked
    for frame in [None] + d.find_elements("css selector", "iframe"):
        try:
            if frame is not None: d.switch_to.frame(frame)
            clicked = d.execute_script("return " + CONSENT)
        except Exception:
            clicked = None
        finally:
            d.switch_to.default_content()
        if clicked:
            consent_clicked = clicked; time.sleep(1.5); break
    if scrolled:
        d.execute_script("scrollTo(0, innerHeight * 1.2)"); time.sleep(1.2)

def move(x, y):
    ab = ActionBuilder(d); ab.pointer_action.move_to_location(int(x), int(y)); ab.perform()

consent_clicked = None
results = []
for site in SITES:
    consent_clicked = None
    rec = {"site": site, "passes": [], "error": None}
    results.append(rec)
    try:
        for scrolled in (False, True):
            load(site, scrolled)
            info = d.execute_script("return " + PICK)
            p = {"scrolled": scrolled, "title": info["title"], "landed": info["url"], "total": info["total"],
                 "covered": info["covered"], "pseudo": info["pseudo"], "clicks": []}
            rec["passes"].append(p)
            for cand in select(info["links"], PER_PASS):
                before = d.current_url
                move(2, 2); time.sleep(0.4)
                now = next((l for l in d.execute_script("return " + PICK)["links"] if l["href"] == cand["href"]), None)
                if not now:
                    p["clicks"].append({**cand, "result": "skipped: link covered/moved before click (hover popup, carousel)", "ok": None}); continue
                chrome("window.__created.length = 0")
                ab = ActionBuilder(d)
                ab.pointer_action.move_to_location(int(now["x"]), int(now["y"])).pointer_down(button=2).pointer_up(button=2)
                ab.perform()
                time.sleep(1.5)
                created = chrome("return window.__created.splice(0)")
                menu = menu_state()
                after = d.current_url
                notes = []
                if not created: notes.append("NO TAB")
                if len(created) > 1: notes.append(f"{len(created)} tabs")
                if len(created) == 1 and created[0] != now["href"]: notes.append("opened different URL: " + created[0])
                if menu == "open": notes.append("native menu shown")
                if after != before: notes.append("source page navigated to " + after)
                p["clicks"].append({**now, "created": created, "menu": menu, "ok": not notes, "result": "; ".join(notes) or "ok"})
                close_others()
                if after != before: load(site, scrolled)
    except Exception as e:
        rec["error"] = str(e).split("\n")[0][:200]
    rec["consent"] = consent_clicked
    try: close_others()
    except Exception: pass
    clicks = [c for p in rec["passes"] for c in p["clicks"]]
    print(f"{site}: {sum(1 for c in clicks if c['ok'])}/{sum(1 for c in clicks if c['ok'] is not None)} ok" + (f" ERROR {rec['error']}" if rec["error"] else ""), flush=True)
    json.dump(results, open(os.path.join(HERE, OUT + ".json"), "w"), indent=1)
d.quit()
