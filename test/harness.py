import os, time, json, subprocess, sys
from selenium import webdriver
from selenium.webdriver.firefox.options import Options
from selenium.webdriver.firefox.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.action_chains import ActionChains
from selenium.webdriver.common.actions.action_builder import ActionBuilder
from selenium.webdriver.common.keys import Keys

BASE = "http://localhost:8765/"

def start(addon_path=None, headless=True):
    o = Options()
    if headless: o.add_argument("-headless")
    o.set_preference("privacy.userContext.enabled", True)
    # WebDriver input cannot reach out-of-process (cross-origin) iframes; keep
    # them in-process so the cross-origin frame case is testable.
    o.set_preference("fission.webContentIsolationStrategy", 0)
    o.set_preference("browser.tabs.warnOnClose", False)
    o.set_preference("xpinstall.signatures.required", False)
    d = webdriver.Firefox(options=o, service=Service("/snap/bin/geckodriver", service_args=["--allow-system-access"]))
    d.set_window_size(1200, 900)
    if addon_path:
        d.install_addon(addon_path, temporary=True)
    time.sleep(1.5)
    return d

def chrome(d, js, *args):
    with d.context(d.CONTEXT_CHROME):
        return d.execute_script(js, *args)

def tab_urls(d):
    return chrome(d, """return gBrowser.tabs.map(t => {
        let u = t.linkedBrowser.currentURI.spec;
        if (u === 'about:blank' && t.linkedBrowser.userTypedValue) u = t.linkedBrowser.userTypedValue;
        return u.replace('http://localhost:8765/','') + (t.selected ? '*' : '') + (t.userContextId ? '[c'+t.userContextId+']' : '');
    })""")

def reset(d, url=BASE + "index.html", container=0):
    """Close everything, open a fresh single tab on url."""
    chrome(d, """
      const [url, uc] = arguments;
      const t = gBrowser.addTab(url, {triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(), userContextId: uc});
      gBrowser.selectedTab = t;
      for (const x of [...gBrowser.tabs]) if (x !== t) gBrowser.removeTab(x);
    """, url, container)
    d.switch_to.window(d.window_handles[0])
    time.sleep(1.0)

def rclick(d, el, dx=0):
    a = ActionChains(d)
    if dx:
        a.move_to_element(el).click_and_hold  # placeholder
        ab = ActionBuilder(d)
        ab.pointer_action.move_to(el).pointer_down(button=2).move_by(dx, 0).pointer_up(button=2)
        ab.perform()
    else:
        a.context_click(el).perform()

def mclick(d, el):
    ab = ActionBuilder(d)
    ab.pointer_action.move_to(el).pointer_down(button=1).pointer_up(button=1)
    ab.perform()

def shift_rclick(d, el):
    ActionChains(d).key_down(Keys.SHIFT).context_click(el).key_up(Keys.SHIFT).perform()

def close_menus(d):
    chrome(d, "for (const p of document.querySelectorAll('menupopup')) if (p.state==='open'||p.state==='showing') p.hidePopup();")

def menu_open(d):
    return chrome(d, "const m=document.getElementById('contentAreaContextMenu'); return m.state;")
