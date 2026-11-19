#!/usr/bin/env python3
"""Combine each page's stylesheets into one bundle, so a page makes one CSS request instead of up to ten.

  python3 tools/bundle_styles.py site

Run it after tools/externalise_styles.py. For every page it takes the /css/*.css links in document
order (head and body), concatenates their contents in that same order into /css/b-<sha256[:10]>.css,
puts one link where the first stylesheet was and removes the rest. Document order is what the
cascade uses, so the result renders the same. Pages with identical stylesheet lists share one bundle.

The script is idempotent: an existing bundle link is treated like any other stylesheet, and bundles
that no page references any more are deleted. Standard library only.
"""
import glob
import hashlib
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "site"
CSS_DIR = os.path.join(ROOT, "css")
LINK = re.compile(r'[ \t]*<link rel="stylesheet" href="/css/([A-Za-z0-9._-]+\.css)">\n?')


def main():
    pages = sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True))
    used = set()
    changed = 0
    for page in pages:
        html = open(page, encoding="utf-8").read()
        names = [m.group(1) for m in LINK.finditer(html)]
        if len(names) < 2:
            used.update(n for n in names if n.startswith("b-"))
            continue
        css = ""
        for n in names:
            body = open(os.path.join(CSS_DIR, n), encoding="utf-8").read()
            css += body if body.endswith("\n") else body + "\n"
        name = f"b-{hashlib.sha256(css.encode('utf-8')).hexdigest()[:10]}.css"
        path = os.path.join(CSS_DIR, name)
        if not os.path.exists(path):
            open(path, "w", encoding="utf-8").write(css)
        used.add(name)
        first = LINK.search(html)
        indent = re.match(r"[ \t]*", first.group(0)).group(0)
        out = html[: first.start()] + f'{indent}<link rel="stylesheet" href="/css/{name}">\n' + LINK.sub("", html[first.end():])
        if out != html:
            open(page, "w", encoding="utf-8").write(out)
            changed += 1
    for old in glob.glob(os.path.join(CSS_DIR, "b-*.css")):
        if os.path.basename(old) not in used:
            os.remove(old)
    print(f"{len(pages)} pages, {changed} rewritten, {len(used)} bundles")


if __name__ == "__main__":
    main()
