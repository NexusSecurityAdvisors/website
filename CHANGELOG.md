# Changelog

Production changes to www.nexussecurityadvisors.com, newest first. Every merge to `main` deploys automatically (see [docs/RELEASE.md](docs/RELEASE.md)).

Add a line here in the same PR as the change. Format: what changed for visitors or operators, then the PR number.

## 2026-11-06

- CSP (report-only): trial dropping `*.posthog.com` from script-src and narrowing connect-src to `us.posthog.com` now that PostHog loads through the `/r7` relay; sync stale `tools/_headers` with the deployed file (PR TBD)

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
