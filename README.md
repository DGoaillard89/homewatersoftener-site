# HomeWaterSoftener.co.uk: front-end UI

Static design prototype (HTML/CSS/vanilla JS, no build step). Open `index.html`, or run
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

## Lead payloads (for CRM mapping)
Every form posts a flat JSON object via `HWS.api.submitLead(type, data)`:
- `contact_enquiry`: first_name, last_name, email, phone, postcode, interest, message, consent, water_hardness_mgl, softened_sodium_mgl, lead_source
- `service_booking`: preferred_date (YYYY-MM-DD), preferred_slot, service_type, full_name, postcode, phone, email, system_model, notes

Plus `type`, `submitted_at`, `page_url`. Until `config.crm.endpoint` is set, payloads are logged to the browser console.

## Before launch
- Real phone, email, company number, privacy policy
- Replace placeholder reviews and hardness/sodium data
- Confirm DS Water legal entity name + company number, and the dswater.co.uk link

## Image credits
Photos from Unsplash (free licence): hero family kitchen, rainfall shower head, soap lather, baby bath, tap splash, glass of water. Swap in your own job photos when available.

## Developer handover: current status
- **Front end only.** No backend yet. Forms log their payload to the browser console (`assets/js/api.js`).
- **Agreed production plan:**
  - Static files on a Hetzner server (Caddy), fronted by Cloudflare (proxied DNS, SSL Full strict).
  - A Cloudflare Worker on `/api/lead` that verifies Turnstile and writes the lead to **Airtable** (Kanban interface grouped by `Status`).
  - Set `HWS.config.crm.endpoint = '/api/lead'` in `assets/js/config.js` once the Worker exists. The Airtable token must stay server-side.
- **Booking rules:** weekdays only, minimum 72 hours' notice, bank holidays in `config.js`. Saturday requests go through the contact form.
- **Testing the dial:** `?postcode=W4` (or any outcode / full postcode) runs the checker on load.
- **Parent brand:** HomeWaterSoftener.co.uk is a trading name of DS Water (not separately registered).
