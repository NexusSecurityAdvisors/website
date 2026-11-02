#!/usr/bin/env python3
"""
Synthetic end-to-end check of the Readiness Check API on production (standard library only).

python3 tools/check_readiness.py [--base https://www.nexussecurityadvisors.com]

Exercises the deployed Pages Function at /api/readiness without creating a lead, calling Claude
or spending a rate-limit slot: every probe is rejected or short-circuited before those steps.
- GET /readiness-check serves the page and its client script
- GET /api/readiness            -> 405 with Allow: POST
- POST from a foreign Origin    -> 403 forbidden
- POST with the wrong type      -> 415
- POST an unknown track         -> 400 invalid/track
- POST a complete submission with the honeypot field set -> 200 with a deterministic score and a
  rules-based report. This is the bot path, so it never reaches the rate limiter, Claude or Zoho,
  yet it proves the question bank loads and server-side scoring works on the live deployment.
"""
import json
import sys
import urllib.error
import urllib.request
from pathlib import Path

BASE = sys.argv[sys.argv.index("--base") + 1] if "--base" in sys.argv else "https://www.nexussecurityadvisors.com"
BANK = json.loads((Path(__file__).resolve().parents[1] / "site" / "readiness-bank.json").read_text())
UA = "nexus-readiness-monitor"
errors = []


def call(method, path, body=None, headers=None):
    h = {"User-Agent": UA, **(headers or {})}
    data = body.encode() if isinstance(body, str) else body
    req = urllib.request.Request(BASE + path, data=data, method=method, headers=h)
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, dict(r.headers), r.read().decode()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read().decode(errors="replace")


def expect(name, got, want_status, want_error=None):
    status, _, text = got
    try:
        payload = json.loads(text)
    except ValueError:
        payload = {}
    ok = status == want_status and (want_error is None or payload.get("error") == want_error)
    print(f"{'ok  ' if ok else 'FAIL'} {name}: HTTP {status} {text[:120]!r}")
    if not ok:
        errors.append(f"{name}: expected HTTP {want_status}{' ' + want_error if want_error else ''}, got {status}")
    return payload


def main():
    page = call("GET", "/readiness-check")
    if page[0] != 200 or "readiness-check.js" not in page[2]:
        errors.append(f"/readiness-check page: HTTP {page[0]} or client script missing")
    print(f"{'ok  ' if page[0] == 200 else 'FAIL'} page /readiness-check: HTTP {page[0]}")
    js = call("GET", "/js/readiness-check.js")
    if js[0] != 200:
        errors.append(f"/js/readiness-check.js: HTTP {js[0]}")

    status, headers, _ = call("GET", "/api/readiness")
    allow = {k.lower(): v for k, v in headers.items()}.get("allow", "")
    print(f"{'ok  ' if status == 405 and 'POST' in allow else 'FAIL'} GET /api/readiness: HTTP {status} allow={allow!r}")
    if status != 405 or "POST" not in allow:
        errors.append(f"GET /api/readiness: expected 405 with Allow: POST, got {status} {allow!r}")

    origin = {"Origin": BASE, "Content-Type": "application/json"}
    expect("foreign origin", call("POST", "/api/readiness", "{}",
           {"Origin": "https://evil.example", "Content-Type": "application/json"}), 403, "forbidden")
    expect("wrong content type", call("POST", "/api/readiness", "x=1",
           {"Origin": BASE, "Content-Type": "application/x-www-form-urlencoded"}), 415)
    expect("unknown track", call("POST", "/api/readiness", json.dumps({"track": "__synthetic__"}), origin),
           400, "invalid")

    track_id, track = next(iter(BANK["tracks"].items()))
    answer = next(iter(BANK["answers"]))
    submission = {
        "track": track_id,
        "answers": {q["id"]: answer for q in track["questions"]},
        "contact": {"name": "Synthetic Monitor", "email": "monitor@example.invalid", "company": "Nexus synthetic check"},
        "consent": True,
        "hp": "synthetic-monitor",  # honeypot: the API treats this as a bot and never stores or forwards it
        "elapsed": 60000,
    }
    result = expect("scored submission (honeypot path)", call("POST", "/api/readiness", json.dumps(submission), origin), 200)
    if result and (result.get("source") != "rules" or not result.get("report")):
        errors.append(f"scored submission: expected a rules-based report, got keys {sorted(result)}")

    print(f"{'FAIL' if errors else 'PASS'}: {len(errors)} error(s)")
    for e in errors:
        print(f"::error::{e}")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
