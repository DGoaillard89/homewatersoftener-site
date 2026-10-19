#!/usr/bin/env python3
"""
Static page builder for HomeWaterSoftener.co.uk (no dependencies, Python 3.8+).

Source content lives in _content/ (ignored by GitHub Pages because of the underscore):
  _content/pages/<slug>.html  ->  /<slug>.html
  _content/blog/<slug>.html   ->  /blog/<slug>.html   (+ /blog/index.html)

Each source file = one line of JSON metadata, then the HTML body.
Page keys:  slug, title, description, excerpt, h1, eyebrow, kind ("service"|"areas"|"legal"),
            service_name, related (list of blog slugs), cta ("quote"|"booking")
Post keys:  slug, title, description, excerpt, h1, date (YYYY-MM-DD), modified, image, image_w,
            image_h, image_alt, related (blog slugs), pages (page slugs)

Also regenerates: sitemap.xml, 404.html, and the marked blocks in index.html
(<!-- NAV:START/END -->, <!-- FOOTER:START/END -->, <!-- LATEST:START/END -->, <!-- FAQLD:START/END -->).

Links in bodies are written root-relative ("/blog/x.html", "/#contact"); the builder makes
them relative to the output page, and drops links to blog posts that don't exist yet
(the link text stays), so it's safe to reference posts before they're written.

Run:  python3 tools/build.py
"""
import html
import json
import re
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = "https://homewatersoftener.co.uk"
BRAND = "HomeWaterSoftener"
PHONE = "020 3633 6064"
TEL = "tel:+442036336064"
TODAY = date.today().isoformat()


# ---------------------------------------------------------------- content loading
def load(folder):
    items = []
    for f in sorted((ROOT / "_content" / folder).glob("*.html")):
        first, _, body = f.read_text(encoding="utf-8").partition("\n")
        meta = json.loads(first)
        meta["body"] = body.strip()
        items.append(meta)
    return items


PAGES = load("pages")
POSTS = sorted(load("blog"), key=lambda p: p["date"], reverse=True)  # newest first
POST_SLUGS = {p["slug"] for p in POSTS}
PAGE_BY_SLUG = {p["slug"]: p for p in PAGES}


def fmt_date(iso):
    y, m, d = map(int, iso.split("-"))
    return date(y, m, d).strftime("%-d %B %Y")


def esc(s):
    return html.escape(s, quote=True)


def relink(body, prefix):
    """Root-relative links -> relative to the page; strip links to unwritten posts."""

    def fix(m):
        url = m.group(1)
        if url == "/" or url.startswith("/#"):
            return f'href="{prefix or "./"}{url[1:]}"'
        return f'href="{prefix}{url[1:]}"'


    # drop <a> to blog posts that don't exist yet, keep their text
    def drop(m):
        slug = m.group(1)
        if slug in POST_SLUGS:
            return m.group(0)
        return m.group(2)

    body = re.sub(r'<a href="/blog/([a-z0-9-]+)\.html"[^>]*>(.*?)</a>', drop, body, flags=re.S)
    return re.sub(r'href="(/[^"]*)"', fix, body)


def faqs_from(body):
    out = []
    for q, a in re.findall(r"<details><summary>(.*?)</summary><p>(.*?)</p></details>", body, flags=re.S):
        clean = lambda s: re.sub(r"<[^>]+>", "", html.unescape(s)).strip()
        out.append({"@type": "Question", "name": clean(q),
                    "acceptedAnswer": {"@type": "Answer", "text": clean(a)}})
    return out


def full_title(t):
    t2 = f"{t} | {BRAND}"
    return t2 if len(t2) <= 60 else t


# ---------------------------------------------------------------- shared partials
NAV_ITEMS = [
    ("hard-water-areas-london.html", "Water hardness"),
    ("water-softener-installation.html", "Installation"),
    ("water-softener-servicing.html", "Servicing"),
    ("blog/", "Advice"),
    ("#faq@home", "FAQ"),
    ("#contact", "Contact"),
]

LOGO_SVG = """<svg class="logo-mark" viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16 3c5 6.5 9 11.4 9 16a9 9 0 0 1-18 0c0-4.6 4-9.5 9-16z" fill="currentColor"/>
          <path d="M11.5 20a4.5 4.5 0 0 0 4.5 4.5" stroke="{stroke}" stroke-width="2" stroke-linecap="round" fill="none"/>
        </svg>"""


def nav_html(prefix, home=False, has_contact=True, current=""):
    home_href = prefix or "./"
    links = []
    for href, label in NAV_ITEMS:
        if href == "#faq@home":
            url = "#faq" if home else f"{home_href}#faq"
        elif href == "#contact":
            url = "#contact" if has_contact else f"{home_href}#contact"
        else:
            url = prefix + href
        cur = ' aria-current="page"' if current and href.startswith(current) else ""
        links.append(f'<a href="{url}"{cur}>{label}</a>')
    return "\n        ".join(links)


def header_html(prefix, home=False, has_contact=True, current=""):
    home_href = "#top" if home else (prefix or "./")
    booking = "#booking" if home else f"{prefix or './'}#booking"
    return f"""<a class="skip-link" href="#main">Skip to content</a>
  <header class="site-header" id="top">
    <div class="container header-inner">
      <a href="{home_href}" class="logo" aria-label="Home Water Softener: home">
        {LOGO_SVG.format(stroke="#fff")}
        <span>HomeWater<strong>Softener</strong></span>
      </a>

      <nav class="main-nav" id="main-nav" aria-label="Main">
        {nav_html(prefix, home, has_contact, current)}
      </nav>

      <div class="header-actions">
        <a href="{TEL}" class="header-phone">{PHONE}</a>
        <a href="{booking}" class="btn btn-primary btn-sm">Book a service</a>
        <button class="nav-toggle" aria-controls="main-nav" aria-expanded="false" aria-label="Open menu">
          <span></span><span></span><span></span>
        </button>
      </div>
    </div>
  </header>"""


def footer_cols(prefix, home=False):
    h = "" if home else (prefix or "./")
    return f"""<div>
        <h4>Services</h4>
        <a href="{prefix}water-softener-installation.html">Water softener installation</a>
        <a href="{prefix}water-softener-servicing.html">Servicing &amp; repairs</a>
        <a href="{h}#services">Filters, RO &amp; UV</a>
        <a href="{prefix}hard-water-areas-london.html">Hard water areas</a>
      </div>
      <div>
        <h4>Company</h4>
        <a href="{h}#booking">Book a service</a>
        <a href="{prefix}blog/">Advice</a>
        <a href="{h}#faq">FAQ</a>
        <a href="{h}#contact">Contact</a>
      </div>
      <div>
        <h4>Legal</h4>
        <a href="{prefix}privacy.html">Privacy notice</a>
        <a href="{prefix}privacy.html#cookies">Cookies</a>
      </div>"""


def footer_html(prefix):
    home_href = prefix or "./"
    return f"""<section class="parent-brand" aria-labelledby="parent-brand-title">
    <div class="container parent-inner">
      <a href="https://dswater.co.uk" class="parent-logo" target="_blank" rel="noopener">
        <img src="{prefix}assets/img/ds-water-logo.png" width="738" height="342" alt="DS Water" loading="lazy" />
      </a>
      <div class="parent-copy">
        <span class="eyebrow eyebrow--ds">Part of DS Water</span>
        <h2 id="parent-brand-title">The home water arm of DS Water</h2>
        <p>HomeWaterSoftener.co.uk is part of DS Water. You get the same experienced engineers, standards and aftercare, with a service designed specifically for homes.</p>
      </div>
      <a href="https://dswater.co.uk" class="btn btn-ds" target="_blank" rel="noopener">Visit DS Water</a>
    </div>
  </section>

  <footer class="site-footer">
    <div class="container footer-inner">
      <div>
        <a href="{home_href}" class="logo logo--light">
          {LOGO_SVG.format(stroke="#07111e")}
          <span>HomeWater<strong>Softener</strong></span>
        </a>
        <p>Water softener, RO, carbon filter and UV specialists for London and the Home Counties.</p>
        <address class="footer-address">
          The Lightbox G16, 111 Power Road<br />London W4 5PY<br />
          <a href="{TEL}">{PHONE}</a>
        </address>
      </div>
      {footer_cols(prefix)}
    </div>
    <div class="container footer-bottom">
      <span>&copy; <span id="year" data-year></span> HomeWaterSoftener.co.uk</span>
      <span>HomeWaterSoftener.co.uk is a trading name of DS Water</span>
    </div>
  </footer>"""


def contact_html(prefix):
    return f"""<section class="section section-dark" id="contact">
      <div class="container contact-grid">
        <div class="contact-copy">
          <span class="eyebrow">Get in touch</span>
          <h2>Get your free, no-obligation quote</h2>
          <p>Tell us a little about your home and what you're after. We'll get back to you to talk it through, usually with a quick phone call.</p>
          <ul class="contact-details">
            <li><span>Phone</span><a href="{TEL}">{PHONE}</a></li>
            <li><span>Hours</span>Mon&ndash;Fri 8am&ndash;6pm</li>
            <li><span>Office</span><address>The Lightbox G16, 111 Power Road<br />Chiswick, London W4 5PY</address></li>
          </ul>
        </div>

        <div class="contact-card">
          <form class="lead-form" id="contact-form" data-form-type="contact_enquiry" novalidate>
            <input type="hidden" name="water_hardness_mgl" id="c-hardness" />
            <input type="hidden" name="softened_sodium_mgl" id="c-sodium" />
            <input type="hidden" name="lead_source" value="website_contact_form" />
            <div class="hp-field" aria-hidden="true">
              <label for="c-website">Company website</label>
              <input id="c-website" name="company_website" type="text" tabindex="-1" autocomplete="off" />
            </div>

            <div class="field-row">
              <div class="field">
                <label for="c-first">First name</label>
                <input id="c-first" name="first_name" type="text" autocomplete="given-name" maxlength="60" required />
              </div>
              <div class="field">
                <label for="c-last">Last name</label>
                <input id="c-last" name="last_name" type="text" autocomplete="family-name" maxlength="59" required />
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="c-email">Email</label>
                <input id="c-email" name="email" type="email" autocomplete="email" maxlength="200" required />
              </div>
              <div class="field">
                <label for="c-phone">Phone</label>
                <input id="c-phone" name="phone" type="tel" autocomplete="tel" maxlength="40" required />
              </div>
            </div>

            <div class="field-row">
              <div class="field">
                <label for="c-postcode">Postcode</label>
                <input id="c-postcode" name="postcode" type="text" autocomplete="postal-code" maxlength="10" required />
              </div>
              <div class="field">
                <label for="c-interest">I'm interested in</label>
                <select id="c-interest" name="interest" required>
                  <option value="">Choose&hellip;</option>
                  <option value="water-softener">Water softener</option>
                  <option value="carbon-filter">Under-sink carbon filter</option>
                  <option value="reverse-osmosis">Reverse osmosis</option>
                  <option value="uv-lamp">UV lamp / steriliser</option>
                  <option value="servicing">Servicing / repair</option>
                  <option value="not-sure">Not sure, please advise</option>
                </select>
              </div>
            </div>

            <div class="field">
              <label for="c-message">Message <span class="optional">(optional)</span></label>
              <textarea id="c-message" name="message" rows="4" maxlength="4500" placeholder="Property type, number of bathrooms, any issues you've noticed&hellip;"></textarea>
            </div>

            <label class="checkbox">
              <input type="checkbox" name="consent" value="yes" required />
              <span>I agree to be contacted about my enquiry. See our <a href="{prefix}privacy.html">privacy notice</a>.</span>
            </label>

            <p class="form-error" data-form-error role="alert" tabindex="-1" hidden></p>
            <button type="submit" class="btn btn-primary btn-block btn-lg">Send enquiry</button>
          </form>

          <div class="form-success" id="contact-success" hidden>
            <span class="success-icon">&#10003;</span>
            <h3>Thanks, we've got it</h3>
            <p>We'll be in touch soon. If it's urgent, give us a ring on <a href="{TEL}">{PHONE}</a>.</p>
            <button type="button" class="btn btn-ghost" data-reset-form="contact-form">Send another</button>
          </div>
        </div>
      </div>
    </section>"""


def checker_html(prefix):
    """Postcode hardness checker (same markup/IDs as the homepage, driven by hardness-dial.js)."""
    return f"""<section class="section section-alt" id="hardness">
      <div class="container hardness-grid">
        <div class="hardness-copy">
          <span class="eyebrow">Postcode checker</span>
          <h2>How hard is your water?</h2>
          <p>Pop in your postcode for a rough idea of how hard the water usually is in your area, plus an estimate of the sodium it would contain once softened.</p>
          <form class="postcode-form" id="postcode-form" novalidate>
            <label for="postcode-input" class="sr-only">Your postcode</label>
            <input id="postcode-input" name="postcode" type="text" autocomplete="postal-code"
                   placeholder="e.g. W4 or SW11 1AA" maxlength="8" required />
            <button type="submit" class="btn btn-primary">Check</button>
          </form>
          <p class="form-hint" id="postcode-hint" aria-live="polite">Just the first part is fine, e.g. <strong>W4</strong>.</p>
          <ul class="hardness-legend" id="hardness-legend"></ul>
          <p class="fine-print"><strong>An approximate guide, not official data.</strong> Figures are typical for your postcode area and vary by street and season. For an exact reading, check with your water supplier. We also test your water on site at the free survey.</p>
        </div>

        <div class="dial-card">
          <div class="dial-wrap">
            <svg class="dial" id="hardness-dial" viewBox="0 0 320 200" role="img" aria-labelledby="dial-title">
              <title id="dial-title">Water hardness dial</title>
            </svg>
            <div class="dial-readout">
              <span class="dial-value" id="dial-value">&mdash;</span>
              <span class="dial-unit">mg/l CaCO&#8323; (approx.)</span>
            </div>
          </div>
          <div class="dial-result" id="dial-result" aria-live="polite">
            <p class="dial-result-label">Enter a postcode to see your result</p>
          </div>
          <div class="dial-stats" id="dial-stats" hidden>
            <div><span>Clark degrees</span><strong id="stat-clark">&mdash;</strong></div>
            <div><span>German &deg;dH</span><strong id="stat-dh">&mdash;</strong></div>
            <div><span>Area</span><strong id="stat-area">&mdash;</strong></div>
          </div>
          <div class="sodium-panel" id="sodium-panel" hidden>
            <div class="sodium-head">
              <strong>Drinking water sodium estimate</strong>
              <a href="{prefix or './'}#drinking-water" class="sodium-why">Why this matters</a>
            </div>
            <div class="sodium-bar" role="img" id="sodium-bar-label">
              <span class="sodium-fill sodium-fill--incoming" id="sodium-fill-incoming"></span>
              <span class="sodium-fill sodium-fill--added" id="sodium-fill-added"></span>
              <span class="sodium-limit" title="200 mg/l legal limit"><em>200 limit</em></span>
            </div>
            <div class="sodium-figures">
              <div><span class="key key--incoming"></span>Typical in supply <strong id="sodium-incoming">&mdash;</strong></div>
              <div><span class="key key--added"></span>Added by softening <strong id="sodium-added">&mdash;</strong></div>
              <div>Softened total <strong id="sodium-total">&mdash;</strong></div>
            </div>
            <p class="sodium-verdict" id="sodium-verdict"></p>
          </div>
          <a href="#contact" class="btn btn-primary btn-block" id="dial-cta" hidden>Get a softener quote</a>
        </div>
      </div>
    </section>"""


SCRIPTS = ["config.js", "hardness-data.js", "api.js", "hardness-dial.js", "booking-calendar.js", "forms.js", "main.js"]


def scripts_html(prefix):
    return "\n  ".join(f'<script src="{prefix}assets/js/{s}"></script>' for s in SCRIPTS)


def head_html(prefix, title, desc, canonical, ld, og_type="website", image=None, extra=""):
    image = image or f"{SITE}/assets/img/og-image.png"
    ld_html = "\n  ".join(
        f'<script type="application/ld+json">\n  {json.dumps(block, ensure_ascii=False, indent=2)}\n  </script>' for block in ld)
    return f"""<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(desc)}" />
  <meta name="robots" content="index, follow, max-image-preview:large" />
  <link rel="canonical" href="{canonical}" />
  <meta name="theme-color" content="#0b6bcb" />
  <link rel="icon" href="{prefix}assets/img/favicon.svg" type="image/svg+xml" />
  <link rel="apple-touch-icon" href="{prefix}assets/img/apple-touch-icon.png" />
  <meta property="og:type" content="{og_type}" />
  <meta property="og:locale" content="en_GB" />
  <meta property="og:site_name" content="HomeWaterSoftener.co.uk" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(desc)}" />
  <meta property="og:image" content="{image}" />
  <meta property="og:image:alt" content="HomeWaterSoftener: softer water, happier home" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(desc)}" />
  <meta name="twitter:image" content="{image}" />{extra}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
  {ld_html}
  <link rel="stylesheet" href="{prefix}assets/css/tokens.css" />
  <link rel="stylesheet" href="{prefix}assets/css/styles.css" />
</head>"""


def breadcrumbs(prefix, trail):
    """trail = [(label, url_relative_or_None)]; returns (html, schema)."""
    items, schema = [], []
    for i, (label, rel, absu) in enumerate(trail, 1):
        if rel is None:
            items.append(f'<li aria-current="page">{esc(label)}</li>')
        else:
            items.append(f'<li><a href="{rel}">{esc(label)}</a></li>')
        schema.append({"@type": "ListItem", "position": i, "name": label, "item": absu})
    return (f'<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>{"".join(items)}</ol></nav>',
            {"@context": "https://schema.org", "@type": "BreadcrumbList", "itemListElement": schema})


BUSINESS_REF = {"@type": "HomeAndConstructionBusiness", "@id": f"{SITE}/#business", "name": "HomeWaterSoftener.co.uk",
                "telephone": "+44 20 3633 6064", "url": f"{SITE}/"}
PUBLISHER = {"@type": "Organization", "name": "HomeWaterSoftener.co.uk", "url": f"{SITE}/",
             "logo": {"@type": "ImageObject", "url": f"{SITE}/assets/img/apple-touch-icon.png", "width": 180, "height": 180},
             "parentOrganization": {"@type": "Organization", "name": "DS Water", "url": "https://dswater.co.uk"}}
AREAS = ["London", "Surrey", "Kent", "Essex", "Hertfordshire", "Buckinghamshire", "Berkshire"]


def post_card(p, prefix, heading="h3"):
    return f"""<article class="post-card">
          <a class="post-card-img" href="{prefix}blog/{p['slug']}.html" tabindex="-1" aria-hidden="true">
            <img src="{prefix}{p['thumb']}" width="{p['thumb_w']}" height="{p['thumb_h']}" alt="" loading="lazy" />
          </a>
          <div class="post-card-body">
            <time datetime="{p['date']}">{fmt_date(p['date'])}</time>
            <{heading}><a href="{prefix}blog/{p['slug']}.html">{esc(p['h1'])}</a></{heading}>
            <p>{esc(p['excerpt'])}</p>
            <a class="post-card-more" href="{prefix}blog/{p['slug']}.html" aria-label="Read: {esc(p['h1'])}">Read the guide &rarr;</a>
          </div>
        </article>"""


def related_block(slugs, prefix, exclude=None):
    posts = [p for s in slugs for p in POSTS if p["slug"] == s and p["slug"] != exclude]
    if len(posts) < 2:  # top up with the newest written posts
        posts += [p for p in POSTS if p not in posts and p["slug"] != exclude][: 2 - len(posts)]
    if not posts:
        return ""
    lis = "".join(f'<li><a href="{prefix}blog/{p["slug"]}.html">{esc(p["h1"])}</a><small>{fmt_date(p["date"])}</small></li>' for p in posts[:3])
    return f'<div class="aside-card"><h2 class="aside-title">Related articles</h2><ul class="related-list">{lis}</ul></div>'


def aside_html(prefix, related, cta="quote", exclude_post=None, exclude_page=None):
    primary = (f'<a href="{prefix or "./"}#booking" class="btn btn-primary btn-block">Book a service</a>'
               if cta == "booking" else '<a href="#contact" class="btn btn-primary btn-block">Get a free quote</a>')
    pages = [("water-softener-installation", "Water softener installation"),
             ("water-softener-servicing", "Servicing &amp; repairs"),
             ("hard-water-areas-london", "Hard water areas &amp; postcode checker")]
    page_links = "".join(f'<li><a href="{prefix}{s}.html">{l}</a></li>' for s, l in pages if s != exclude_page)
    return f"""<aside class="page-aside">
          <div class="aside-card aside-card--cta">
            <h2 class="aside-title">Talk to a real engineer</h2>
            <p>Free survey and water test, then a clear fixed quote.</p>
            {primary}
            <a href="{TEL}" class="btn btn-ghost btn-block">Call {PHONE}</a>
          </div>
          <div class="aside-card"><h2 class="aside-title">Our services</h2><ul class="related-list">{page_links}</ul></div>
          {related_block(related, prefix, exclude_post)}
        </aside>"""


def write(path, text):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")
    print("wrote", path.relative_to(ROOT))


# ---------------------------------------------------------------- pages
def build_page(p):
    prefix = ""
    canonical = f"{SITE}/{p['slug']}.html"
    title = full_title(p["title"])
    kind = p.get("kind", "service")
    has_contact = kind != "legal"
    crumbs_html, crumbs_ld = breadcrumbs(prefix, [("Home", "./", f"{SITE}/"), (p["h1"], None, canonical)])
    ld = []
    if kind == "service":
        ld.append({"@context": "https://schema.org", "@type": "Service", "name": p["service_name"],
                   "serviceType": p["service_name"], "description": p["description"], "url": canonical,
                   "provider": BUSINESS_REF, "areaServed": [{"@type": "Place", "name": a} for a in AREAS]})
    else:
        ld.append({"@context": "https://schema.org", "@type": "WebPage", "name": p["h1"], "url": canonical,
                   "description": p["description"], "isPartOf": {"@id": f"{SITE}/#website"}})
    ld.append(crumbs_ld)
    faqs = faqs_from(p["body"])
    if faqs:
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqs})

    body = relink(p["body"], prefix)
    cta = p.get("cta", "quote")
    if kind == "legal":
        hero_ctas = ""
    elif cta == "booking":
        hero_ctas = f'<div class="hero-ctas"><a href="./#booking" class="btn btn-primary btn-lg">Book a service</a><a href="{TEL}" class="btn btn-ghost btn-lg">Call {PHONE}</a></div>'
    else:
        hero_ctas = f'<div class="hero-ctas"><a href="#contact" class="btn btn-primary btn-lg">Get a free quote</a><a href="{TEL}" class="btn btn-ghost btn-lg">Call {PHONE}</a></div>'

    checker = checker_html(prefix) if kind == "areas" else ""
    if kind == "legal":
        content = f'<div class="container"><article class="prose prose--solo">{body}</article></div>'
    else:
        content = f"""<div class="container page-layout">
        <article class="prose">{body}</article>
        {aside_html(prefix, p.get('related', []), cta, exclude_page=p['slug'])}
      </div>"""

    out = f"""{head_html(prefix, title, p['description'], canonical, ld)}
<body>
  {header_html(prefix, has_contact=has_contact, current=p['slug'])}

  <main id="main">
    <section class="page-hero">
      <div class="container">
        {crumbs_html}
        <span class="eyebrow">{esc(p.get('eyebrow', ''))}</span>
        <h1>{esc(p['h1'])}</h1>
        <p class="lead lead--wide">{esc(p['excerpt'])}</p>
        {hero_ctas}
      </div>
    </section>
    {checker}
    <section class="section section--page">
      {content}
    </section>
    {contact_html(prefix) if has_contact else ''}
  </main>

  {footer_html(prefix)}

  {scripts_html(prefix)}
</body>
</html>
"""
    write(ROOT / f"{p['slug']}.html", out)


# ---------------------------------------------------------------- blog
def build_post(p):
    prefix = "../"
    canonical = f"{SITE}/blog/{p['slug']}.html"
    title = full_title(p["title"])
    img_abs = f"{SITE}/{p['image']}"
    crumbs_html, crumbs_ld = breadcrumbs(prefix, [("Home", "../", f"{SITE}/"), ("Advice", "./", f"{SITE}/blog/"),
                                                  (p["h1"], None, canonical)])
    ld = [{"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["h1"],
           "description": p["description"], "datePublished": p["date"], "dateModified": p.get("modified", p["date"]),
           "author": {"@type": "Organization", "name": "HomeWaterSoftener.co.uk", "url": f"{SITE}/"},
           "publisher": PUBLISHER, "image": {"@type": "ImageObject", "url": img_abs, "width": p["image_w"], "height": p["image_h"]},
           "mainEntityOfPage": {"@type": "WebPage", "@id": canonical}, "inLanguage": "en-GB"}, crumbs_ld]
    faqs = faqs_from(p["body"])
    if faqs:
        ld.append({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqs})
    extra = (f'\n  <meta property="article:published_time" content="{p["date"]}" />'
             f'\n  <meta property="article:modified_time" content="{p.get("modified", p["date"])}" />')
    body = relink(p["body"], prefix)
    out = f"""{head_html(prefix, title, p['description'], canonical, ld, og_type="article", image=img_abs, extra=extra)}
<body>
  {header_html(prefix, current="blog/")}

  <main id="main">
    <section class="page-hero page-hero--post">
      <div class="container">
        {crumbs_html}
        <span class="eyebrow">Advice</span>
        <h1>{esc(p['h1'])}</h1>
        <p class="post-meta">By HomeWaterSoftener &middot; <time datetime="{p['date']}">{fmt_date(p['date'])}</time></p>
      </div>
    </section>
    <section class="section section--page">
      <div class="container page-layout">
        <article class="prose">
          <figure class="post-figure">
            <img src="{prefix}{p['image']}" width="{p['image_w']}" height="{p['image_h']}" alt="{esc(p['image_alt'])}" />
          </figure>
          {body}
          <div class="post-cta">
            <h2>Want a hand with your water?</h2>
            <p>Book a free survey and water test. We'll tell you straight whether a softener's worth it for your home.</p>
            <a href="#contact" class="btn btn-primary btn-lg">Get a free quote</a>
          </div>
        </article>
        {aside_html(prefix, p.get('related', []), exclude_post=p['slug'])}
      </div>
    </section>
    {contact_html(prefix)}
  </main>

  {footer_html(prefix)}

  {scripts_html(prefix)}
</body>
</html>
"""
    write(ROOT / "blog" / f"{p['slug']}.html", out)


def build_blog_index():
    prefix = "../"
    canonical = f"{SITE}/blog/"
    title = "Water Softener Advice for London Homes | HomeWaterSoftener"
    desc = "Straight-talking advice on hard water, limescale, water softeners and drinking water for homes in London and the Home Counties."
    crumbs_html, crumbs_ld = breadcrumbs(prefix, [("Home", "../", f"{SITE}/"), ("Advice", None, canonical)])
    ld = [{"@context": "https://schema.org", "@type": "Blog", "name": "HomeWaterSoftener advice", "url": canonical,
           "description": desc, "publisher": PUBLISHER,
           "blogPost": [{"@type": "BlogPosting", "headline": p["h1"], "url": f"{SITE}/blog/{p['slug']}.html",
                         "datePublished": p["date"]} for p in POSTS]}, crumbs_ld]
    cards = "\n        ".join(post_card(p, prefix, "h2") for p in POSTS)
    out = f"""{head_html(prefix, title, desc, canonical, ld)}
<body>
  {header_html(prefix, current="blog/")}

  <main id="main">
    <section class="page-hero">
      <div class="container">
        {crumbs_html}
        <span class="eyebrow">Advice</span>
        <h1>Hard water and softener advice</h1>
        <p class="lead lead--wide">Plain-English guides from the engineers who fit and fix water softeners across London. No jargon, no hard sell.</p>
      </div>
    </section>
    <section class="section section--page">
      <div class="container">
        <div class="post-grid">
        {cards}
        </div>
      </div>
    </section>
    {contact_html(prefix)}
  </main>

  {footer_html(prefix)}

  {scripts_html(prefix)}
</body>
</html>
"""
    write(ROOT / "blog" / "index.html", out)


def build_404():
    prefix = "/"
    out = f"""{head_html(prefix, "Page not found | HomeWaterSoftener", "Sorry, we couldn't find that page.", f"{SITE}/404.html", [])}
<body>
  {header_html(prefix, has_contact=False)}
  <main id="main">
    <section class="page-hero page-hero--404">
      <div class="container text-center">
        <span class="eyebrow">Error 404</span>
        <h1>That page has gone down the drain</h1>
        <p class="lead lead--wide lead--center">Sorry, we can't find the page you were after. It may have moved, or the link might be wrong.</p>
        <div class="hero-ctas hero-ctas--center">
          <a href="/" class="btn btn-primary btn-lg">Back to the homepage</a>
          <a href="/hard-water-areas-london.html" class="btn btn-ghost btn-lg">Check your water hardness</a>
        </div>
        <p class="fine-print">Or call us on <a href="{TEL}">{PHONE}</a>, Monday to Friday, 8am&ndash;6pm.</p>
      </div>
    </section>
  </main>
  {footer_html(prefix)}
  {scripts_html(prefix)}
</body>
</html>
"""
    out = out.replace('<meta name="robots" content="index, follow, max-image-preview:large" />', '<meta name="robots" content="noindex" />')
    write(ROOT / "404.html", out)


# ---------------------------------------------------------------- homepage blocks + sitemap
def replace_block(text, name, new):
    pat = re.compile(rf"(<!-- {name}:START -->)(.*?)(\s*<!-- {name}:END -->)", re.S)
    if not pat.search(text):
        raise SystemExit(f"index.html is missing the {name} markers")
    return pat.sub(lambda m: m.group(1) + "\n" + new + m.group(3), text)


def update_index():
    f = ROOT / "index.html"
    text = f.read_text(encoding="utf-8")
    text = replace_block(text, "NAV", "        " + nav_html("", home=True))
    text = replace_block(text, "FOOTER", "      " + footer_cols("", home=True))
    latest = POSTS[:3]
    if latest:
        cards = "\n        ".join(post_card(p, "") for p in latest)
        block = f"""    <section class="section section-alt" id="latest-advice">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Advice</span>
          <h2>Latest from our advice pages</h2>
          <p>Straight answers to the questions we get asked most on survey visits.</p>
        </div>
        <div class="post-grid">
        {cards}
        </div>
        <p class="text-center"><a href="blog/" class="btn btn-ghost">All advice articles</a></p>
      </div>
    </section>"""
    else:
        block = ""
    text = replace_block(text, "LATEST", block)
    faqs = faqs_from(re.sub(r"\s*\n\s*", "", text.split('class="faq-list"')[1].split("</section>")[0]))
    ld = json.dumps({"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": faqs}, ensure_ascii=False, indent=2)
    text = replace_block(text, "FAQLD", f'  <script type="application/ld+json">\n  {ld}\n  </script>')
    f.write_text(text, encoding="utf-8")
    print("updated index.html blocks")


def build_sitemap():
    urls = [(f"{SITE}/", TODAY)]
    urls += [(f"{SITE}/{p['slug']}.html", p.get("modified", TODAY)) for p in PAGES]
    urls.append((f"{SITE}/blog/", POSTS[0]["date"] if POSTS else TODAY))
    urls += [(f"{SITE}/blog/{p['slug']}.html", p.get("modified", p["date"])) for p in POSTS]
    body = "\n".join(f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{d}</lastmod>\n  </url>" for u, d in urls)
    write(ROOT / "sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n{body}\n</urlset>\n')


if __name__ == "__main__":
    for p in PAGES:
        build_page(p)
    for p in POSTS:
        build_post(p)
    build_blog_index()
    build_404()
    update_index()
    build_sitemap()
    for p in PAGES + POSTS:
        t = full_title(p["title"])
        if len(t) > 60 or len(p["description"]) > 155:
            print(f"WARNING length: {p['slug']} title={len(t)} desc={len(p['description'])}")
