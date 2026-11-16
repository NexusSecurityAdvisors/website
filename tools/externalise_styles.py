#!/usr/bin/env python3
"""Move inline CSS out of site/*.html so the CSP can use style-src 'self'.

  python3 tools/externalise_styles.py site

- Each <style> block becomes /css/<sha256[:10]>.css (identical blocks share one file) and
  is replaced by a <link rel="stylesheet"> in the same position, so cascade order holds.
- Each style="..." attribute becomes a class (s-<sha256[:8]>). The rules go in one shared
  file, /css/inline-<sha256[:10]>.css, linked at the end of <head>.

Class rules use the selector `.s-x:is(#_#_#_,*)`. The :is() takes the specificity of its
most specific argument, so the rule outranks the site's normal selectors (up to three ids)
the way the original style attribute did. Inline styles that JavaScript sets later through
el.style still win, because they are style attributes. The script is idempotent and uses
only the standard library.
"""
import glob
import hashlib
import os
import re
import sys

ROOT = sys.argv[1] if len(sys.argv) > 1 else "site"
CSS_DIR = os.path.join(ROOT, "css")
TAG = re.compile(
    r"<[a-zA-Z][^\s>/]*(?:\s+[^\s\"'>/=]+(?:\s*=\s*(?:\"[^\"]*\"|'[^']*'|[^\s\"'=<>`]+))?)*\s*/?>"
)
STYLE_ATTR = re.compile(r"\s+style\s*=\s*(\"([^\"]*)\"|'([^']*)')", re.I)
CLASS_ATTR = re.compile(r"(\s+class\s*=\s*)(\"([^\"]*)\"|'([^']*)')", re.I)
STYLE_BLOCK = re.compile(r"<style\b[^>]*>(.*?)</style>", re.S | re.I)
INLINE_LINK = re.compile(r'\s*<link rel="stylesheet" href="/css/inline-[0-9a-f]{10}\.css">')


def sha(text, n):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()[:n]


def normalise(decl):
    decl = decl.strip().rstrip(";").strip()
    return ";".join(p.strip() for p in decl.split(";") if p.strip())


def main():
    os.makedirs(CSS_DIR, exist_ok=True)
    rules = {}  # class -> declarations
    pages = sorted(glob.glob(os.path.join(ROOT, "**", "*.html"), recursive=True))

    # Keep classes created by an earlier run.
    for old in glob.glob(os.path.join(CSS_DIR, "inline-*.css")):
        for cls, decl in re.findall(r"\.(s-[0-9a-f]{8}):is\(#_#_#_,\*\)\{([^}]*)\}", open(old).read()):
            rules[cls] = decl

    for page in pages:
        html = open(page, encoding="utf-8").read()

        def block(m):
            body = m.group(1).strip() + "\n"
            name = f"{sha(body, 10)}.css"
            path = os.path.join(CSS_DIR, name)
            if not os.path.exists(path):
                open(path, "w", encoding="utf-8").write(body)
            return f'<link rel="stylesheet" href="/css/{name}">'

        html = STYLE_BLOCK.sub(block, html)

        def tag(m):
            t = m.group(0)
            sm = STYLE_ATTR.search(t)
            if not sm:
                return t
            decl = normalise(sm.group(2) if sm.group(2) is not None else sm.group(3))
            t = t[: sm.start()] + t[sm.end():]
            if not decl:
                return t
            cls = f"s-{sha(decl, 8)}"
            rules[cls] = decl
            cm = CLASS_ATTR.search(t)
            if cm:
                existing = cm.group(3) if cm.group(3) is not None else cm.group(4)
                merged = (existing + " " + cls).strip() if cls not in existing.split() else existing
                return t[: cm.start()] + f'{cm.group(1)}"{merged}"' + t[cm.end():]
            end = -2 if t.endswith("/>") else -1
            return t[:end].rstrip() + f' class="{cls}"' + t[end:]

        html = TAG.sub(tag, html)
        open(page, "w", encoding="utf-8").write(html)

    css = "".join(f".{c}:is(#_#_#_,*){{{d}}}\n" for c, d in sorted(rules.items()))
    for old in glob.glob(os.path.join(CSS_DIR, "inline-*.css")):
        os.remove(old)
    name = f"inline-{sha(css, 10)}.css"
    open(os.path.join(CSS_DIR, name), "w", encoding="utf-8").write(css)

    link = f'<link rel="stylesheet" href="/css/{name}">'
    for page in pages:
        html = open(page, encoding="utf-8").read()
        html = INLINE_LINK.sub("", html)
        if rules and "</head>" in html:
            html = html.replace("</head>", f"{link}\n</head>", 1)
        open(page, "w", encoding="utf-8").write(html)

    print(f"{len(pages)} pages, {len(rules)} inline-style classes -> /css/{name}")


if __name__ == "__main__":
    main()
