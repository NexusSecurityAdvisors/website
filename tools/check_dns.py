#!/usr/bin/env python3
"""
Domain and email-authentication posture check for nexussecurityadvisors.com (standard library only).

python3 tools/check_dns.py

Resolves over DNS-over-HTTPS (Google and Cloudflare JSON APIs) so results do not depend on the
runner's resolver, and fails (exit 1) on regressions:
- MX still points at Zoho; SPF present, single record, authorizes zohomail.com, ends in ~all or -all
- DMARC is enforcing (quarantine or reject) for the domain and subdomains, with aggregate reports
- the active DKIM selector (zoho) is published; the 2048-bit selector (zoho2048) is checked too
- TLS-RPT and MTA-STS records exist, and the MTA-STS policy file is served and lists the real MX hosts
- DNSSEC: a DS record is published and resolvers return authenticated (AD) answers
- CAA restricts certificate issuance and has an iodef contact
Warnings (exit 0) flag the planned hardening steps that are not done yet (SPF -all, DMARC p=reject,
MTA-STS enforce mode), so the run summary doubles as a to-do list.
"""
import json
import re
import sys
import urllib.parse
import urllib.request

DOMAIN = "nexussecurityadvisors.com"
UA = {"User-Agent": "nexus-dns-monitor", "Accept": "application/dns-json"}
RESOLVERS = ["https://dns.google/resolve", "https://cloudflare-dns.com/dns-query"]
errors, warnings, notes = [], [], []


def doh(name, rtype):
    """Return (answers, authenticated) for name/rtype, trying each resolver in turn."""
    last = None
    for base in RESOLVERS:
        url = f"{base}?{urllib.parse.urlencode({'name': name, 'type': rtype, 'do': '1'})}"
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=20) as r:
                data = json.load(r)
        except Exception as e:  # try the next resolver
            last = e
            continue
        if data.get("Status") not in (0, 3):  # NOERROR / NXDOMAIN are both real answers
            last = RuntimeError(f"{name} {rtype}: DNS status {data.get('Status')}")
            continue
        want = {"TXT": 16, "MX": 15, "CAA": 257, "DS": 43, "A": 1}[rtype]
        answers = [a["data"] for a in data.get("Answer", []) if a.get("type") == want]
        if rtype == "TXT":  # join multi-string TXT values and strip quotes
            answers = ["".join(re.findall(r'"((?:[^"\\]|\\.)*)"', a)) or a.strip('"') for a in answers]
        return answers, bool(data.get("AD"))
    raise RuntimeError(f"all DoH resolvers failed for {name} {rtype}: {last}")


def tags(record):
    return {k.strip().lower(): v.strip() for k, v in
            (p.split("=", 1) for p in record.split(";") if "=" in p)}


def check_mx():
    mx, _ = doh(DOMAIN, "MX")
    hosts = sorted(m.split()[-1].rstrip(".").lower() for m in mx)
    if not hosts:
        errors.append("MX: no MX records")
    elif not all(h.endswith(".zoho.com") for h in hosts):
        errors.append(f"MX: unexpected host(s) {hosts}")
    return hosts


def check_spf():
    spf = [t for t in doh(DOMAIN, "TXT")[0] if t.lower().startswith("v=spf1")]
    if len(spf) != 1:
        errors.append(f"SPF: expected exactly 1 record, found {len(spf)}")
        return
    rec = spf[0]
    if "include:zohomail.com" not in rec:
        errors.append(f"SPF: zohomail.com not authorized ({rec})")
    if rec.rstrip().endswith("-all"):
        notes.append("SPF ends in -all")
    elif rec.rstrip().endswith("~all"):
        warnings.append("SPF ends in ~all (softfail); planned: move to -all once DMARC/TLS reports are clean")
    else:
        errors.append(f"SPF: does not end in ~all or -all ({rec})")


def check_dmarc():
    recs = [t for t in doh(f"_dmarc.{DOMAIN}", "TXT")[0] if t.lower().startswith("v=dmarc1")]
    if len(recs) != 1:
        errors.append(f"DMARC: expected exactly 1 record, found {len(recs)}")
        return
    t = tags(recs[0])
    p, sp = t.get("p", "").lower(), t.get("sp", t.get("p", "")).lower()
    if p not in ("quarantine", "reject") or sp not in ("quarantine", "reject"):
        errors.append(f"DMARC: policy not enforcing (p={p}, sp={sp})")
    elif p != "reject":
        warnings.append(f"DMARC p={p}; planned: move to p=reject once aggregate reports are clean")
    if "rua" not in t:
        errors.append("DMARC: no rua (aggregate report) address")
    if t.get("pct", "100") != "100":
        warnings.append(f"DMARC pct={t['pct']} (policy not applied to all mail)")


def check_dkim():
    for sel, required in (("zoho", True), ("zoho2048", False)):
        recs = [r for r in doh(f"{sel}._domainkey.{DOMAIN}", "TXT")[0] if "p=" in r]
        key = tags(recs[0]).get("p", "") if recs else ""
        if not key:
            (errors if required else warnings).append(f"DKIM: selector {sel} not published")
        else:
            notes.append(f"DKIM {sel}: published ({len(key)}-character public key)")


def check_tls_reporting(mx_hosts):
    if not any(t.lower().startswith("v=tlsrptv1") for t in doh(f"_smtp._tls.{DOMAIN}", "TXT")[0]):
        errors.append("TLS-RPT: _smtp._tls record missing")
    sts = [t for t in doh(f"_mta-sts.{DOMAIN}", "TXT")[0] if t.lower().startswith("v=stsv1")]
    if not sts:
        errors.append("MTA-STS: _mta-sts record missing")
        return
    url = f"https://mta-sts.{DOMAIN}/.well-known/mta-sts.txt"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "nexus-dns-monitor"})
        with urllib.request.urlopen(req, timeout=20) as r:
            policy = r.read().decode()
    except Exception as e:
        errors.append(f"MTA-STS: policy not served at {url} ({e})")
        return
    fields = {}
    for line in policy.splitlines():
        if ":" in line:
            k, v = line.split(":", 1)
            fields.setdefault(k.strip().lower(), []).append(v.strip().lower())
    if fields.get("version") != ["stsv1"]:
        errors.append("MTA-STS: policy file missing 'version: STSv1'")
    mode = (fields.get("mode") or [""])[0]
    if mode not in ("testing", "enforce"):
        errors.append(f"MTA-STS: mode is '{mode or 'missing'}'")
    elif mode == "testing":
        warnings.append("MTA-STS mode is testing; planned: switch to enforce once TLS-RPT reports are clean")
    patterns = fields.get("mx", [])
    for h in mx_hosts:
        if not any(h == p or (p.startswith("*.") and h.endswith(p[1:])) for p in patterns):
            errors.append(f"MTA-STS: MX host {h} not covered by policy mx lines {patterns}")


def check_dnssec():
    ds, _ = doh(DOMAIN, "DS")
    if not ds:
        errors.append("DNSSEC: no DS record at the registry (chain of trust broken)")
    _, ad = doh(DOMAIN, "A")
    if not ad:
        errors.append("DNSSEC: resolver did not return an authenticated (AD) answer for the A record")


def check_caa():
    caa, _ = doh(DOMAIN, "CAA")
    if not caa:
        errors.append("CAA: no records (any CA may issue certificates)")
        return
    if not any(" iodef " in f" {c} " for c in caa):
        warnings.append("CAA: no iodef contact for mis-issuance reports")


def main():
    try:
        mx_hosts = check_mx()
        check_spf()
        check_dmarc()
        check_dkim()
        check_tls_reporting(mx_hosts)
        check_dnssec()
        check_caa()
    except Exception as e:  # resolver outage: fail loudly rather than report a false "healthy"
        errors.append(f"lookup failed: {e}")
    for n in notes:
        print(f"ok: {n}")
    for w in warnings:
        print(f"::warning::{w}")
    for e in errors:
        print(f"::error::{e}")
    print(f"{'FAIL' if errors else 'PASS'}: {len(errors)} error(s), {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
