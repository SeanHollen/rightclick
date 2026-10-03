import sys, time, urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
sys.path.insert(0, __import__('os').path.dirname(__file__))
from cases import CASES, PERF_PAGE, page, FRAME_LINK
import base64
GIF = base64.b64decode("R0lGODlhAQABAIAAAAUEBAAAACwAAAAAAQABAAACAkQBADs=")
INDEX = open(__import__('os').path.join(__import__('os').path.dirname(__file__), 'site', 'index.html')).read()

class H(BaseHTTPRequestHandler):
    def log_message(self, *a): pass
    def send(self, body, ctype="text/html; charset=utf-8"):
        b = body if isinstance(body, bytes) else body.encode()
        self.send_response(200); self.send_header("Content-Type", ctype); self.send_header("Content-Length", str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p = urllib.parse.urlparse(self.path).path
        if p.startswith("/t/") and p.endswith(".gif"): return self.send(GIF, "image/gif")
        if p.startswith("/t/"): return self.send("<title>%s</title>target %s" % (p, p))
        if p == "/frame.html": return self.send("<!doctype html><body style='margin:0'>" + FRAME_LINK + "<script>for (const t of ['pointerdown','mousedown','mouseup','contextmenu','click','auxclick']) addEventListener(t, e => parent.postMessage(t + ':' + e.button, '*'), true);</script>")
        if p == "/index.html": return self.send(INDEX)
        if p == "/perf.html": return self.send("<!doctype html>" + PERF_PAGE)
        if p.startswith("/case/"):
            c = CASES[int(p.split("/")[2].split(".")[0])]
            html = page(c)
            if c.get("xhtml"): return self.send(html, "application/xhtml+xml")
            if c.get("slow"):
                self.send_response(200); self.send_header("Content-Type", "text/html; charset=utf-8"); self.end_headers()
                self.wfile.write((html + "<script src='/slowscript.js'></script>").encode() + b" " * 2048); self.wfile.flush()
                return
            return self.send(html)
        if p == "/slowscript.js":
            time.sleep(20); return self.send("// late", "text/javascript")
        self.send_response(404); self.end_headers()

ThreadingHTTPServer(("127.0.0.1", 8765), H).serve_forever()
