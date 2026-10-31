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
