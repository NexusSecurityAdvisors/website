#!/usr/bin/env python3
"""
Security and quality checks for nexussecurityadvisors.com (standard library only).

    python3 tools/check_site.py            # repository checks (CI on every PR)
    python3 tools/check_site.py --live     # also check the production site (scheduled monitor)

Repository checks
  - every internal link and asset in site/*.html resolves to a file (pretty URLs supported)
  - every sitemap URL maps to a page, and every page except 404 is in the sitemap
  - _headers sets the required security headers (HSTS >= 180 days); the CSP has no unsafe-eval and keeps script-src strict
  - security.txt has Contact, Canonical and an Expires date at least 30 days away (RFC 9116)
  - no executable inline <script> blocks (JSON-LD data is allowed; the CSP relies on external scripts)
Live checks (--live)
  - production responses carry the same security headers as site/_headers
  - TLS certificate is valid for at least 21 more days
  - /.well-known/security.txt is served and not expiring soon
"""
import re
import socket
import ssl
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"
HOST = "www.nexussecurityadvisors.com"
MIN_HSTS = 15552000  # 180 days; matches the zone-level HSTS policy (raise to 31536000+ for preload)
REQUIRED_HEADERS = ["Strict-Transport-Security", "Content-Security-Policy", "X-Content-Type-Options",
                    "Referrer-Policy", "Permissions-Policy", "X-Frame-Options", "Cross-Origin-Opener-Policy"]
errors, warnings = [], []


def err(msg):
    errors.append(msg)


def headers_file():
    block, out = None, {}
    for line in (SITE / "_headers").read_text().splitlines():
        if line and not line.startswith((" ", "\t")):
            block = line.strip()
        elif block == "/*" and ":" in line:
            k, v = line.strip().split(":", 1)
            out[k.strip()] = v.strip()
    return out


def check_headers(h, where):
    for name in REQUIRED_HEADERS:
        if name not in h:
            err(f"{where}: missing {name}")
    csp = h.get("Content-Security-Policy", "")
    if "'unsafe-eval'" in csp:
        err(f"{where}: CSP allows 'unsafe-eval'")
    script_src = re.search(r"script-src ([^;]+)", csp)
    if script_src and ("'unsafe-inline'" in script_src.group(1) or " * " in f" {script_src.group(1)} "):
        err(f"{where}: script-src is not strict ({script_src.group(1)[:80]})")
    for d in ("frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"):
        if d not in csp:
            err(f"{where}: CSP missing {d}")
    hsts = h.get("Strict-Transport-Security", "")
    m = re.search(r"max-age=(\d+)", hsts)
    if not m or int(m.group(1)) < MIN_HSTS:
        err(f"{where}: HSTS max-age below {MIN_HSTS // 86400} days")


def check_security_txt(text, where):
    fields = dict(re.findall(r"^([A-Za-z-]+):\s*(.+)$", text, re.M))
    for f in ("Contact", "Expires", "Canonical"):
        if f not in fields:
            err(f"{where}: security.txt missing {f}")
    if "Expires" in fields:
        exp = datetime.fromisoformat(fields["Expires"].replace("Z", "+00:00"))
        left = exp - datetime.now(timezone.utc)
        if left < timedelta(days=0):
            err(f"{where}: security.txt expired on {exp:%Y-%m-%d}")
        elif left < timedelta(days=30):
            err(f"{where}: security.txt expires in {left.days} days ({exp:%Y-%m-%d}); bump Expires")
        elif left < timedelta(days=90):
            warnings.append(f"{where}: security.txt expires in {left.days} days")


def repo_checks():
    files = {p.relative_to(SITE).as_posix() for p in SITE.rglob("*") if p.is_file()}
    pages = sorted(SITE.glob("*.html"))
    for page in pages:
        html = page.read_text(encoding="utf-8")
        if re.search(r"<script(?![^>]*\bsrc=)(?![^>]*application/ld\+json)[^>]*>\s*\S", html):
            err(f"{page.name}: inline <script> found (CSP expects external scripts)")
        for ref in re.findall(r'(?:href|src)="([^"]+)"', html):
            if ref.startswith(("http:", "https:", "mailto:", "tel:", "#", "data:", "javascript:")):
                if ref.startswith("http:"):
                    err(f"{page.name}: insecure link {ref}")
                continue
            path = ref.split("#")[0].split("?")[0].lstrip("/")
            if path and not (path in files or f"{path}.html" in files or f"{path.rstrip('/')}/index.html" in files):
                err(f"{page.name}: broken internal link {ref}")
    locs = re.findall(r"<loc>https://[^/]+/?([^<]*)</loc>", (SITE / "sitemap.xml").read_text())
    in_map = {(l.strip("/") or "index") for l in locs}
    for l in in_map:
        if f"{l}.html" not in files:
            err(f"sitemap.xml lists /{l} but site/{l}.html does not exist")
    for page in pages:
        if page.stem not in in_map and page.stem != "404":
            err(f"{page.name} is not in sitemap.xml")
    check_headers(headers_file(), "site/_headers")
    check_security_txt((SITE / ".well-known" / "security.txt").read_text(), "site/.well-known/security.txt")


def live_checks():
    want = headers_file()
    req = urllib.request.Request(f"https://{HOST}/", headers={"User-Agent": "nexus-site-monitor"})
    with urllib.request.urlopen(req, timeout=30) as r:
        live = {k: v for k, v in r.headers.items()}
    check_headers(live, "production /")
    if live.get("Content-Security-Policy") != want.get("Content-Security-Policy"):
        warnings.append("production CSP differs from site/_headers (deploy drift or edge rewrite)")
    ctx = ssl.create_default_context()
    with socket.create_connection((HOST, 443), timeout=30) as s, ctx.wrap_socket(s, server_hostname=HOST) as t:
        not_after = datetime.strptime(t.getpeercert()["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    days = (not_after - datetime.now(timezone.utc)).days
    if days < 21:
        err(f"TLS certificate for {HOST} expires in {days} days ({not_after:%Y-%m-%d})")
    with urllib.request.urlopen(f"https://{HOST}/.well-known/security.txt", timeout=30) as r:
        check_security_txt(r.read().decode(), "production security.txt")
    print(f"live: headers ok={not errors}, TLS valid {days} more days")


def main():
    repo_checks()
    if "--live" in sys.argv:
        live_checks()
    for w in warnings:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    print(f"{'FAIL' if errors else 'PASS'}: {len(errors)} error(s), {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
