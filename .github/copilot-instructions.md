# Copilot instructions for nexussecurityadvisors.com

Static marketing and lead-generation site for Nexus Security Advisors (vCISO, compliance and AI
governance consulting), deployed on Cloudflare Pages. Every merge to `main` deploys `site/` as-is.
There is no build step on Cloudflare and no package manager in the repo.

## Source of truth: edit `site/` directly

- `site/` is the deployed site **and** the source. Pages are hand-maintained HTML; pretty URLs map
  `/services` to `site/services.html`.
- **Do not run `tools/build.py`.** It deletes `site/` (`shutil.rmtree`) and regenerates only the
  12 pages that came from the original Zoho export. About 14 pages added since then (policies,
  publications, readiness-check, regulatory-watch, tabletop, personal-security and others), every
  PDF/DOCX/XLSX download, `readiness-bank.json` and most of `site/js/` would be lost.
  `zoho-export/` is a historical reference (Oct 2026), not a source.
- When adding or renaming a page, update in the same change: `site/sitemap.xml`, `site/llms.txt`,
  nav/footer links where relevant, and `site/_redirects` for any old URL.

## Security constraints (CI enforces these; do not weaken them)

- CSP in `site/_headers` is strict: `script-src 'self'` plus the analytics hosts already listed
  (Cloudflare Insights, PostHog, HubSpot), no `'unsafe-inline'` or `'unsafe-eval'` for scripts,
  `frame-ancestors 'none'`. Put all JavaScript in `site/js/*.js`; no inline `<script>` blocks
  (JSON-LD data blocks are allowed) and no `on*=` handler attributes. Inline styles are allowed.
- Do not add third-party scripts, fonts or iframes, or new CSP hosts, without a stated reason in
  the PR. Fonts are self-hosted `.woff2` in `site/`.
- `site/_headers`, `.github/` and `site/.well-known/security.txt` are owned by @DanPazlev
  (CODEOWNERS). Keep `security.txt` RFC 9116 compliant and re-date it before `Expires`.
- Workflows: start from `permissions: {}`, grant per job, pin every action to a full commit SHA
  with a version comment, `persist-credentials: false` on checkout. zizmor audits `.github/`.
- Never commit secrets. `ANTHROPIC_API_KEY` exists only as a Cloudflare Pages secret.
- `main` is protected: work on a branch and open a pull request.

## Readiness Check (lead-gen tool)

- Keep these aligned: `site/readiness-check.html`, `site/js/readiness-check.js`,
  `site/readiness-bank.json` (shared by page and API) and `functions/api/readiness.js`.
- The Pages Function validates input, rejects foreign origins, uses a honeypot and minimum fill
  time, rate-limits via the KV binding `RL`, scores server-side, optionally calls Claude through
  tool use for the summary, and posts the lead to Zoho Web-to-Lead server-side. Treat visitor
  fields as untrusted data, including inside the Claude prompt.
- The Cloudflare custom rule "Static site: allow only GET/HEAD/OPTIONS" must exempt POSTs to
  `/api/readiness` (and `/csp-report`). If a new endpoint needs POST, say so in the PR: the rule
  is configured in the Cloudflare dashboard, not in this repo.
- Local test without creating real leads:
  `npx wrangler pages dev site --kv RL --binding LEAD_SINK=off`

## Commands

Python tools use the standard library only; version in `.python-version` (3.14).

```bash
python3 tools/serve.py site              # preview with the production CSP, http://127.0.0.1:8088
python3 tools/check_site.py              # what CI runs: headers, CSP, inline scripts, links, sitemap, security.txt
python3 tools/check_site.py --live       # plus the production site
python3 tools/check_readiness.py         # Readiness API probes (no lead, no Claude call)
python3 tools/check_readiness.py --base http://localhost:8788 --local   # against wrangler pages dev
python3 tools/check_dns.py               # DNS and email-authentication posture
npx -y @lhci/cli@0.15.1 autorun          # Lighthouse; accessibility and SEO must stay >= 90
```

There are no unit tests. Run `tools/check_site.py` before proposing any change to `site/`.

## Writing style for site copy

Plain, calm, practical English for small and mid-sized business owners. No fear-based selling, no
promises of compliance or certification, and explain jargon on first use. Credit third-party
sources by name (for example FIRST, NIST, CISA) and link to the official source.

## More detail

`README.md` (setup, Cloudflare configuration) · `docs/OPERATIONS.md` (CI, monitors, routine
reminders) · `SECURITY.md` (vulnerability reporting).
