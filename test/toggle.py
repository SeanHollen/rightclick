"""Toolbar button test (Firefox): pressing it turns the extension off for the
site in the tab, badges every tab on that site, leaves other sites alone, and
pressing it again turns it back on. Usage: toggle.py [xpi]"""
import sys, os, time; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from harness import *

XPI = sys.argv[1] if len(sys.argv) > 1 else os.path.expanduser("~/rightclick-newtab/dist/right-click-new-tab-firefox.zip")
WIDGET = "right-click-new-tab_seanhollen-browser-action"
OTHER = BASE.replace("localhost", "127.0.0.1")  # a second site on the same server

d = start(XPI)
chrome(d, "CustomizableUI.addWidgetToArea(arguments[0], CustomizableUI.AREA_NAVBAR)", WIDGET)
failures = []

def check(name, ok, detail=""):
    print(("PASS " if ok else "FAIL ") + name + ("" if ok else "  " + str(detail)))
    if not ok: failures.append(name)

def button():
    """Badge and tooltip of the toolbar button for the selected tab."""
    return chrome(d, """const b = CustomizableUI.getWidget(arguments[0]).forWindow(window).node
        .querySelector('.unified-extensions-item-action-button');
      return [b.getAttribute('badge') || '', b.getAttribute('tooltiptext') || b.getAttribute('label')]""", WIDGET)

def press_button():
    chrome(d, """CustomizableUI.getWidget(arguments[0]).forWindow(window).node
        .querySelector('.unified-extensions-item-action-button').click()""", WIDGET)
    time.sleep(1)

def select_tab(i):
    url = chrome(d, "gBrowser.selectedTab = gBrowser.tabs[arguments[0]]; return gBrowser.selectedBrowser.currentURI.spec", i)
    for h in d.window_handles:
        d.switch_to.window(h)
        if d.current_url == url: break
    time.sleep(0.5)

def right_click_link():
    """Right-click the first link of the selected tab: 'tab' if it opened one, 'menu' if the native menu showed."""
    chrome(d, "window.__before = new Set(gBrowser.tabs)")
    rclick(d, d.find_element(By.CSS_SELECTOR, "a")); time.sleep(1)
    menu = menu_open(d) in ("open", "showing"); close_menus(d)
    # New tabs go next to their source, not at the end: remove exactly those.
    opened = chrome(d, """const added = gBrowser.tabs.filter(t => !window.__before.has(t));
        for (const t of added) gBrowser.removeTab(t); return added.length""")
    return "tab" if opened == 1 and not menu else "menu" if menu and not opened else f"opened={opened} menu={menu}"

# Tab 0 and tab 1 on localhost, tab 2 on 127.0.0.1.
reset(d, BASE + "index.html")
for url in (BASE + "index.html?second", OTHER + "index.html"):
    chrome(d, "gBrowser.addTab(arguments[0], {triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal()})", url)
time.sleep(1.5)
select_tab(0)

check("starts on: no badge", button()[0] == "", button())
check("starts on: right-click opens tab", right_click_link() == "tab")

press_button()
check("turned off: badge OFF", button()[0] == "OFF", button())
check("turned off: tooltip names the site", "off on localhost" in button()[1], button())
check("turned off: right-click shows normal menu", right_click_link() == "menu")

select_tab(1)
check("other tab, same site: badge OFF", button()[0] == "OFF", button())
check("other tab, same site: normal menu", right_click_link() == "menu")

select_tab(2)
check("other site: no badge", button()[0] == "", button())
check("other site: right-click opens tab", right_click_link() == "tab")

select_tab(0)
d.get(BASE + "t/home.html"); time.sleep(1)
check("reload on disabled site: badge OFF", button()[0] == "OFF", button())
d.get(OTHER + "t/home.html"); time.sleep(1)
check("navigate disabled site -> other site: badge cleared", button()[0] == "", button())
d.get(BASE + "index.html"); time.sleep(1)
check("navigate back: badge OFF", button()[0] == "OFF", button())

press_button()
check("turned on again: badge cleared", button()[0] == "", button())
check("turned on again: right-click opens tab", right_click_link() == "tab")
select_tab(1)
check("turned on again: other tab on site cleared", button()[0] == "", button())

select_tab(2)
press_button()
check("second site off", button()[0] == "OFF", button())
press_button()
check("second site on again", button()[0] == "", button())

# Browser pages have no content script: pressing the button does nothing.
d.get("about:robots"); time.sleep(1)
press_button()
d.get(BASE + "index.html"); time.sleep(1)
check("button on browser page: no change", button()[0] == "" and right_click_link() == "tab", button())

d.quit()
print(f"\n{'ALL PASS' if not failures else str(len(failures)) + ' FAILED: ' + ', '.join(failures)}")
sys.exit(1 if failures else 0)
