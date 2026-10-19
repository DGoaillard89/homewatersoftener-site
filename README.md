# HomeWaterSoftener.co.uk: front-end UI

Static site (HTML/CSS/vanilla JS, no build step needed to serve it). Open `index.html`, or run
`python3 tools/dev-server.py` (no-cache preview server) and visit http://localhost:8080.

## Where to change things
| What | File |
|---|---|
| Colours, fonts, spacing, radii | `assets/css/tokens.css` |
| Component styles | `assets/css/styles.css` |
| Copy / sections | `index.html` |
| Booking rules (lead time, closed days, bank holidays) | `assets/js/config.js` |
| Postcode hardness + sodium values (PLACEHOLDER, replace with supplier data) | `assets/js/hardness-data.js` |
| CRM hookup (single integration point) | `assets/js/api.js` → `submitLead()` |

## Lead payloads (konda-enquiries relay)
Both forms submit through `HWS.api.submitLead(type, data)`; `assets/js/api.js` is the single mapping point.
It POSTs JSON to `HWS.config.crm.endpoint` (`https://konda-enquiries.daniel-10c.workers.dev`) with exactly:
`name`, `email`, `phone`, `postcode` (upper case, single space), `message`, `enquiryType` ("Water Softeners"),
plus the honeypot `company_website` (hidden field; the relay drops the lead if it's filled).
- `contact_enquiry`: name = first + last; message = visitor's message + "Interested in: ..." + the approximate
  hardness / softened-sodium estimate from the postcode checker, if used.
- `service_booking`: name = full_name; message = "Service booking request" + preferred date (e.g. "Tue 3 Nov 2026"),
  slot, service type, system model and notes.
Fields are trimmed to the relay limits (name 120, email 200, phone 40, postcode 12, message 5000). On failure the
form shows an error asking people to call 020 3633 6064. Set `crm.endpoint` to `null` to log payloads to the console
instead when testing locally. **Never test against the live relay**: it writes real CRM records.

## Pages, blog and the builder
Inner pages and blog posts are generated from `_content/` by `python3 tools/build.py` (no dependencies).
Edit the source in `_content/pages/*.html` or `_content/blog/*.html` (first line JSON metadata, then HTML body), then
run the builder. It also refreshes `sitemap.xml`, `404.html` and the marked NAV / FOOTER / LATEST / FAQLD blocks in
`index.html`. Links to blog posts that don't exist yet are rendered as plain text until the post is written.

## Before launch
- Replace placeholder hardness/sodium data (`assets/js/hardness-data.js`) with supplier figures. The UI currently
  labels them as an approximate guide.
- Add genuine reviews before un-hiding `#reviews` in `index.html` (currently hidden placeholder text).
- Confirm the DS Water legal entity name / company number for the footer, and the dswater.co.uk link.

## Image credits
Photos from Unsplash (free licence): hero family kitchen, rainfall shower head, soap lather, baby bath, tap splash, glass of water. Swap in your own job photos when available.

## Hosting
- **GitHub Pages** from the `main` branch root, custom domain `homewatersoftener.co.uk` (see `CNAME`).
- Forms go to the shared **konda-enquiries** Cloudflare Worker relay (used by all the DS Water sites), which writes
  to Airtable and fills the Website column from the Origin header. The relay is managed separately: don't change it
  from this repo. No Turnstile or server of our own is needed.
- **Booking rules:** weekdays only, minimum 72 hours' notice, bank holidays in `config.js`. Saturday requests go through the contact form.
- **Testing the dial:** `?postcode=W4` (or any outcode / full postcode) runs the checker on load.
- **Parent brand:** HomeWaterSoftener.co.uk is a trading name of DS Water (not separately registered).

## SEO
- **H1** is the keyword line above the hero tagline. The big "Softer water, happier home." is styled text (`.hero-title`), not a heading.
- **Structured data:** `WebSite` + `HomeAndConstructionBusiness` (address, geo, phone, hours, areas, services, parentOrganization DS Water) on the homepage; `Service`, `WebPage`, `BreadcrumbList`, `FAQPage` and `BlogPosting` on inner pages, all written statically by `tools/build.py` (re-run it after editing an FAQ).
- **Social sharing:** `assets/img/og-image.png` (1200×630). Icons: `favicon.svg`, `apple-touch-icon.png`.
- `robots.txt` + `sitemap.xml` at the root. Update `<lastmod>` when content changes.
- **At launch:**
  - Point DNS at GitHub Pages (apex A/AAAA records + `www` CNAME) and tick "Enforce HTTPS" in the Pages settings.
  - Add the site to Google Search Console and submit the sitemap.
  - Create or verify the Google Business Profile at W4 5PY, using the same name, phone and address as the site.
