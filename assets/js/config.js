/* ==========================================================================
   SITE CONFIG
   Business rules in one place. Change these without touching component code.
   ========================================================================== */
window.HWS = window.HWS || {};

HWS.config = {
  booking: {
    leadTimeDays: 3,          // earliest bookable day = today + N (72-hour minimum notice)
    monthsAhead: 3,           // how far ahead the calendar can go
    closedWeekdays: [0, 6],   // 0 = Sunday, 6 = Saturday
    closedDates: [            // bank holidays etc. (YYYY-MM-DD)
      '2026-12-25', '2026-12-26', '2026-12-28', '2027-01-01',
    ],
  },

  // CRM integration (backend not built yet).
  // When ready, set an endpoint and api.js will POST JSON to it.
  crm: {
    endpoint: null,           // planned: '/api/lead' (Cloudflare Worker → Airtable)
  },
};
