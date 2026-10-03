import sys, time; sys.path.insert(0,'.')
from suite2 import *
for ext in [None, SCR+"mine.xpi"]:
    d = start(ext)
    try:
        for i,c in enumerate(CASES):
            if "iframe" in c["name"] and ("cross" in c["name"] or "nested" in c["name"]):
                for btn in (1,2):
                    reset(d, BASE+"case/%d.html"%i); time.sleep(2)
                    do_click(d, c, btn); time.sleep(1)
                    print(ext and "mine", c["name"], "btn", btn, "menu", menu_open(d), tabs(d)); close_menus(d)
    finally: d.quit()
