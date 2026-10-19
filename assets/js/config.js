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

  // CRM integration: both forms POST JSON (mapped in api.js) to the shared
  // konda-enquiries Cloudflare Worker, which writes the lead to Airtable.
  // Set to null to log payloads to the console instead (local testing).
  crm: {
    endpoint: 'https://konda-enquiries.daniel-10c.workers.dev',
  },
};
