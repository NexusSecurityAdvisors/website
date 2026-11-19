# Changelog

Production changes to www.nexussecurityadvisors.com, newest first. Every merge to `main` deploys automatically (see [docs/RELEASE.md](docs/RELEASE.md)).

Add a line here in the same PR as the change. Format: what changed for visitors or operators, then the PR number.

## 2026-11-18

- Performance: PostHog and HubSpot now start after the page has loaded and the main thread is idle (3 s cap), so their scripts no longer compete with first paint (PageSpeed: unused, duplicated and legacy JavaScript, forced reflow). Page events queued before then are still sent. `tools/analytics.js` re-synced with the live file (it had drifted before #111).
- CSP: removed `style-src-attr 'unsafe-inline'` (back to `style-src 'self'` only). It was added in #118 for HubSpot's consent banner, which is now disabled: Europe gets cookieless analytics without HubSpot (#111), so no banner is shown anywhere.
- Privacy (infra#37): no cookie banner. Visitors in Europe (EU/EEA, UK, Switzerland, by browser time zone) get PostHog in cookieless mode, no HubSpot tracking code and no lead-source attribution storage; HubSpot/PostHog cookies left from earlier visits are cleared. Everyone else is unchanged. Footer "Cookie settings" (which reopened a banner that never existed) is now "Privacy choices", linking a new /trust#privacy-choices section with a button to turn analytics off in this browser; Global Privacy Control is honored. Trust page privacy notice updated to match.
- CSP: allow inline style attributes only (`style-src-attr 'unsafe-inline'`, enforced and Report-Only) so HubSpot's consent banner renders; it was blocked by #88's `style-src 'self'`. `<style>` elements and scripts stay strict, and site pages still may not use `style=` (check_site enforces it)
- Publications: added two November 2026 Forbes Technology Council Expert Panels that quote Dan (Nov 5 open-source dependency trust signals; Nov 10 outdated IAM assumptions); counts move from 75 to 77 (Forbes 63: 10 bylined, 53 Expert Panels).
- CMMC checklist: item CMMC-04 now cites DFARS 252.204-7021, DFARS 252.240-7997 (formerly 252.204-7019/7020, renumbered or removed by class deviation 2026-O0025 on Feb 1, 2026) and the 32 CFR 170 affirmation; page data, `.docx`, `.xlsx` and `.pdf` updated, and the content-hashed checklists bundle renamed
- CMMC (Regulatory Watch): timeline now dates the Reform Task Force review close to September 2026 (report delivered about Sept 11, not yet public), not October
- Publications: added the Nov 13, 2026 Forbes article "The Bedside Is A New Attack Surface: Securing Medical Devices In The Age Of AI" to the About page's Latest on Forbes list (oldest item drops off) and to /publications; contribution counts move from 74 to 75 (Forbes 61: 10 bylined, 51 Expert Panels).
- CMMC: Regulatory Watch and the CMMC checklist now say the November 10, 2026 Phase 2 date passed with Phase 2 still suspended (no resumption date or final reform rule as of mid-November); added a NOV 10 timeline entry and two "what still applies" items (primes may still flow down Level 2 certification; voluntary C3PAO assessments remain available). Checklist `.docx`/`.pdf` intro and footers updated to match.
- Regulatory Watch (EU CRA): "What to do now" says to register on ENISA's Single Reporting Platform and rehearse the 24/72-hour process, since Article 14 reporting has applied since September 11, 2026; adds an ENISA source link.
- Analytics: intake form drop-off events `intake_started` (first field typed), `intake_blocked` (required, email, consent or Turnstile) and `intake_send_failed` (HTTP status and error code), so the Pulse can show viewed → started → sent → submitted. Existing event names unchanged; no form contents in event properties ([#78](https://github.com/NexusSecurityAdvisors/website/issues/78))
- Forms: Turnstile verification failures now log Cloudflare's error code (e.g. `invalid-input-secret`) in Functions logs ([#68](https://github.com/NexusSecurityAdvisors/website/pull/68))

## 2026-11-16

- Hosting: www is served by the Cloudflare Worker (`nexus-website`) instead of Pages, so the zone's TLS 1.3 minimum now applies to www. internet.nl on the Worker scored 100% (TLS cipher suites, cipher order and key-exchange hash fixed) (infra#8, infra#20)
- Operators: the site can also run as a Cloudflare Worker (`wrangler.jsonc`, `.github/workflows/deploy-worker.yml`), serving only stage.nexussecurityadvisors.com until cutover. www stays on Pages for now. This is the fix for TLS 1.2 still being offered on www, since Pages ignores the zone minimum TLS (infra#20)
- Headers: `Referrer-Policy: same-origin` (was `strict-origin-when-cross-origin`). Third parties we load from or link to (HubSpot, PostHog, Cloudflare, Thinkers360, outbound links) no longer receive our origin; on-site referrers are unchanged (infra#21)
- Secure Website checklist: new Step 4, "Verify": which free scanners to run and in what order, how to read and confirm findings (with common false positives), the traps that cost points (redirect headers, HSTS preload hops and permanence, includeSubDomains and forgotten hosts, TLS 1.3-only versus NIST's TLS 1.2 requirement, 0-RTT, inline styles, COEP, security.txt Canonical), and keeping results green. Every technical claim cites a primary source (IETF RFCs, NIST, OWASP, MDN, hstspreload.org, Mozilla, Cloudflare docs) in a sources panel with a review date; adds WebPage structured data and a printable two-page PDF with numbered sources, /nexus-website-scan-checklist.pdf
- CSP: `style-src` is now `'self'` only (enforced and Report-Only). All `<style>` blocks moved to content-hashed files under `/css/` (pages now share cached CSS instead of ~40 KB inline per page); `style=` attributes became classes in one `/css/inline-*.css`; the scripts that built `style=` markup now apply it via the CSSOM. `tools/externalise_styles.py` does the conversion and `tools/check_site.py` fails CI on any inline style
- Headers: `Cross-Origin-Embedder-Policy: credentialless` site-wide, except `/get-started` and `/readiness-check` (Turnstile's iframe sends no COEP); HSTS in `_headers` matches the edge (1 year, includeSubDomains, preload); the domain is submitted to the HSTS preload list
- Monitor: the daily live check ignores the per-request CSP nonce when comparing production with `_headers` (it warned on every run), and also compares COEP
- security.txt: second `Canonical` for the apex URL, since scanners fetch it via the apex redirect

## 2026-11-12

- DNS monitor: require the 2048-bit DKIM key (zoho2048) and stop failing on the 1024-bit key retired on 2026-11-06
- CSP (report-only): trial dropping `*.posthog.com` from script-src and narrowing connect-src to `us.posthog.com` now that PostHog loads through the `/r7` relay ([#59](https://github.com/NexusSecurityAdvisors/website/pull/59))
- Analytics: lead-funnel events for readiness-check starts, checklist downloads and clicks to Request a Call or the readiness check ([#82](https://github.com/NexusSecurityAdvisors/website/pull/82))
- Home: hero credential chips now link out (Veteran-owned to About, OWASP AI Exchange, Forbes Technology Council); dropped the "Led by Dan Sorensen" chip and the "Who We Are" section, which About already covers ([#76](https://github.com/NexusSecurityAdvisors/website/pull/76))
- Security contact: the Trust page disclosure section and SECURITY.md point to the dedicated security@nexussecurityadvisors.com mailbox (info@ stays as the second security.txt contact); security.txt lists en, es, pt and it as preferred languages ([#75](https://github.com/NexusSecurityAdvisors/website/pull/75))

## 2026-11-06

- Footer: "Cookie settings" link on every page reopens the consent banner so visitors can change or withdraw consent ([#67](https://github.com/NexusSecurityAdvisors/website/pull/67))
- Intake: Send no longer shows a "complete the security check" error while Cloudflare Turnstile is still running or retrying; it waits and submits automatically, with a clear message after 20 s or if the check fails to load ([#71](https://github.com/NexusSecurityAdvisors/website/pull/71))
- CSP: Report-Only policy now allows inline styles like the enforced one, so violation reports show real script problems instead of ~400 style reports a week ([#63](https://github.com/NexusSecurityAdvisors/website/pull/63))
- Intake: each Zoho lead's Description carries the visitor's PostHog ID (only when analytics is running for them), so a lead can be matched to its analytics session; privacy notice updated ([#62](https://github.com/NexusSecurityAdvisors/website/pull/62))
- Release runbook: squash-merge only, and a record of when signed commits on `main` were enforced (2026-11-06)

## 2026-11-05

- CSP: drop unused HubSpot ads pixel host; send report-only violations to PostHog CSP tracking ([#48](https://github.com/NexusSecurityAdvisors/website/pull/48))
- Accessibility: compact launcher no longer covers the hero; underlined inline links; keyboard-scrollable EU AI Act tables ([#47](https://github.com/NexusSecurityAdvisors/website/pull/47))
- Approach: 12-pillar Nexus CISO Framework mapped to NIST CSF 2.0, NIS2 and the CRA ([#46](https://github.com/NexusSecurityAdvisors/website/pull/46))
- Add CHANGELOG and release runbook (docs/RELEASE.md) ([#45](https://github.com/NexusSecurityAdvisors/website/pull/45))
- Home: stat matches the four services listed ([#42](https://github.com/NexusSecurityAdvisors/website/pull/42))
- Add separate AI agent onboarding and offboarding checklist PDFs ([#39](https://github.com/NexusSecurityAdvisors/website/pull/39))
- Home: animated board risk summary and Readiness Check demo ([#37](https://github.com/NexusSecurityAdvisors/website/pull/37))
- Homepage: use veteran-owned wording in credentials list ([#38](https://github.com/NexusSecurityAdvisors/website/pull/38))
- Readiness check: Cloudflare Turnstile with server-side siteverify ([#36](https://github.com/NexusSecurityAdvisors/website/pull/36))
- Design review (Dept 2): first-screen CTA, two-pillar hero, simpler nav ([#29](https://github.com/NexusSecurityAdvisors/website/pull/29))
- Accessibility: WCAG 2.2 AA fixes, read-aloud and free translation tools, accessible contact options ([#24](https://github.com/NexusSecurityAdvisors/website/pull/24))
- Readiness monitor: fail on WAF blocks; document custom-rule exemption; add Copilot instructions ([#30](https://github.com/NexusSecurityAdvisors/website/pull/30))
- Add auto-assign workflow for issues and PRs ([#32](https://github.com/NexusSecurityAdvisors/website/pull/32))
- Add AI Agent Onboarding & Offboarding checklist ([#33](https://github.com/NexusSecurityAdvisors/website/pull/33))
- Use veteran-owned wording outside government pages ([#31](https://github.com/NexusSecurityAdvisors/website/pull/31))

## 2026-11-03

- Add business policies page, Mission & Values, and UN SDG commitments ([#27](https://github.com/NexusSecurityAdvisors/website/pull/27))
- Resource Library: add FIRST incident response, CSIRT & information sh... ([#28](https://github.com/NexusSecurityAdvisors/website/pull/28))
- Regulatory Watch: rename to US State AI Laws, add official state sour... ([#26](https://github.com/NexusSecurityAdvisors/website/pull/26))
- Regulatory Watch: add US AI governance (federal policy, NIST AI RMF, state AI laws) ([#25](https://github.com/NexusSecurityAdvisors/website/pull/25))
- HSTS: max-age 1 year to match the Cloudflare zone setting ([#23](https://github.com/NexusSecurityAdvisors/website/pull/23))
- Security hardening: Risk Lab prototype-pollution guard; remove unused JS bundles ([#22](https://github.com/NexusSecurityAdvisors/website/pull/22))
- Add Publications page; update contribution totals (Forbes 60, Fast Company 14) ([#11](https://github.com/NexusSecurityAdvisors/website/pull/11))
- SEO/GEO: attribution, share image, structured data, AI crawler access ([#7](https://github.com/NexusSecurityAdvisors/website/pull/7))

## 2026-11-02

- Add synthetic monitors (DNS/email posture, Readiness API) and a daily org-wide CI digest ([#20](https://github.com/NexusSecurityAdvisors/website/pull/20))
- Repo hygiene: Python 3.14 pin, preview/rebuild docs, remove temporary live-export snapshot ([#1](https://github.com/NexusSecurityAdvisors/website/pull/1))
- Shorten long pages (fold guide sections, collapse Resource Library, phone spacing) ([#8](https://github.com/NexusSecurityAdvisors/website/pull/8))
- check_site: compare HTTP header names case-insensitively ([#19](https://github.com/NexusSecurityAdvisors/website/pull/19))
- check_site: send monitor User-Agent on security.txt fetch (fixes #15) ([#17](https://github.com/NexusSecurityAdvisors/website/pull/17))
- Bump the actions group with 2 updates ([#4](https://github.com/NexusSecurityAdvisors/website/pull/4))
- Add Amazon Author Page Links ([#16](https://github.com/NexusSecurityAdvisors/website/pull/16))
- Add Bluesky links for Nexus and Dan Sorensen ([#14](https://github.com/NexusSecurityAdvisors/website/pull/14))

## 2026-10-31

- Add free Security Readiness Check (lead-gen) with server-side Claude report ([#12](https://github.com/NexusSecurityAdvisors/website/pull/12))
- Replace dead Forbes Council profile link sitewide ([#10](https://github.com/NexusSecurityAdvisors/website/pull/10))
- Add Fast Company contribution count (12) to founder bio; fix Forbes/F... ([#9](https://github.com/NexusSecurityAdvisors/website/pull/9))
- Add Personal & Device Security resources (BYOD kit, device checklists, identity kit, tools) ([#5](https://github.com/NexusSecurityAdvisors/website/pull/5))
- CI and monitoring: site checks, Lighthouse, daily production monitor, CodeQL, zizmor ([#2](https://github.com/NexusSecurityAdvisors/website/pull/2))
- Cyber careers and challenges pages, VirusTotal links, remove faith co... ([#3](https://github.com/NexusSecurityAdvisors/website/pull/3))
