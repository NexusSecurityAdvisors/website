# nexussecurityadvisors.com

Static site for Nexus Security Advisors, deployed on **Cloudflare Pages**.

- `site/` – the deployed website (Cloudflare Pages build output directory). Pretty URLs: `/services` serves `services.html`.
- `site/_headers` – security headers (CSP, HSTS, frame, referrer, permissions policies).
- `site/_redirects` – legacy URL redirects.
- `tools/build.py` – rebuilds `site/` from the original Zoho Sites exports in `zoho-export/`.
- `zoho-export/` – original page snippets and assets exported from Zoho Sites (Oct 2026), kept for reference.
- `.python-version` – Python used for the `tools/` scripts (3.14, the same version as the org's other repos).

Every push to `main` deploys automatically. No build step is required on Cloudflare: framework preset **None**, build command empty, output directory `site`.

## Local preview and rebuild

```bash
python3 tools/serve.py site                      # preview with the production CSP at http://127.0.0.1:8088
python3 tools/build.py zoho-export site          # rebuild site/ from the Zoho exports (standard library only)
```

Both scripts need only the Python standard library. Use the version in `.python-version`.

> Note: `build.py` does not produce `site/nexus-favicon-512.webp` (it was added to `site/` directly). Restore it after a rebuild, or add it to `zoho-export/assets/`.

Security contact: see `/.well-known/security.txt` or https://www.nexussecurityadvisors.com/trust#disclosure

## Readiness Check (lead-gen tool)

`/readiness-check` is an interactive 8-question self-assessment (CMMC/800-171, HIPAA, SOC 2, cyber insurance, AI governance). It produces an instant score and top-3 priorities, creates a Lead in Zoho CRM (Lead Source "Readiness Check"), and pre-fills `/get-started` for the follow-up call.

- `site/readiness-check.html`, `site/js/readiness-check.js`: page and client logic (CSP-compliant, no inline script).
- `site/readiness-bank.json`: question bank used by both the page and the API.
- `functions/api/readiness.js`: Cloudflare Pages Function at `POST /api/readiness`. Validates input, blocks bots (honeypot, minimum fill time, and server-verified Turnstile), rate-limits (5 per IP per hour, 3 per email per day), scores server-side, optionally writes the summary with Claude Haiku, and posts the lead to Zoho Web-to-Lead server-side.

The Anthropic API key exists only as a Cloudflare secret. The browser never sees it. Without a key, the tool still works with the built-in report.

### Cloudflare setup (Pages project > Settings)
1. **Bindings > KV namespace**: create a namespace `nexus-readiness-rl`, then bind it as `RL` (Production and Preview).
2. **Variables and Secrets**: add `ANTHROPIC_API_KEY` as an encrypted secret (a key from the `website-leadgen` workspace in Claude Console) and `TURNSTILE_SECRET` as an encrypted secret from the existing Turnstile widget. Optional: `AI_DAILY_CAP` (default 150) and `TURNSTILE_HOSTNAMES` (comma-separated hostnames for this deployment; defaults to `www.nexussecurityadvisors.com,nexussecurityadvisors.com`). Keep production hostnames exact and never include `localhost` or `127.0.0.1` in a production value.
3. **Edge rules (WAF, rate limiting, URL normalization)**: the custom WAF rules must let `POST` through to `www` on `/api/readiness`, `/api/intake`, `/csp-report` and the analytics relay under `/r7/`, or submissions get Cloudflare's "Sorry, you have been blocked" page and analytics stops. The exact rules and settings are documented in the private `NexusSecurityAdvisors/infra` repo, where a daily drift check compares the live zone with a reviewed baseline. Change them there, not here.
4. Optional: in Zoho CRM, add "Readiness Check" to the Lead Source picklist so leads are tagged cleanly.

### Local test
`npx wrangler pages dev site --kv RL --binding LEAD_SINK=off`. `LEAD_SINK=off` skips the Zoho POST so tests don't create real leads.

## Consultation intake (/get-started)

The 5-step intake no longer posts from the browser straight to Zoho. It sends JSON to `functions/api/intake.js` (`POST /api/intake`), which:

- checks origin and size, and forwards only an allowlist of Zoho fields (the client cannot override form tokens, Lead Source, or add fields)
- requires consent, drops honeypot and too-fast (<8s) submissions with a fake success
- appends the visitor's PostHog anonymous ID (if PostHog loaded and they did not opt out) to the lead Description as `PostHog ID: …`, the join key between a Zoho lead and its analytics session. Web-to-Lead accepts only fields on the Zoho web form, so move it to a dedicated field once one is added there
- verifies Cloudflare Turnstile server-side (action `intake`, same widget and `TURNSTILE_SECRET` as the Readiness Check)
- rate-limits per IP (5/hour) and per email (3/day) in the `RL` KV namespace, failing open if the binding is missing
- posts the lead to Zoho Web-to-Lead and only reports success to the visitor if Zoho accepted it

`/api/intake` is already in the WAF exception above. Local test: `npx wrangler pages dev site --kv RL --binding LEAD_SINK=off`.

## Analytics (PostHog)

- `site/js/analytics.js` (source copy: `tools/analytics.js`) loads PostHog through the first-party relay `functions/r7/[[path]].js` (`/r7/*` to PostHog US Cloud), based on [PostHog's Cloudflare proxy](https://posthog.com/docs/advanced/proxy/cloudflare). The relay forwards only to PostHog's two hosts and only for an allowlist of SDK endpoints (anything else returns 404). It rebuilds request headers from an allowlist, so cookies and Authorization (including `phx_` personal API keys) never reach PostHog, caps bodies at 2 MB, and strips `Set-Cookie` from responses. If PostHog adds an SDK endpoint, add it to `API_ROUTES` or those calls will 404. It needs the `/r7/` exception in the edge rules above.
- Page scripts send custom events with `(window.__nsaq = window.__nsaq || []).push([name, props])`, never `posthog.capture` directly: they run before the deferred analytics.js, and the queue is flushed once PostHog initialises. Current events: `intake_step_viewed`, `intake_submitted`, `readiness_check_completed`. Never put form contents or contact details in event properties.
- Your own visits: open any page once with `?internal=1` in each browser you use. PostHog's default filter then excludes it. `?internal=0` removes the tag.
- PostHog honours Do Not Track. Project-side settings (IP discarding, replay masking, the test-account filter) live in PostHog, not in this repo.

