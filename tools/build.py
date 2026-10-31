#!/usr/bin/env python3
"""Build the multi-page static Nexus site from the Zoho Sites snippet exports.

Input : EXPORT dir (home/checklists/getstarted/resources/trust .html snippets + assets/)
Output: OUT dir ready for Cloudflare Pages (pretty URLs: /services -> services.html)
All inline <script> blocks are moved to /js/*.js so the CSP can use script-src 'self'.
"""
import os, re, shutil, sys, hashlib

EXPORT = sys.argv[1]
OUT = sys.argv[2]
SITE = "https://www.nexussecurityadvisors.com"

def rd(n): return open(os.path.join(EXPORT, n + ".html"), encoding="utf-8").read()

if os.path.exists(OUT): shutil.rmtree(OUT)
os.makedirs(os.path.join(OUT, "js")); os.makedirs(os.path.join(OUT, ".well-known"))

home = rd("home")

# ---------------------------------------------------------------- shared pieces
def css_block(src):
    """preload links + <style> ... </style> (everything before <div id="nsa">)"""
    return src[: src.find('<div id="nsa">')].rstrip()

def rhero_css(src):
    return "\n".join(re.findall(r"#nsa \.rhero[^{]*\{[^}]*\}", src))

HOME_CSS = css_block(home)
RHERO_CSS = rhero_css(rd("trust"))
EXTRA_CSS = """<style>
html,body{margin:0;background:#0E131A}
#nsa .rhero h1{margin-top:0}
#nsa .links a,#nsa .links .ddt{white-space:nowrap}
@media(max-width:1180px){#nsa .navr .ico{display:none}#nsa .links{gap:18px}}
@media(max-width:1060px) and (min-width:961px){#nsa .links{gap:14px;font-size:13.5px}#nsa .navr .btn.sm{padding-left:12px;padding-right:12px}}
#nsa .explore .chk em{font-style:normal}
#nsa .teaser{max-width:760px}
#nsa .aip-grid .card{display:flex;flex-direction:column}
#nsa .aip-grid .card .aip-price{margin-top:auto}
""" + RHERO_CSS + "\n</style>"

NAV = """<div class="bar"><div class="nav">
  <a class="logo" href="/" aria-label="Nexus Security Advisors home"><img src="/nexus-logo.webp" alt="Nexus Security Advisors" width="440" height="131"></a>
  <nav class="links" id="mainnav" aria-label="Main"><a href="/services">Services</a><a href="/ai-consulting">AI Consulting</a><a href="/industries">Industries</a><a href="/approach">Our Approach</a><a href="/about">About</a><div class="dd"><a href="/resources" class="ddt">Resources &#9662;</a><div class="ddm"><a href="/checklists">Readiness Checklists</a><a href="/regulatory-watch">Regulatory Watch</a><a href="/resources">Resource Library</a><a href="/get-started">Get Started: Client Intake</a></div></div></nav>
  <div class="navr">
    __ICONS__
    <a class="btn sm" href="/get-started">Request a Consultation</a>
    <button type="button" class="mtog" aria-expanded="false" aria-controls="mainnav" aria-label="Open menu"><span></span><span></span><span></span></button>
  </div>
__NAVSCRIPT__
</div></div>"""

def bar_bounds(src):
    a = src.find('<div class="bar">')
    s = src.find("</script>", a) + len("</script>")
    e = src.find("</div></div>", s) + len("</div></div>")
    return a, e

a, e = bar_bounds(home)
old_bar = home[a:e]
ICONS = re.search(r'(<a class="ico".*?</svg></a>)\s*<a class="btn sm"', old_bar, re.S).group(1)
NAVSCRIPT = re.search(r"<script>.*?</script>", old_bar, re.S).group(0)
NAV_HTML = NAV.replace("__ICONS__", ICONS).replace("__NAVSCRIPT__", NAVSCRIPT)

f0 = home.find("<footer>"); f1 = home.find("</div></footer>") + len("</div></footer>")
FOOTER = home[f0:f1]
FOOTER = FOOTER.replace('<a class="logo" href="#top" aria-label="Back to top">', '<a class="logo" href="/" aria-label="Nexus Security Advisors home">')
FOOTER = re.sub(r'<h2 class="fh">Explore</h2>.*?</div>',
    '<h2 class="fh">Explore</h2><a href="/services">Services</a><a href="/ai-consulting">AI Consulting</a><a href="/industries">Industries</a><a href="/approach">Our Approach</a><a href="/regulatory-watch">Regulatory Watch</a><a href="/about">About</a><a href="/resources">Free Resources</a></div>',
    FOOTER, count=1, flags=re.S)
FOOTER = FOOTER.replace('<a href="/security.txt">security.txt</a>', '<a href="/.well-known/security.txt">security.txt</a>')

def footer_bounds(src):
    return src.find("<footer>"), src.find("</div></footer>") + len("</div></footer>")

# home tail (main interactive script) – used by all home-derived pages
HOME_TAIL = home[f1:]

def sec(start_marker, end_marker):
    s = home.find(start_marker); e = home.find(end_marker, s + 1)
    assert s >= 0 and e > s, (start_marker, end_marker)
    return home[s:e].rstrip()

S = {}
S["services"] = sec('<section class="s" id="services"', '<style>\n#nsa .aip-grid')
S["ai"] = sec('<style>\n#nsa .aip-grid', '<section class="s alt gridbg" id="who"')
S["who"] = sec('<section class="s alt gridbg" id="who"', '<section class="s alt" id="israeli-startups"')
S["israeli"] = sec('<section class="s alt" id="israeli-startups"', '<section class="s" id="vciso"')
S["vciso"] = sec('<section class="s" id="vciso"', '<section class="s alt gridbg" id="regs"')
S["regs"] = sec('<section class="s alt gridbg" id="regs"', '<section class="s" id="approach"')
S["approach"] = sec('<section class="s" id="approach"', '<section class="s alt gridbg" id="lab"')
S["lab"] = sec('<section class="s alt gridbg" id="lab"', '<section class="s alt" id="readiness"')
S["readiness"] = sec('<section class="s alt" id="readiness"', '<section class="s gridbg" id="founder"')
S["founder"] = sec('<section class="s gridbg" id="founder"', '<section class="s alt" id="newsletter"')
S["newsletter"] = sec('<section class="s alt" id="newsletter"', '<section class="s" id="insights"')
S["insights"] = sec('<section class="s" id="insights"', '<section class="s gridbg" id="free"')
S["free"] = sec('<section class="s gridbg" id="free"', '<section class="s" id="faq"')
S["faq"] = sec('<section class="s" id="faq"', "</main>")
S["cta"] = sec('<section class="cta" id="contact"', "<footer>")
HERO = sec('<header class="hero" id="top">', "<main>")  # includes stats strip

# AI pricing FAQ: lives in the home FAQ HTML; move it to /ai-consulting
AI_FAQ = re.search(r"\s*<details><summary>How much does AI consulting cost for a small business\?</summary>.*?</details>", S["faq"], re.S).group(0)
S["faq"] = S["faq"].replace(AI_FAQ, "")
AI_FAQ_HTML = ('<section class="s" id="ai-faq" aria-labelledby="aif-h"><div class="wrap">\n'
    '  <div class="rv"><div class="eyebrow">FAQ</div><h2 id="aif-h">AI consulting questions</h2></div>\n'
    '  <div class="faq rv">' + AI_FAQ.replace('<a href="#ai-consulting">See packages and sources</a>', '<a href="#aip-sources">See the pricing sources</a>') + '\n  </div>\n</div></section>')
# give the sources panel an id so the FAQ can link to it
S["ai"] = S["ai"].replace('<details class="refs rv"><summary>Pricing sources', '<details class="refs rv" id="aip-sources"><summary>Pricing sources', 1)

# ---------------------------------------------------------------- link rewriting
ANCHOR_MAP = {
    "services": "/services", "ai-consulting": "/ai-consulting", "who": "/industries",
    "israeli-startups": "/industries", "vciso": "/services#vciso", "regs": "/regulatory-watch",
    "approach": "/approach", "lab": "/approach#lab", "readiness": "/#readiness", "founder": "/about",
    "newsletter": "/about#newsletter", "insights": "/about#insights", "free": "/resources",
    "faq": "/#faq", "contact": "/get-started",
}

def rewrite_links(html, page_path):
    ids = set(re.findall(r'\sid="([^"]+)"', html))
    def fix(m):
        attr, target = m.group(1), m.group(2)
        if target.startswith("/#"):
            k = target[2:]
            if page_path == "/" and k in ids: return f'{attr}="#{k}"'
            return f'{attr}="{ANCHOR_MAP.get(k, "/#" + k)}"'
        if target.startswith("#") and len(target) > 1:
            k = target[1:]
            if k in ids or k == "top": return m.group(0)
            if k in ANCHOR_MAP: return f'{attr}="{ANCHOR_MAP[k]}"'
        return m.group(0)
    return re.sub(r'(href)="(/?#[^"]*)"', fix, html)

# ---------------------------------------------------------------- script externalisation
JS_SEEN = {}
def externalise(html, page):
    n = [0]
    def rep(m):
        open_tag, body = m.group(1), m.group(2)
        if "ld+json" in open_tag: return m.group(0)
        digest = hashlib.sha256(body.encode()).hexdigest()[:10]
        if digest not in JS_SEEN:
            n[0] += 1
            name = f"{page}-{n[0]}-{digest}.js" if page else f"shared-{digest}.js"
            open(os.path.join(OUT, "js", name), "w", encoding="utf-8").write(body.strip() + "\n")
            JS_SEEN[digest] = name
        return f'<script src="/js/{JS_SEEN[digest]}"></script>'
    return re.sub(r"(<script\b[^>]*>)(.*?)</script>", rep, html, flags=re.S)

# ---------------------------------------------------------------- page shell
def page_doc(path, title, desc, head_css, body_inner, extra_head=""):
    canon = SITE + ("/" if path == "/" else path)
    head = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{canon}">
<meta name="robots" content="{'noindex' if path == '/404' else 'index,follow'}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Nexus Security Advisors">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:url" content="{canon}">
<meta property="og:image" content="{SITE}/nexus-logo.webp">
<meta name="twitter:card" content="summary">
<meta name="theme-color" content="#0E131A">
<link rel="icon" href="/nexus-favicon-512.webp" type="image/webp">
<link rel="apple-touch-icon" href="/nexus-favicon-512.webp">
<script src="/js/analytics.js" defer></script>
{head_css}
{EXTRA_CSS}
{extra_head}
</head>
<body>
"""
    return head + body_inner + "\n</body>\n</html>\n"

def rhero(h1_grad, h1_rest, lead, pill=""):
    p = f'<span class="pill"><span class="dot"></span>{pill}</span>\n  ' if pill else ""
    return (f'<header class="rhero" id="top"><canvas id="net" aria-hidden="true"></canvas><div class="wrap">\n  {p}'
            f'<h1><span class="grad">{h1_grad}</span> {h1_rest}</h1>\n  <p class="lead">{lead}</p>\n</div></header>')

def home_body(content, skip_target="#main"):
    return (f'<div id="nsa">\n<a class="skip" href="{skip_target}">Skip to content</a>\n'
            '<div class="prog" aria-hidden="true"></div>\n<a class="totop" href="#top" aria-label="Back to top">&uarr;</a>\n\n'
            + NAV_HTML + "\n\n" + content + "\n" + FOOTER + HOME_TAIL)

def write(path, html):
    fn = "index.html" if path == "/" else path.strip("/") + ".html"
    open(os.path.join(OUT, fn), "w", encoding="utf-8").write(html)

# ---------------------------------------------------------------- home-derived pages
EXPLORE = """<section class="s alt" id="explore" aria-labelledby="ex-h"><div class="wrap">
  <div class="rv"><div class="eyebrow">Explore</div>
  <h2 id="ex-h">Find what you need.</h2></div>
  <div class="checks explore">
    <a class="chk spot rv" href="/services"><b>Services</b><span>Fractional vCISO, compliance readiness, AI governance, and security assessments.</span><em>View services &rarr;</em></a>
    <a class="chk spot rv" href="/ai-consulting"><b>AI Consulting for SMBs</b><span>Put AI to work safely, with packages built for small and mid-sized businesses.</span><em>Explore AI consulting &rarr;</em></a>
    <a class="chk spot rv" href="/industries"><b>Industries We Serve</b><span>Financial services, healthcare, defense suppliers, manufacturing, technology, and more.</span><em>Find your industry &rarr;</em></a>
    <a class="chk spot rv" href="/approach"><b>Our Approach &amp; Risk Lab</b><span>How we assess, prioritize, and prove progress, with an interactive risk matrix.</span><em>See how we work &rarr;</em></a>
    <a class="chk spot rv" href="/regulatory-watch"><b>Regulatory Watch</b><span>Plain-English status on CMMC, HIPAA, PCI DSS, the EU CRA, and NIST RMF.</span><em>Check the latest &rarr;</em></a>
    <a class="chk spot rv" href="/industries"><b>Startups &amp; Scale-ups</b><span>Pass enterprise security reviews and earn SOC 2 with a fractional CISO.</span><em>See how we help &rarr;</em></a>
  </div>
</div></section>"""

ABOUT_TEASER = """<section class="s gridbg" id="about-teaser" aria-labelledby="abt-h"><div class="wrap">
  <div class="rv teaser"><div class="eyebrow">Who We Are</div>
  <h2 id="abt-h">Led by an experienced CISO and U.S. Air Force veteran.</h2>
  <p>Nexus Security Advisors is an SBA-certified Service-Disabled Veteran-Owned Small Business (SDVOSB) founded by Dan Sorensen, a fractional vCISO and AI governance advisor with 22+ years of U.S. Air Force and Air National Guard service, an OWASP AI Exchange core team member, and a Forbes Technology Council contributor.</p>
  <div class="ctas"><a class="btn ghost" href="/about">About Nexus &amp; our founder &rarr;</a></div></div>
</div></section>"""

home_main = "\n\n".join([S["services"], EXPLORE, S["readiness"], ABOUT_TEASER, S["faq"]])
home_content = HERO + "\n\n<main id=\"main\">\n" + home_main + "\n</main>\n\n" + S["cta"]
home_ld = re.findall(r'<script type="application/ld\+json">.*?</script>', HOME_TAIL, re.S)

PAGES = []
PAGES.append(("/", "Fractional CISO &amp; vCISO Services for SMBs | Nexus Security",
    "Fractional vCISO, CMMC, HIPAA, SOC 2 and PCI DSS readiness, and AI governance for SMBs in every industry, plus SOC 2 and security-review support for startups.",
    home_content, "#services"))

def sub(path, title, desc, hero, sections):
    content = hero + '\n\n<main id="main">\n' + "\n\n".join(sections) + "\n</main>\n\n" + S["cta"]
    PAGES.append((path, title, desc, content, "#main"))

sub("/services", "Fractional vCISO, Compliance &amp; AI Governance Services | Nexus",
    "Fractional and virtual CISO leadership, compliance readiness (CMMC, HIPAA, SOC 2, EU CRA), AI governance, and NIST CSF 2.0 security assessments for SMBs.",
    rhero("Services", "built for your size and your regulators.", "Executive security leadership, compliance readiness, AI governance, and assessments for small and mid-sized businesses, delivered by a fractional CISO who works alongside your IT team or MSP."),
    [S["services"], S["vciso"]])
sub("/ai-consulting", "AI Consulting for Small Businesses: Packages &amp; Pricing | Nexus",
    "AI readiness sprints, AI governance programs, fractional AI advisory, and leadership AI workshops for SMBs, with transparent starting prices and cited 2026 market benchmarks.",
    rhero("AI consulting", "for small and mid-sized businesses.", "Choose the right AI use cases, roll out AI tools with guardrails, and meet NIST AI RMF, ISO/IEC 42001, and EU AI Act expectations, with security built in from day one."),
    [S["ai"], AI_FAQ_HTML])
sub("/industries", "Industries We Serve: Cybersecurity for SMBs | Nexus Security",
    "Cybersecurity leadership for financial services, healthcare, defense and aerospace suppliers, manufacturing and critical infrastructure, technology and SaaS, professional services, and nonprofits.",
    rhero("Industries", "we serve.", "Small and mid-sized businesses in every industry. Pick the one closest to yours to see the requirements you are likely facing and where to start."),
    [S["who"]])
sub("/approach", "Our Approach &amp; Risk Lab: How We Reduce Cyber Risk | Nexus",
    "Our NIST CSF 2.0 based method: assess, prioritize on a 5x5 risk scale, execute a 30/60/90-day plan, and prove progress, plus an interactive risk scenario simulator.",
    rhero("Our approach:", "tools find the issues, people close them.", "How we assess, prioritize, execute, and prove progress, and an interactive Risk Lab that shows how findings turn into decisions."),
    [S["approach"], S["lab"]])
sub("/regulatory-watch", "Regulatory Watch: CMMC, HIPAA, PCI DSS, EU CRA Status | Nexus",
    "Plain-English status on the cybersecurity regulations SMBs ask about most: EU Cyber Resilience Act, CMMC 2.0, HIPAA Security Rule, PCI DSS v4.0.1, and NIST RMF.",
    rhero("Regulatory watch:", "where the rules stand right now.", "Key dates, what to do next, and links to the official sources for the regulations our clients ask about most."),
    [S["regs"]])
sub("/about", "About Nexus Security Advisors &amp; Founder Dan Sorensen",
    "Nexus Security Advisors is an SDVOSB cybersecurity leadership firm founded by Dan Sorensen, fractional vCISO, AI governance advisor, and U.S. Air Force veteran.",
    rhero("About", "Nexus Security Advisors.", "A veteran-owned cybersecurity leadership firm helping small and mid-sized businesses align security, compliance, and AI with business outcomes."),
    [S["founder"], S["newsletter"], S["insights"]])

NOTFOUND = ('<header class="rhero" id="top"><canvas id="net" aria-hidden="true"></canvas><div class="wrap">\n'
    '  <h1><span class="grad">Page not found.</span></h1>\n  <p class="lead">The page you are looking for has moved or no longer exists.</p>\n'
    '  <div class="ctas"><a class="btn" href="/">Go to the homepage</a><a class="btn ghost" href="/services">View our services</a></div>\n</div></header>')
PAGES.append(("/404", "Page Not Found | Nexus Security Advisors", "The page you requested could not be found.",
    NOTFOUND + '\n<main id="main"></main>\n' + S["cta"], "#main"))

for path, title, desc, content, skip in PAGES:
    body = home_body(content, skip)
    # JSON-LD: home keeps the full org/website/person/FAQ graph; subpages get org-only reference
    if path != "/":
        for blk in home_ld:
            body = body.replace(blk, "")
    body = rewrite_links(body, path)
    body = externalise(body, "")
    write(path, page_doc(path, title, desc, HOME_CSS, body))

# ---------------------------------------------------------------- existing subpages
EXISTING = {
    "checklists": ("/checklists", "Free CMMC, HIPAA &amp; SOC 2 Readiness Checklists | Nexus",
                   "Free interactive CMMC/NIST 800-171, HIPAA, SOC 2, cyber insurance, EU CRA and AI governance checklists. Download your answers as Word, Excel, CSV or JSON."),
    "getstarted": ("/get-started", "Request a Fractional CISO Consultation | Nexus Security",
                   "Answer five quick questions to request a free 30-minute vCISO consultation. We reply within one business day. NDA available before detailed discussion."),
    "resources": ("/resources", "Free Cybersecurity &amp; AI Security Resource Library | Nexus",
                  "135+ free cybersecurity resources: AI security, threat intel, OSINT, red/blue/purple team tools, DevSecOps, bug bounty, phishing and password security."),
    "trust": ("/trust", "Trust, Privacy &amp; Vulnerability Disclosure | Nexus Security",
              "How Nexus protects visitors and client data: privacy notice, vulnerability disclosure policy with safe harbor, email authentication, and accessibility."),
}
for key, (path, title, desc) in EXISTING.items():
    src = rd(key)
    css = css_block(src)
    body = src[src.find('<div id="nsa">'):]
    a, e = bar_bounds(body)
    body = body[:a] + NAV_HTML + body[e:]
    fa, fb = footer_bounds(body)
    body = body[:fa] + FOOTER + body[fb:]
    body = body.replace('href="/security.txt"', 'href="/.well-known/security.txt"')
    body = rewrite_links(body, path)
    body = externalise(body, key)
    write(path, page_doc(path, title, desc, css, body))

# ---------------------------------------------------------------- assets + security files
for fn in os.listdir(os.path.join(EXPORT, "assets")):
    if fn == "security.txt": continue
    shutil.copy(os.path.join(EXPORT, "assets", fn), os.path.join(OUT, fn))
open(os.path.join(OUT, "js", "analytics.js"), "w").write(open(os.path.join(os.path.dirname(__file__), "analytics.js")).read())
for extra in ["_headers", "_redirects", "robots.txt", "404.html"]:
    p = os.path.join(os.path.dirname(__file__), extra)
    if os.path.exists(p): shutil.copy(p, os.path.join(OUT, extra))
sec_txt = """Contact: mailto:info@nexussecurityadvisors.com
Expires: 2027-10-01T00:00:00.000Z
Preferred-Languages: en
Canonical: https://www.nexussecurityadvisors.com/.well-known/security.txt
Policy: https://www.nexussecurityadvisors.com/trust#disclosure
"""
open(os.path.join(OUT, ".well-known", "security.txt"), "w").write(sec_txt)
open(os.path.join(OUT, "security.txt"), "w").write(sec_txt)

urls = [p for p, *_ in PAGES if p != "/404"] + [v[0] for v in EXISTING.values()]
sm = ['<?xml version="1.0" encoding="UTF-8"?>', '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
sm += [f"  <url><loc>{SITE}{'/' if u == '/' else u}</loc></url>" for u in urls]
sm.append("</urlset>")
open(os.path.join(OUT, "sitemap.xml"), "w").write("\n".join(sm) + "\n")
print("built", len(urls), "pages;", len(JS_SEEN), "js files")
