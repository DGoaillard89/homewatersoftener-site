/* ==========================================================================
   API LAYER: the ONLY place the front end talks to a backend / CRM.
   Every form calls HWS.api.submitLead(type, data). This file maps the form
   fields onto the shared "konda-enquiries" relay (Cloudflare Worker → Airtable).

   The relay accepts exactly: name, email, phone, postcode, message,
   enquiryType (all required, non-empty strings) + optional honeypot
   company_website (if filled, the relay silently drops the lead).
   ========================================================================== */
window.HWS = window.HWS || {};

(function () {
  const ENQUIRY_TYPE = 'Water Softeners';

  const INTERESTS = {
    'water-softener': 'Water softener',
    'carbon-filter': 'Under-sink carbon filter',
    'reverse-osmosis': 'Reverse osmosis',
    'uv-lamp': 'UV lamp / steriliser',
    'servicing': 'Servicing / repair',
    'not-sure': 'Not sure, please advise',
  };
  const SERVICES = {
    'softener-annual-service': 'Water softener: annual service',
    'softener-repair': 'Water softener: fault / repair',
    'carbon-filter-change': 'Carbon filter: cartridge change',
    'ro-service': 'Reverse osmosis: filter & membrane service',
    'uv-lamp-replacement': 'UV: lamp & sleeve replacement',
    'other': 'Something else',
  };
  // Heading line for a service booking enquiry, by service type
  const SERVICE_TITLES = {
    'softener-annual-service': 'Softener Service request',
    'softener-repair': 'Softener Repair request',
    'carbon-filter-change': 'Carbon Filter Change request',
    'ro-service': 'Reverse Osmosis Service request',
    'uv-lamp-replacement': 'UV Lamp Replacement request',
    'other': 'Service request',
  };
  const SLOTS = {
    morning: 'AM preferred (8am–12pm)',
    afternoon: 'PM preferred (12pm–5pm)',
    any: 'Any time (flexible)',
  };
  const LEAD_SOURCE = 'homewatersoftener.co.uk';

  const str = (v) => (v == null ? '' : String(v).trim());
  // Relay field limits (characters). Anything longer is trimmed so the relay never rejects a lead.
  const LIMITS = { name: 120, email: 200, phone: 40, postcode: 12, message: 5000 };
  const clamp = (payload) => {
    Object.entries(LIMITS).forEach(([k, max]) => { if (payload[k].length > max) payload[k] = payload[k].slice(0, max); });
    return payload;
  };

  /** "sw111aa" → "SW11 1AA" (capitals, single space before the inward code) */
  function formatPostcode(v) {
    const pc = str(v).toUpperCase().replace(/\s+/g, '');
    return pc.length > 3 ? `${pc.slice(0, -3)} ${pc.slice(-3)}` : pc;
  }

  /** "2026-11-04" → "Wed 4 Nov 2026" */
  function formatDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso));
    if (!m) return str(iso);
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).formatToParts(d);
    const get = (t) => parts.find((p) => p.type === t)?.value;
    return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}`;
  }

  /** "2026-10-27" → "Tuesday 27th October 2026" */
  function formatLongDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(iso));
    if (!m) return str(iso);
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    const day = +m[3];
    const suffix = (day % 100 >= 11 && day % 100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' }[day % 10] || 'th');
    const fmt = (opts) => new Intl.DateTimeFormat('en-GB', { ...opts, timeZone: 'UTC' }).format(d);
    return `${fmt({ weekday: 'long' })} ${day}${suffix} ${fmt({ month: 'long' })} ${m[1]}`;
  }

  /** Turn a form's fields into the relay's payload. Pure function, so it can be tested. */
  function buildPayload(type, data) {
    const base = {
      email: str(data.email),
      phone: str(data.phone),
      postcode: formatPostcode(data.postcode),
      enquiryType: ENQUIRY_TYPE,
      company_website: str(data.company_website),
    };

    if (type === 'service_booking') {
      // Reads as a standard enquiry, e.g.
      //   Softener Service request / Tuesday 27th October 2026 / PM preferred (12pm–5pm) / Name: … / Email: … / …
      const lines = [SERVICE_TITLES[data.service_type] || 'Service request'];
      if (str(data.preferred_date)) lines.push(formatLongDate(data.preferred_date));
      if (str(data.preferred_slot)) lines.push(SLOTS[data.preferred_slot] || str(data.preferred_slot));
      lines.push(
        '',
        `Name: ${str(data.full_name)}`,
        `Email: ${base.email}`,
        `Phone: ${base.phone}`,
        `Postcode: ${base.postcode}`,
      );
      if (str(data.service_type)) lines.push(`Service: ${SERVICES[data.service_type] || str(data.service_type)}`);
      if (str(data.system_model)) lines.push(`System make / model: ${str(data.system_model)}`);
      lines.push(`Lead source: ${LEAD_SOURCE} (service booking calendar)`);
      if (str(data.notes)) lines.push('', `Notes: ${str(data.notes)}`);
      return clamp({ name: str(data.full_name), ...base, message: lines.join('\n') });
    }

    // contact_enquiry (default)
    const lines = [];
    if (str(data.message)) lines.push(str(data.message), '');
    if (str(data.interest)) lines.push(`Interested in: ${INTERESTS[data.interest] || str(data.interest)}`);
    if (str(data.water_hardness_mgl)) lines.push(`Water hardness from postcode checker (approx. area estimate): ~${str(data.water_hardness_mgl)} mg/l CaCO3`);
    if (str(data.softened_sodium_mgl)) lines.push(`Estimated sodium once softened (approx.): ~${str(data.softened_sodium_mgl)} mg/l`);
    const message = lines.join('\n').trim() || 'Quote request from the website contact form (no message left).';
    const name = [str(data.first_name), str(data.last_name)].filter(Boolean).join(' ');
    return clamp({ name, ...base, message });
  }

  HWS.api = {
    buildPayload,
    formatPostcode,
    formatDate,
    formatLongDate,

    /**
     * @param {string} type  'contact_enquiry' | 'service_booking'
     * @param {object} data  flat key/value object of form fields
     * @returns {Promise<{ok: boolean}>}  rejects on network / relay error
     */
    async submitLead(type, data) {
      const payload = buildPayload(type, data);
      const endpoint = HWS.config.crm.endpoint;

      if (!endpoint) {
        console.info('[HWS] Lead captured (no CRM endpoint configured):', payload);
        await new Promise((r) => setTimeout(r, 700));
        return { ok: true };
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Submission failed (${res.status})`);
      return { ok: true };
    },
  };
})();
