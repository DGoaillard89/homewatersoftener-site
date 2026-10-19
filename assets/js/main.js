/* ==========================================================================
   MAIN: header, mobile nav, quote buttons, scroll reveal
   ========================================================================== */
(function () {
  // Sticky header shadow
  const header = document.querySelector('.site-header');
  const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile nav
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('main-nav');
  const setNav = (open) => {
    nav.classList.toggle('is-open', open);
    toggle.setAttribute('aria-expanded', String(open));
  };
  toggle.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  nav.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setNav(false)));

  // Service "Get a quote" buttons → prefill + scroll to contact
  document.querySelectorAll('[data-quote]').forEach((btn) => btn.addEventListener('click', (e) => {
    const contact = document.getElementById('contact');
    if (!contact) return;
    e.preventDefault();
    HWS.prefillContact({ interest: btn.dataset.quote });
    contact.scrollIntoView({ behavior: 'smooth' });
  }));

  // Scroll reveal
  const revealTargets = document.querySelectorAll('.section-head, .service-card, .step, .review-card, .dial-card, .booking-card, .contact-card, .post-card, main > .section:not(.section--page) .faq-list details');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); io.unobserve(entry.target); }
    }), { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealTargets.forEach((el, i) => {
      el.classList.add('reveal');
      el.style.transitionDelay = `${(i % 4) * 80}ms`;
      io.observe(el);
    });
  }

  // Floating "Book a service" button: shows once past the hero, hides when booking/contact/footer are on screen
  const fab = document.getElementById('book-fab');
  const hero = document.querySelector('.hero');
  if (fab && 'IntersectionObserver' in window) {
    const onScreen = new Set();
    const update = () => {
      const show = onScreen.size === 0;
      fab.classList.toggle('is-visible', show);
      fab.setAttribute('aria-hidden', String(!show));
      fab.tabIndex = show ? 0 : -1;
    };
    const fabIO = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? onScreen.add(e.target) : onScreen.delete(e.target)));
      update();
    }, { threshold: 0.05 });
    [hero, document.getElementById('booking'), document.getElementById('contact'), document.querySelector('.site-footer')]
      .filter(Boolean).forEach((el) => fabIO.observe(el));

    // After jumping to the calendar, put keyboard focus on the first bookable day
    fab.addEventListener('click', () => {
      setTimeout(() => document.querySelector('.cal-day:not(:disabled)')?.focus({ preventScroll: true }), 600);
    });
  }

  // FAQ structured data for Google, generated from the visible FAQ so the two never drift apart
  const faqs = [...document.querySelectorAll('.faq-list details')].map((d) => ({
    '@type': 'Question',
    name: d.querySelector('summary').textContent.trim(),
    acceptedAnswer: { '@type': 'Answer', text: d.querySelector('p').textContent.trim() },
  }));
  const hasStaticFaq = [...document.querySelectorAll('script[type="application/ld+json"]')].some((s) => s.textContent.includes('"FAQPage"'));
  if (faqs.length && !hasStaticFaq) {
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs });
    document.head.appendChild(ld);
  }

  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
})();
