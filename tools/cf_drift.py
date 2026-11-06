#!/usr/bin/env python3
"""Cloudflare configuration drift check for nexussecurityadvisors.com.

Takes a read-only snapshot of the zone's security-relevant configuration through the Cloudflare
API, normalises it (volatile fields such as timestamps and versions are dropped, lists are sorted),
and compares it with the committed baseline in tools/cloudflare-baseline.json.

Exit codes: 0 = matches the baseline (or no baseline yet), 1 = drift found, 2 = API or usage error.

Environment:
  CLOUDFLARE_API_TOKEN  read-only Account API token "gha-ci-config-check" (Zone, DNS, Zone Settings,
                        Firewall Services, Zone WAF, SSL and Certificates, Dynamic URL Redirects: Read)
  CF_ZONE_ID            zone ID of nexussecurityadvisors.com

Usage:
  python tools/cf_drift.py --snapshot out.json          write the current snapshot only
  python tools/cf_drift.py --snapshot out.json --check  also compare with the baseline

To accept an intended change: run the workflow, download the "cloudflare-snapshot" artifact, review
it, and commit it over tools/cloudflare-baseline.json in a PR.
"""
import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

API = "https://api.cloudflare.com/client/v4"
BASELINE = Path(__file__).with_name("cloudflare-baseline.json")

# Ruleset phases whose entrypoints matter for security posture.
PHASES = [
    "http_request_firewall_custom",    # custom WAF rules
    "http_ratelimit",                  # rate limiting
    "http_request_firewall_managed",   # managed WAF rulesets
    "http_request_dynamic_redirect",   # single redirects (apex -> www)
]
# Zone settings that are security-relevant; anything else is ignored to keep noise down.
SETTINGS = {
    "always_use_https", "automatic_https_rewrites", "min_tls_version", "tls_1_3", "ssl",
    "security_header", "opportunistic_encryption", "hotlink_protection", "email_obfuscation",
    "browser_check", "security_level", "challenge_ttl", "privacy_pass", "0rtt", "http3",
    "always_online", "server_side_exclude", "ip_geolocation", "websockets",
}
VOLATILE = {"last_updated", "modified_on", "created_on", "version", "meta", "editable", "logging",
            "comment_modified_on", "tags_modified_on"}


def get(path, token):
    req = urllib.request.Request(f"{API}{path}", headers={
        "Authorization": f"Bearer {token}",
        "Accept": "application/json",
        "User-Agent": "nexus-cf-drift-check",
    })
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None  # phase entrypoint not created yet
        body = e.read().decode("utf-8", "replace")[:300]
        raise SystemExit(f"error: GET {path} -> HTTP {e.code}: {body}")


def strip(obj):
    if isinstance(obj, dict):
        return {k: strip(v) for k, v in sorted(obj.items()) if k not in VOLATILE}
    if isinstance(obj, list):
        return [strip(v) for v in obj]
    return obj


def snapshot(token, zone):
    snap = {"rulesets": {}, "settings": {}, "dns": [], "dnssec": None}

    for phase in PHASES:
        data = get(f"/zones/{zone}/rulesets/phases/{phase}/entrypoint", token)
        rules = (data or {}).get("result", {}).get("rules", []) if data else []
        snap["rulesets"][phase] = [strip({k: r.get(k) for k in (
            "description", "expression", "action", "action_parameters", "enabled", "ratelimit")})
            for r in rules]  # rule order matters, so it is kept

    settings = get(f"/zones/{zone}/settings", token)["result"]
    for s in settings:
        if s["id"] in SETTINGS:
            snap["settings"][s["id"]] = strip(s.get("value"))

    page, records = 1, []
    while True:
        data = get(f"/zones/{zone}/dns_records?per_page=100&page={page}", token)
        records += data["result"]
        if page >= data["result_info"]["total_pages"]:
            break
        page += 1
    snap["dns"] = sorted(
        ({k: r.get(k) for k in ("type", "name", "content", "proxied", "ttl", "priority") if r.get(k) is not None}
         for r in records),
        key=lambda r: (r["type"], r["name"], str(r.get("content"))),
    )

    dnssec = get(f"/zones/{zone}/dnssec", token)
    snap["dnssec"] = (dnssec or {}).get("result", {}).get("status")
    return snap


def diff(old, new, path=""):
    out = []
    if isinstance(old, dict) and isinstance(new, dict):
        for k in sorted(set(old) | set(new)):
            p = f"{path}.{k}" if path else k
            if k not in old:
                out.append(f"+ {p}: {json.dumps(new[k])[:300]}")
            elif k not in new:
                out.append(f"- {p}: {json.dumps(old[k])[:300]}")
            else:
                out += diff(old[k], new[k], p)
    elif isinstance(old, list) and isinstance(new, list):
        for i in range(max(len(old), len(new))):
            p = f"{path}[{i}]"
            if i >= len(old):
                out.append(f"+ {p}: {json.dumps(new[i])[:300]}")
            elif i >= len(new):
                out.append(f"- {p}: {json.dumps(old[i])[:300]}")
            else:
                out += diff(old[i], new[i], p)
    elif old != new:
        out.append(f"~ {path}: {json.dumps(old)[:200]} -> {json.dumps(new)[:200]}")
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--snapshot", required=True, help="where to write the current snapshot")
    ap.add_argument("--check", action="store_true", help="compare with tools/cloudflare-baseline.json")
    args = ap.parse_args()

    token, zone = os.environ.get("CLOUDFLARE_API_TOKEN"), os.environ.get("CF_ZONE_ID")
    if not token or not zone:
        print("error: CLOUDFLARE_API_TOKEN and CF_ZONE_ID must be set", file=sys.stderr)
        return 2

    snap = snapshot(token, zone)
    Path(args.snapshot).write_text(json.dumps(snap, indent=2, sort_keys=True) + "\n")
    if not args.check:
        return 0
    if not BASELINE.exists():
        print("::warning::No baseline committed yet. Review the cloudflare-snapshot artifact and "
              "commit it as tools/cloudflare-baseline.json.")
        return 0

    changes = diff(json.loads(BASELINE.read_text()), snap)
    if not changes:
        print("No drift: Cloudflare configuration matches the committed baseline.")
        return 0
    print(f"::error::Cloudflare configuration drift: {len(changes)} change(s) from the baseline.")
    for line in changes:
        print(line)
    return 1


if __name__ == "__main__":
    sys.exit(main())
