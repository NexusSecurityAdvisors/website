# nexussecurityadvisors.com

Static site for Nexus Security Advisors, deployed on **Cloudflare Pages**.

- `site/` – the deployed website (Cloudflare Pages build output directory). Pretty URLs: `/services` serves `services.html`.
- `site/_headers` – security headers (CSP, HSTS, frame, referrer, permissions policies).
- `site/_redirects` – legacy URL redirects.
- `tools/build.py` – rebuilds `site/` from the original Zoho Sites exports in `zoho-export/`.
- `zoho-export/` – original page snippets and assets exported from Zoho Sites (Oct 2026), kept for reference.

Every push to `main` deploys automatically. No build step is required on Cloudflare: framework preset **None**, build command empty, output directory `site`.

Security contact: see `/.well-known/security.txt` or https://www.nexussecurityadvisors.com/trust#disclosure
