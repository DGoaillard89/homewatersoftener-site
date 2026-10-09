/* ==========================================================================
   API LAYER: the ONLY place the front end talks to a backend / CRM.
   Every form calls HWS.api.submitLead(type, data). When the CRM is ready,
   change this one function; the UI code doesn't need to change.
   ========================================================================== */
window.HWS = window.HWS || {};

HWS.api = {
  /**
   * @param {string} type  'contact_enquiry' | 'service_booking'
   * @param {object} data  flat key/value object of form fields
   * @returns {Promise<{ok: boolean}>}
   */
  async submitLead(type, data) {
    const payload = {
      type,
      submitted_at: new Date().toISOString(),
      page_url: window.location.href,
      ...data,
    };

    const endpoint = HWS.config.crm.endpoint;

    if (!endpoint) {
      // No backend yet: log the payload so you can see exactly what the CRM will receive.
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
