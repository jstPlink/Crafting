#!/usr/bin/env python3
"""Freeze the working copy (mockup/) as a switchable version.

    python scripts/snapshot.py 5.1 --notes "One line for the version menu"
    python scripts/snapshot.py 5.0 --force --save-key crafting.save.0.5.0   # re-freeze, keeping an old save key

Versions are major.minor (4.0, 4.2, 4.3, 5.0 …). They were published as 0.4.0 … 0.5.0 before the
renumbering: those versions keep their old localStorage keys (see saveKey in versions.js).

Freezing an OLDER commit that was never snapshotted (retroactively):
    git archive <commit> mockup | tar -x -C <tmpdir>
    python scripts/snapshot.py 4.2 --src <tmpdir>/mockup --save-key crafting.save.v1

What it does
  1. checks that APP_VERSION in mockup/app.js (or --src) matches the version you pass
  2. copies index.html, app.js and ship3d.js to mockup/versions/<version>/
     (vendor/, versions.js and switcher.js stay shared at the root; paths are rewritten,
     and the versions.js / switcher.js tags are added if the page does not have them yet)
  3. adds / replaces the entry in mockup/versions.js (the manifest the in-app menu reads)

Run it AFTER the last change of a release. Snapshots are frozen: never edit them by hand.
"""
import argparse, datetime, json, pathlib, re, shutil, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent / 'mockup'
FILES = ['index.html', 'app.js', 'ship3d.js']
MANIFEST = ROOT / 'versions.js'
HEAD = b'/* Version manifest. Written by scripts/snapshot.py: do not edit by hand. */\n'


def sub_once(data, old, new, what):
    if data.count(old) != 1:
        sys.exit(f'snapshot: expected exactly one {what} ({old!r}), found {data.count(old)}')
    return data.replace(old, new)


def read_manifest():
    m = re.search(rb'window\.CRAFTING_VERSIONS = (\[.*?\]);', MANIFEST.read_bytes(), re.S)
    return json.loads(m.group(1)) if m else []


def write_manifest(entries):
    nums = lambda e: tuple(int(n) for n in e['version'].split('.'))
    body = b',\n'.join(b'  ' + json.dumps(e, ensure_ascii=False).encode() for e in sorted(entries, key=nums))
    MANIFEST.write_bytes(HEAD + b'window.CRAFTING_VERSIONS = [\n' + body + (b'\n' if body else b'') + b'];\n')


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('version', help='major.minor, must equal APP_VERSION in mockup/app.js')
    ap.add_argument('--notes', default='', help='one line shown in the version menu')
    ap.add_argument('--save-key', help='localStorage key of this version (default crafting.save.<version>)')
    ap.add_argument('--force', action='store_true', help='overwrite an existing snapshot')
    ap.add_argument('--src', help='folder holding index.html/app.js/ship3d.js to freeze (default: mockup/)')
    a = ap.parse_args()

    if not re.fullmatch(r'\d+\.\d+', a.version):
        sys.exit('snapshot: version must look like 5.1 (major.minor)')
    src = pathlib.Path(a.src).resolve() if a.src else ROOT
    app = (src / 'app.js').read_bytes()
    m = re.search(rb"const APP_VERSION = '([^']+)'", app)
    if not m or m.group(1).decode() != a.version:
        sys.exit(f"snapshot: APP_VERSION in app.js is {m.group(1).decode() if m else '?'}, not {a.version}")

    dest = ROOT / 'versions' / a.version
    if dest.exists():
        if not a.force:
            sys.exit(f'snapshot: {dest} already exists (frozen). Use --force only to repair a snapshot.')
        shutil.rmtree(dest)
    dest.mkdir(parents=True)

    for name in FILES:
        data = (src / name).read_bytes()
        if name == 'index.html':
            for lib in ('vendor/three.min.js', 'vendor/GLTFLoader.js'):
                data = sub_once(data, f'src="{lib}"'.encode(), f'src="../../{lib}"'.encode(), lib)
            for lib in ('versions.js', 'switcher.js'):
                tag = f'src="{lib}"'.encode()
                if tag in data:
                    data = sub_once(data, tag, f'src="../../{lib}"'.encode(), lib)
                else:   # page written before the menu existed
                    data = sub_once(data, b'</body>', f'<script src="../../{lib}"></script>\n</body>'.encode(), '</body>')
        if name == 'app.js':   # build label: show the deployment's build info
            data = sub_once(data, b"fetch('version.json'", b"fetch('../../version.json'", 'version.json fetch')
        (dest / name).write_bytes(data)

    old = next((e for e in read_manifest() if e['version'] == a.version), {})   # re-freeze: keep its save key
    entries = [e for e in read_manifest() if e['version'] != a.version]
    entries.append({'version': a.version, 'date': datetime.date.today().isoformat(),
                    'saveKey': a.save_key or old.get('saveKey') or f'crafting.save.{a.version}', 'notes': a.notes or old.get('notes', '')})
    write_manifest(entries)
    print(f'snapshot: v{a.version} frozen in {dest.relative_to(ROOT.parent)} ({len(entries)} versions in the menu)')
    print(f'next: git tag v{a.version} (after the commit)')


if __name__ == '__main__':
    main()
