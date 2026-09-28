#!/usr/bin/env python3
"""Local dev server for the mockup: like `python -m http.server`, but tells the browser never to cache.

    python scripts/devserver.py            # serves mockup/ on http://localhost:6480
    python scripts/devserver.py 8000

Without this, browsers keep files such as versions.js for hours (heuristic caching of files served
with only Last-Modified), so a new version or a changed script may not show up until a hard refresh.
"""
import functools, http.server, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'mockup'


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 6480
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('', port), handler) as srv:
        print(f'serving {ROOT} on http://localhost:{port} (no-store)')
        srv.serve_forever()
