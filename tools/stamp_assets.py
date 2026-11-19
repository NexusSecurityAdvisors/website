#!/usr/bin/env python3
"""Stamp ?v=<content hash> on script tags for the JS files that keep a fixed name.

Most bundles under site/js are content-hashed in their file name (shared-<hash>.js), so
_headers can cache /js/* for a year as immutable. A few files keep a stable name because
docs, tests or other tools refer to it (analytics.js, readiness-check.js). Their script tags
carry ?v=<sha256[:10]> instead, which gives each version its own URL and lets them share the
same long-lived cache rule.

Run after editing one of those files:
    python3 tools/stamp_assets.py site            # rewrite the ?v= stamps in every page
    python3 tools/stamp_assets.py site --check    # report stale or missing stamps (exit 1)

tools/check_site.py runs the --check logic on every PR.
"""
import hashlib
import re
import sys
from pathlib import Path

STABLE_JS = ("analytics.js", "readiness-check.js")


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


def stamp(site, check=False):
    site = Path(site)
    want = {name: digest(site / "js" / name) for name in STABLE_JS if (site / "js" / name).exists()}
    problems, changed = [], 0
    for page in sorted(site.rglob("*.html")):
        html = page.read_text(encoding="utf-8")
        new = html
        for name, h in want.items():
            pat = re.compile(r'(src="/js/' + re.escape(name) + r')(\?v=[0-9a-f]*)?(")')
            for m in pat.finditer(html):
                if m.group(2) != f"?v={h}":
                    problems.append(f"{page.relative_to(site).as_posix()}: /js/{name} needs ?v={h}")
            new = pat.sub(lambda m, h=h: f"{m.group(1)}?v={h}{m.group(3)}", new)
        if new != html and not check:
            page.write_text(new, encoding="utf-8")
            changed += 1
    return problems, changed


def main():
    site = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith("-") else "site"
    check = "--check" in sys.argv
    problems, changed = stamp(site, check)
    if check:
        for p in problems:
            print(p)
        print(f"{'FAIL' if problems else 'PASS'}: {len(problems)} stale or missing stamp(s)")
        sys.exit(1 if problems else 0)
    print(f"{changed} page(s) restamped")


if __name__ == "__main__":
    main()
