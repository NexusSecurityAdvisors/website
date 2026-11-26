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
  - no <style> blocks or style= attributes in pages, and no style="..." markup built in site/js
    (style-src is 'self'; use a class, or data-css + el.style.cssText; tools/externalise_styles.py converts pages).
    The one exception is a <style data-critical> block from tools/critical/critical_css.mjs, and only
    when its SHA-256 is in style-src of that page's generated _headers rule (the global rule for 404),
    and that rule matches the global CSP apart from the hash
  - no _headers line is over 2,000 characters (Cloudflare rejects the deploy)
Live checks (--live)
  - production responses carry the same security headers as site/_headers
  - TLS certificate is valid for at least 21 more days
  - /.well-known/security.txt is served and not expiring soon
"""
import base64
import hashlib
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
MIN_HSTS = 31536000  # 1 year: the hstspreload.org minimum (the zone is submitted for preload)
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
            out[k.strip().lower()] = v.strip()
    return out


def check_headers(h, where):
    for name in REQUIRED_HEADERS:
        if name.lower() not in h:
            err(f"{where}: missing {name}")
    csp = h.get("content-security-policy", "")
    if "'unsafe-eval'" in csp:
        err(f"{where}: CSP allows 'unsafe-eval'")
    script_src = re.search(r"script-src ([^;]+)", csp)
    if script_src and ("'unsafe-inline'" in script_src.group(1) or " * " in f" {script_src.group(1)} "):
        err(f"{where}: script-src is not strict ({script_src.group(1)[:80]})")
    for d in ("frame-ancestors 'none'", "object-src 'none'", "default-src 'none'"):
        if d not in csp:
            err(f"{where}: CSP missing {d}")
    if "base-uri 'none'" not in csp and "base-uri 'self'" not in csp:
        err(f"{where}: CSP missing base-uri 'none' (or 'self')")
    style_src = re.search(r"style-src ([^;]+)", csp)
    if not style_src or "'unsafe-inline'" in style_src.group(1):
        err(f"{where}: style-src missing or allows 'unsafe-inline'")
    hsts = h.get("strict-transport-security", "")
    m = re.search(r"max-age=(\d+)", hsts)
    if not m or int(m.group(1)) < MIN_HSTS:
        err(f"{where}: HSTS max-age below {MIN_HSTS // 86400} days")
    for d in ("includesubdomains", "preload"):
        if d not in hsts.lower():
            err(f"{where}: HSTS missing {d} (the domain is on the preload list)")


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
    headers_text = (SITE / "_headers").read_text(encoding="utf-8")
    for n, line in enumerate(headers_text.splitlines(), 1):
        if len(line) > 2000:
            err(f"_headers line {n}: {len(line)} characters (Cloudflare rejects lines over 2000)")
    # Cloudflare Pages allows at most 100 header rules per _headers file; fail with headroom to spare.
    rule_lines = [l for l in headers_text.splitlines() if l and not l[0].isspace() and not l.startswith("#")]
    if len(rule_lines) > 90:
        err(f"_headers has {len(rule_lines)} header rules (Cloudflare allows 100; keep 90 or fewer)")
    # path -> {header: value} for rules in _headers (global "/*" included)
    RULES, cur = {}, None
    for line in headers_text.splitlines():
        if line and not line[0].isspace() and not line.startswith("#"):
            cur = RULES.setdefault(line.strip(), {})
        elif cur is not None and ":" in line and not line.strip().startswith(("!", "#")):
            k, v = line.strip().split(":", 1)
            cur[k.strip()] = v.strip()
    def drop_hashes(v):
        return re.sub(r" 'sha256-[A-Za-z0-9+/=]+'", "", v)
    for path, hdrs in RULES.items():
        for name in ("Content-Security-Policy", "Content-Security-Policy-Report-Only"):
            if path != "/*" and name in hdrs and drop_hashes(hdrs[name]) != drop_hashes(RULES["/*"].get(name, "")):
                err(f"_headers {path}: {name} differs from the global rule (re-run node tools/critical/critical_css.mjs site)")
    files = {p.relative_to(SITE).as_posix() for p in SITE.rglob("*") if p.is_file()}
    pages = sorted(SITE.glob("*.html"))
    for page in pages:
        html = page.read_text(encoding="utf-8")
        if re.search(r"<script\b(?![^>]*\bsrc\s*=)(?![^>]*application/ld\+json)[^>]*>\s*\S", html, re.IGNORECASE):
            err(f"{page.name}: inline <script> found (CSP expects external scripts)")
        for m in re.finditer(r"<style\b([^>]*)>(.*?)</style>", html, re.IGNORECASE | re.S):
            if m.group(1).strip() != "data-critical":
                err(f"{page.name}: <style> block found (style-src is 'self'; run tools/externalise_styles.py site)")
                continue
            digest = "'sha256-" + base64.b64encode(hashlib.sha256(m.group(2).encode("utf-8")).digest()).decode() + "'"
            url = "/" if page.name == "index.html" else "/" + page.name[:-5]
            rule = RULES.get(url) if url != "/404" else RULES.get("/*")
            if not rule or any(digest not in rule.get(n, "") for n in ("Content-Security-Policy", "Content-Security-Policy-Report-Only")):
                err(f"{page.name}: critical CSS hash missing from its _headers CSP (run node tools/critical/critical_css.mjs site)")
        if re.search(r"<[a-zA-Z][^>]*\sstyle\s*=", html):
            err(f"{page.name}: style= attribute found (style-src is 'self'; run tools/externalise_styles.py site)")
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
    for js in sorted((SITE / "js").glob("*.js")):
        if re.search(r"\sstyle=\\?[\"']", js.read_text(encoding="utf-8")):
            err(f"js/{js.name}: builds style= markup (blocked by style-src 'self'; use data-css + el.style.cssText)")
    for problem in stamp_problems(SITE):
        err(f"{problem} (run tools/stamp_assets.py site)")
    check_headers(headers_file(), "site/_headers")
    check_security_txt((SITE / ".well-known" / "security.txt").read_text(), "site/.well-known/security.txt")


def stamp_problems(site):
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from stamp_assets import stamp
    return stamp(site, check=True)[0]


def live_checks():
    want = headers_file()
    req = urllib.request.Request(f"https://{HOST}/", headers={"User-Agent": "nexus-site-monitor"})
    with urllib.request.urlopen(req, timeout=30) as r:
        live = {k.lower(): v for k, v in r.headers.items()}  # HTTP header names are case-insensitive; Cloudflare Pages sends _headers rules in lowercase
    check_headers(live, "production /")
    # functions/_middleware.js adds a per-request 'nonce-…' to script-src; ignore it when comparing.
    strip_nonce = lambda csp: re.sub(r"'nonce-[^']*'\s*", "", csp or "")
    if strip_nonce(live.get("content-security-policy")) != strip_nonce(want.get("content-security-policy")):
        warnings.append("production CSP differs from site/_headers (deploy drift or edge rewrite)")
    if live.get("cross-origin-embedder-policy") != want.get("cross-origin-embedder-policy"):
        warnings.append("production COEP differs from site/_headers")
    ctx = ssl.create_default_context()
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2  # never negotiate TLS 1.0/1.1
    with socket.create_connection((HOST, 443), timeout=30) as s, ctx.wrap_socket(s, server_hostname=HOST) as t:
        not_after = datetime.strptime(t.getpeercert()["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
    days = (not_after - datetime.now(timezone.utc)).days
    if days < 21:
        err(f"TLS certificate for {HOST} expires in {days} days ({not_after:%Y-%m-%d})")
    req_txt = urllib.request.Request(f"https://{HOST}/.well-known/security.txt", headers={"User-Agent": "nexus-site-monitor"})
    with urllib.request.urlopen(req_txt, timeout=30) as r:
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
