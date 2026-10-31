# nexussecurityadvisors.com

Static site for Nexus Security Advisors, deployed on **Cloudflare Pages**.

- `site/` – the deployed website (Cloudflare Pages build output directory). Pretty URLs: `/services` serves `services.html`.
- `site/_headers` – security headers (CSP, HSTS, frame, referrer, permissions policies).
- `site/_redirects` – legacy URL redirects.
- `tools/build.py` – rebuilds `site/` from the original Zoho Sites exports in `zoho-export/`.
- `zoho-export/` – original page snippets and assets exported from Zoho Sites (Oct 2026), kept for reference.

Every push to `main` deploys automatically. No build step is required on Cloudflare: framework preset **None**, build command empty, output directory `site`.

Security contact: see `/.well-known/security.txt` or https://www.nexussecurityadvisors.com/trust#disclosure

## Readiness Check (lead-gen tool)

`/readiness-check` is an interactive 8-question self-assessment (CMMC/800-171, HIPAA, SOC 2, cyber insurance, AI governance). It produces an instant score and top-3 priorities, creates a Lead in Zoho CRM (Lead Source "Readiness Check"), and pre-fills `/get-started` for the follow-up call.

- `site/readiness-check.html`, `site/js/readiness-check.js`: page and client logic (CSP-compliant, no inline script).
- `site/readiness-bank.json`: question bank used by both the page and the API.
- `functions/api/readiness.js`: Cloudflare Pages Function at `POST /api/readiness`. Validates input, blocks bots (honeypot and minimum fill time), rate-limits (5 per IP per hour, 3 per email per day), scores server-side, optionally writes the summary with Claude Haiku, and posts the lead to Zoho Web-to-Lead server-side.

The Anthropic API key exists only as a Cloudflare secret. The browser never sees it. Without a key, the tool still works with the built-in report.

### Cloudflare setup (Pages project > Settings)
1. **Bindings > KV namespace**: create a namespace `nexus-readiness-rl`, then bind it as `RL` (Production and Preview).
2. **Variables and Secrets**: add `ANTHROPIC_API_KEY` as an encrypted secret (a key from the `website-leadgen` workspace in Claude Console). Optional: `AI_DAILY_CAP` (default 150).
3. **Security > WAF > Rate limiting rule** (included on the free plan): if URI Path equals `/api/readiness`, allow 10 requests per 1 minute per IP, then Block. This is an edge layer in front of the KV limits.
4. Optional: in Zoho CRM, add "Readiness Check" to the Lead Source picklist so leads are tagged cleanly.

### Local test
`npx wrangler pages dev site --kv RL --binding LEAD_SINK=off`. `LEAD_SINK=off` skips the Zoho POST so tests don't create real leads.
