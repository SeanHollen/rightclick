import sys, time; sys.path.insert(0,'.')
from suite2 import *
d = start(None)
try:
    for i,c in enumerate(CASES):
        if c["name"] in ("cross-origin iframe","srcdoc iframe nested in an iframe","web component: slotted text inside shadow <a> (closed)"):
            reset(d, BASE+"case/%d.html"%i); time.sleep(1.5)
            print(c["name"], point_of(d,c))
            d.save_screenshot(f"/tmp/claude-1000/-home-seanhollen/b6c076c5-0bb4-4a37-bf74-b79e927290aa/scratchpad/case{i}.png")
            print(d.execute_script("return document.getElementById('f') && document.getElementById('f').getBoundingClientRect().toJSON()"))
    # API probe in a content-script-like privileged scope is not possible here; probe in chrome scope instead
finally: d.quit()
