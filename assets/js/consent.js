/* ==========================================================================
   CONSENT + MEASUREMENT: Google Tag Manager behind a cookie banner.

   GTM_ID is empty on purpose. While it's empty nothing loads, no banner shows
   and no cookies are set: the site behaves exactly as it always has.
   To switch tracking on, paste the agency's container ID, e.g. "GTM-ABC1234".

   "Basic" Consent Mode v2: Google's tags are only injected after the visitor
   says yes. Consent defaults (all denied) are set first, then updated from the
   visitor's choice, which is kept in localStorage "cookie_consent".

   Also provides HWS.track(event, params) → dataLayer, phone_click events, and
   ad-click attribution (gclid / utm_*) for the enquiry message.
   ========================================================================== */
window.HWS = window.HWS || {};

(function () {
  const GTM_ID = ''; // ← agency: put the GTM container ID here, e.g. 'GTM-ABC1234'
  const STORE_KEY = 'cookie_consent';
  const ATTRIB_KEY = 'ad_attrib';
  const ATTRIB_PARAMS = ['gclid', 'gbraid', 'wbraid', 'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];

  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  // Events go to the dataLayer whether or not GTM is loaded (harmless if it isn't).
  HWS.track = function (event, params) {
    window.dataLayer.push(Object.assign({ event }, params || {}));
  };

  /* ------------------------------------------------------------ stored choice */
  function readChoice() {
    try {
      const c = JSON.parse(localStorage.getItem(STORE_KEY));
      return c && c.v === 1 ? c : null;
    } catch (e) { return null; }
  }
  function saveChoice(analytics, ads) {
    const c = { v: 1, analytics: !!analytics, ads: !!ads, ts: new Date().toISOString() };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(c)); } catch (e) { /* private mode */ }
    return c;
  }

  /* ------------------------------------------------------------ attribution */
  const attrib = {};
  try { Object.assign(attrib, JSON.parse(sessionStorage.getItem(ATTRIB_KEY)) || {}); } catch (e) { /* none */ }
  const params = new URLSearchParams(location.search);
  ATTRIB_PARAMS.forEach((k) => { if (params.get(k)) attrib[k] = params.get(k).slice(0, 200); });

  function persistAttrib(choice) {
    if (!choice || !(choice.ads || choice.analytics) || !Object.keys(attrib).length) return;
    try { sessionStorage.setItem(ATTRIB_KEY, JSON.stringify(attrib)); } catch (e) { /* ignore */ }
  }

  // Appended to the enquiry message so a lead can be matched to the ad that brought it in.
  HWS.attributionNote = function () {
    const parts = ATTRIB_PARAMS.filter((k) => attrib[k]).map((k) => `${k}=${attrib[k]}`);
    return parts.length ? `\n\n--\nHow they found us: ${parts.join(', ')}` : '';
  };

  /* ------------------------------------------------------------ Google tags */
  let gtmLoaded = false;
  function applyConsent(choice) {
    gtag('consent', 'update', {
      analytics_storage: choice.analytics ? 'granted' : 'denied',
      ad_storage: choice.ads ? 'granted' : 'denied',
      ad_user_data: choice.ads ? 'granted' : 'denied',
      ad_personalization: choice.ads ? 'granted' : 'denied',
    });
    persistAttrib(choice);
    if ((choice.analytics || choice.ads) && !gtmLoaded) {
      gtmLoaded = true;
      window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });
      const s = document.createElement('script');
      s.async = true;
      s.src = `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(GTM_ID)}`;
      document.head.appendChild(s);
    }
  }

  /* ------------------------------------------------------------ phone clicks */
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="tel:"]');
    if (!a) return;
    let where = 'body';
    if (a.closest('.mobile-cta-bar')) where = 'mobile_bar';
    else if (a.closest('.site-header')) where = 'header';
    else if (a.closest('.hero, .page-hero')) where = 'hero';
    else if (a.closest('.site-footer, .parent-brand')) where = 'footer';
    HWS.track('phone_click', { link_location: where, page_path: location.pathname });
  });

  if (!GTM_ID) {
    // Tracking is off: hide any "Cookie settings" links, there's nothing to set.
    document.querySelectorAll('[data-cookie-settings]').forEach((el) => { el.hidden = true; });
    return;
  }

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    functionality_storage: 'granted',
    security_storage: 'granted',
    wait_for_update: 500,
  });

  /* ------------------------------------------------------------ banner */
  const root = document.body.dataset.root || '';
  let banner;
  let lastFocus;

  function buildBanner() {
    const privacy = (document.querySelector('a[href$="privacy.html"]') || {}).getAttribute?.('href') || `${root}privacy.html`;
    document.body.insertAdjacentHTML('beforeend', `
      <div class="cookie-banner" id="cookie-banner" role="dialog" aria-modal="false" aria-labelledby="cookie-title" aria-describedby="cookie-desc" hidden>
        <div class="cookie-inner">
          <div class="cookie-copy">
            <h2 class="cookie-title" id="cookie-title">Cookies, if that's OK</h2>
            <p id="cookie-desc">We'd like to use Google Analytics to see how people use the site, and Google Ads cookies to measure our adverts and show them to people who've visited before. Nothing's set unless you say yes. <a href="${privacy}#cookies">More in our privacy notice</a>.</p>
            <div class="cookie-choices" id="cookie-choices" hidden>
              <label class="cookie-toggle"><input type="checkbox" id="cookie-analytics" /> <span><strong>Analytics</strong> How many people visit and which pages help.</span></label>
              <label class="cookie-toggle"><input type="checkbox" id="cookie-ads" /> <span><strong>Advertising</strong> Measuring our Google ads and showing them to past visitors.</span></label>
            </div>
          </div>
          <div class="cookie-actions">
            <button type="button" class="btn btn-primary btn-sm" data-cookie="accept">Accept all</button>
            <button type="button" class="btn btn-primary btn-sm" data-cookie="reject">Reject all</button>
            <button type="button" class="btn btn-ghost btn-sm" data-cookie="choose" aria-expanded="false" aria-controls="cookie-choices">Choose</button>
            <button type="button" class="btn btn-ghost btn-sm" data-cookie="save" hidden>Save choices</button>
          </div>
        </div>
      </div>`);
    banner = document.getElementById('cookie-banner');
    const choices = document.getElementById('cookie-choices');
    const chooseBtn = banner.querySelector('[data-cookie="choose"]');
    const saveBtn = banner.querySelector('[data-cookie="save"]');

    banner.addEventListener('click', (e) => {
      const action = e.target.closest('[data-cookie]')?.dataset.cookie;
      if (!action) return;
      if (action === 'choose') {
        const open = choices.hidden;
        choices.hidden = !open;
        saveBtn.hidden = !open;
        chooseBtn.setAttribute('aria-expanded', String(open));
        if (open) document.getElementById('cookie-analytics').focus();
        return;
      }
      let c;
      if (action === 'accept') c = saveChoice(true, true);
      else if (action === 'reject') c = saveChoice(false, false);
      else c = saveChoice(document.getElementById('cookie-analytics').checked, document.getElementById('cookie-ads').checked);
      applyConsent(c);
      closeBanner();
    });
    banner.addEventListener('keydown', (e) => { if (e.key === 'Escape' && readChoice()) closeBanner(); });
  }

  function openBanner(focus) {
    if (!banner) buildBanner();
    const c = readChoice();
    document.getElementById('cookie-analytics').checked = !!(c && c.analytics);
    document.getElementById('cookie-ads').checked = !!(c && c.ads);
    banner.hidden = false;
    document.body.classList.add('has-cookie-banner');
    if (focus) {
      lastFocus = document.activeElement;
      banner.querySelector('[data-cookie="accept"]').focus();
    }
  }
  function closeBanner() {
    banner.hidden = true;
    document.body.classList.remove('has-cookie-banner');
    if (lastFocus && lastFocus.focus) lastFocus.focus();
    lastFocus = null;
  }

  document.querySelectorAll('[data-cookie-settings]').forEach((el) => {
    el.hidden = false;
    el.addEventListener('click', (e) => { e.preventDefault(); openBanner(true); });
  });

  const existing = readChoice();
  if (existing) applyConsent(existing);
  else openBanner(false);
})();
