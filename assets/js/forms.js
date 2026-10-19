/* ==========================================================================
   FORMS: validation + submission for every <form class="lead-form">.
   Each form declares its CRM lead type via data-form-type.
   ========================================================================== */
(function () {
  const forms = document.querySelectorAll('form.lead-form');

  const MESSAGES = {
    valueMissing: 'This field is required.',
    typeMismatch: 'Please check the format.',
  };
  const UK_POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i;
  const UK_PHONE = /^(\+44\s?|0)[\d\s]{9,13}$/;

  function setFieldError(input, message) {
    const wrap = input.closest('.field') || input.closest('.checkbox');
    if (!wrap) return;
    wrap.classList.toggle('has-error', !!message);
    let err = wrap.querySelector('.field-error');
    if (message && wrap.classList.contains('field')) {
      if (!err) { err = document.createElement('span'); err.className = 'field-error'; wrap.appendChild(err); }
      err.textContent = message;
    } else if (err) {
      err.remove();
    }
  }

  function validateInput(input) {
    let msg = null;
    const v = input.value.trim();
    if (input.validity.valueMissing || (input.required && !v)) msg = MESSAGES.valueMissing;
    else if (input.validity.typeMismatch) msg = MESSAGES.typeMismatch;
    else if (input.name === 'postcode' && v && !UK_POSTCODE.test(v)) msg = 'Please enter a full UK postcode.';
    else if (input.type === 'tel' && v && !UK_PHONE.test(v)) msg = 'Please enter a valid UK phone number.';
    setFieldError(input, msg);
    return !msg;
  }

  forms.forEach((form) => {
    const errorBox = form.querySelector('[data-form-error]');
    const submitBtn = form.querySelector('[type="submit"]');
    const success = document.getElementById(form.id.replace('-form', '-success'));
    const fields = form.querySelectorAll('input:not([type="hidden"]):not([name="company_website"]), select, textarea');

    fields.forEach((f) => f.addEventListener('blur', () => f.closest('.has-error') && validateInput(f)));
    fields.forEach((f) => f.addEventListener('input', () => f.closest('.has-error') && validateInput(f)));

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      errorBox.hidden = true;

      const invalid = [...fields].filter((f) => !validateInput(f));
      let formError = null;
      if (form.dataset.formType === 'service_booking' && HWS.booking) formError = HWS.booking.validate();

      if (invalid.length || formError) {
        if (formError) { errorBox.textContent = formError; errorBox.hidden = false; }
        (invalid[0] || errorBox).focus?.();
        return;
      }

      const data = Object.fromEntries(new FormData(form).entries());
      if (data.postcode) data.postcode = HWS.api.formatPostcode(data.postcode);

      submitBtn.disabled = true;
      const label = submitBtn.textContent;
      submitBtn.textContent = 'Sending…';
      try {
        await HWS.api.submitLead(form.dataset.formType, data);
        form.hidden = true;
        success.hidden = false;
        success.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (err) {
        errorBox.innerHTML = 'Sorry, something went wrong and your request wasn\'t sent. Please try again, or call us on <a href="tel:+442036336064">020 3633 6064</a>.';
        errorBox.hidden = false;
        errorBox.focus();
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = label;
      }
    });
  });

  // "Book another" / "Send another"
  document.querySelectorAll('[data-reset-form]').forEach((btn) => btn.addEventListener('click', () => {
    const form = document.getElementById(btn.dataset.resetForm);
    form.reset();
    form.querySelector('[data-form-error]').hidden = true;
    if (form.dataset.formType === 'service_booking' && HWS.booking) HWS.booking.reset();
    btn.closest('.form-success').hidden = true;
    form.hidden = false;
  }));

  // Pre-fill the contact form from other sections (service cards, hardness dial)
  HWS.prefillContact = function ({ postcode, interest } = {}) {
    const contact = document.getElementById('contact-form');
    if (!contact) return;
    if (postcode) contact.querySelector('[name="postcode"]').value = postcode;
    if (interest) contact.querySelector('[name="interest"]').value = interest;
  };

  // Store the hardness result on the contact form so the CRM receives it
  document.addEventListener('hws:hardness', (e) => {
    const hidden = document.getElementById('c-hardness');
    if (hidden) hidden.value = e.detail.mgl;
    const sodium = document.getElementById('c-sodium');
    if (sodium) sodium.value = e.detail.sodiumSoftened ?? '';
  });
})();
