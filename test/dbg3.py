import sys, time; sys.path.insert(0,'.')
from suite2 import *
d = start(None)
try:
    for i,c in enumerate(CASES):
        if c["name"] in ("cross-origin iframe", "same-origin iframe"):
            reset(d, BASE+"case/%d.html"%i); time.sleep(2)
            d.execute_script("window.__ev=[]; addEventListener('message', e => __ev.push(e.data))")
            do_click(d, c, 1); time.sleep(1)
            print(c["name"], d.execute_script("return __ev"), tabs(d))
finally: d.quit()
