import sys, time; sys.path.insert(0,'.')
from harness import *
import subprocess
subprocess.run("cd ~/rightclick-newtab/extension && rm -f /tmp/claude-1000/-home-seanhollen/b6c076c5-0bb4-4a37-bf74-b79e927290aa/scratchpad/mine.xpi && zip -qr /tmp/claude-1000/-home-seanhollen/b6c076c5-0bb4-4a37-bf74-b79e927290aa/scratchpad/mine.xpi .", shell=True)
d = start("/tmp/claude-1000/-home-seanhollen/b6c076c5-0bb4-4a37-bf74-b79e927290aa/scratchpad/mine.xpi")
try:
    reset(d)
    print(tab_urls(d))
    rclick(d, d.find_element(By.ID, "l1")); time.sleep(1)
    print("events", d.execute_script("return window.events"))
    print("menu", menu_open(d))
    print(tab_urls(d))
finally:
    d.quit()
