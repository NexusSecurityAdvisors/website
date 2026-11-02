#!/usr/bin/env python3
"""
Daily CI digest for the NexusSecurityAdvisors organization (standard library only).

GH_TOKEN=... python3 tools/ci_digest.py [--hours 24] > digest.md

Lists every workflow + branch whose most recent run in the window failed, across all org
repositories the token can see. A failure that a later run on the same workflow and branch already
fixed is left out, so the digest only shows what is still red. Exit code: 0 = all green, 1 = failures.

Token: a fine-grained personal access token (resource owner NexusSecurityAdvisors, all repositories,
permissions Actions: read and Metadata: read) stored as the CI_DIGEST_TOKEN secret. Without it the
workflow falls back to its own GITHUB_TOKEN, which can only see public repositories.
"""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone

ORG = os.environ.get("ORG", "NexusSecurityAdvisors")
HOURS = int(sys.argv[sys.argv.index("--hours") + 1]) if "--hours" in sys.argv else 24
TOKEN = os.environ.get("GH_TOKEN", "")
RED = {"failure", "timed_out", "startup_failure"}


def api(path, params=None):
    items, url = [], f"https://api.github.com{path}?{urllib.parse.urlencode({**(params or {}), 'per_page': 100})}"
    while url:
        req = urllib.request.Request(url, headers={
            "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "nexus-ci-digest", **({"Authorization": f"Bearer {TOKEN}"} if TOKEN else {})})
        with urllib.request.urlopen(req, timeout=30) as r:
            data = json.load(r)
            link = r.headers.get("Link", "")
        items += data if isinstance(data, list) else data.get("workflow_runs", [])
        url = next((p.split(";")[0].strip("<> ") for p in link.split(",") if 'rel="next"' in p), None)
    return items


def main():
    since = datetime.now(timezone.utc) - timedelta(hours=HOURS)
    repos = [r for r in api(f"/orgs/{ORG}/repos", {"type": "all", "sort": "pushed"}) if not r.get("archived")]
    red, scanned = [], 0
    for repo in repos:
        try:
            runs = api(f"/repos/{repo['full_name']}/actions/runs",
                       {"created": f">={since:%Y-%m-%dT%H:%M:%SZ}", "exclude_pull_requests": "false"})
        except urllib.error.HTTPError as e:
            if e.code in (403, 404):  # Actions disabled or not visible to this token
                continue
            raise
        scanned += 1
        latest = {}
        for run in runs:
            if run.get("status") != "completed":
                continue
            key = (run["workflow_id"], run.get("head_branch"))
            if key not in latest or run["created_at"] > latest[key]["created_at"]:
                latest[key] = run
        red += [(repo["name"], r) for r in latest.values() if r.get("conclusion") in RED]

    print(f"## CI digest: {datetime.now(timezone.utc):%Y-%m-%d} (last {HOURS}h, {scanned} repositories scanned)\n")
    if not TOKEN or os.environ.get("TOKEN_KIND") == "fallback":
        print("_Using the workflow token: private repositories are not included. Add a CI_DIGEST_TOKEN secret to cover them._\n")
    if not red:
        print("All workflows green.")
        return 0
    print(f"{len(red)} workflow(s) still failing:\n")
    print("| Repository | Workflow | Branch | Trigger | When (UTC) |")
    print("|---|---|---|---|---|")
    for name, r in sorted(red, key=lambda x: (x[0], x[1]["name"])):
        when = r["created_at"].replace("T", " ").rstrip("Z")[:16]
        print(f"| {name} | [{r['name']} #{r['run_number']}]({r['html_url']}) | `{r.get('head_branch') or '-'}` | {r['event']} | {when} |")
    return 1


if __name__ == "__main__":
    sys.exit(main())
