#!/usr/bin/env python3
"""Local dev server for the mockup: like `python -m http.server`, but tells the browser never to cache.

    python scripts/devserver.py            # serves mockup/ on http://localhost:6480
    python scripts/devserver.py 8000

Without this, browsers keep files such as versions.js for hours (heuristic caching of files served
with only Last-Modified), so a new version or a changed script may not show up until a hard refresh.
"""
import functools, http.server, json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'mockup'


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        """POST /save-rarity {colors, presets}: rewrites the RARITY_DEFAULT / RARITY_PRESETS lines in app.js (the RARITY menu's SAVE AS DEFAULT)."""
        if self.path != '/save-rarity':
            return self.send_error(404)
        try:
            body = json.loads(self.rfile.read(int(self.headers.get('Content-Length', 0))))
            ok = lambda l: isinstance(l, list) and len(l) == 7 and all(isinstance(c, str) and re.fullmatch(r'#[0-9a-fA-F]{6}', c) for c in l)
            cols, presets = body['colors'], body['presets']
            assert ok(cols) and isinstance(presets, dict) and all(ok(v) for v in presets.values())
        except Exception:
            return self.send_error(400)
        f = ROOT / 'app.js'
        new = f.read_text(encoding='utf-8')
        for marker, line in (
            ('rarity-defaults', "const RARITY_DEFAULT = [" + ",".join(f"'{c.lower()}'" for c in cols) + "];   // @rarity-defaults"),
            ('rarity-presets', "const RARITY_PRESETS = " + json.dumps({k: [c.lower() for c in v] for k, v in presets.items()}, separators=(',', ':')) + ";   // @rarity-presets"),
        ):
            new, n = re.subn(r"^const RARITY_\w+ = .*// @" + marker, lambda m: line, new, flags=re.M)
            if n != 1:
                return self.send_error(500)
        f.write_text(new, encoding='utf-8')
        self.send_response(204)
        self.end_headers()


if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 6480
    handler = functools.partial(NoCache, directory=str(ROOT))
    with http.server.ThreadingHTTPServer(('', port), handler) as srv:
        print(f'serving {ROOT} on http://localhost:{port} (no-store)')
        srv.serve_forever()
