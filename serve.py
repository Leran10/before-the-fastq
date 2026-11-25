#!/usr/bin/env python3
"""Tiny no-cache dev server. ES modules need http://, not file://.

    python3 serve.py            # http://localhost:8765
    python3 serve.py 9000
"""
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
    print(f"serving on http://localhost:{port}")
    ThreadingHTTPServer(("", port), NoCache).serve_forever()
