/* ==========================================================================
   BOOKING CALENDAR: pick a preferred day + time slot
   Rules (lead time, closed days, range) live in config.js.
   ========================================================================== */
(function () {
  const rules = HWS.config.booking;
  const grid = document.getElementById('cal-grid');
  const title = document.getElementById('cal-title');
  const prevBtn = document.getElementById('cal-prev');
  const nextBtn = document.getElementById('cal-next');
  const slotBtns = document.querySelectorAll('.slot');
  const summary = document.getElementById('booking-summary');
  const summaryDate = document.getElementById('summary-date');
  const summarySlot = document.getElementById('summary-slot');
  const fieldDate = document.getElementById('field-date');
  const fieldSlot = document.getElementById('field-slot');
  if (!grid) return;

  const SLOT_LABELS = { morning: 'Morning (8am–12pm)', afternoon: 'Afternoon (12pm–5pm)', any: 'Any time' };

  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const today = startOfDay(new Date());
  const earliest = new Date(today); earliest.setDate(today.getDate() + rules.leadTimeDays);
  const firstMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastMonth = new Date(today.getFullYear(), today.getMonth() + rules.monthsAhead, 1);
  const latest = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0);

  let view = new Date(firstMonth);
  let selectedDate = null;
  let selectedSlot = null;

  const isBookable = (d) =>
    d >= earliest && d <= latest &&
    !rules.closedWeekdays.includes(d.getDay()) &&
    !rules.closedDates.includes(iso(d));

  function render() {
    title.textContent = view.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
    prevBtn.disabled = view <= firstMonth;
    nextBtn.disabled = view >= lastMonth;
    grid.innerHTML = '';

    const year = view.getFullYear(), month = view.getMonth();
    const offset = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    for (let i = 0; i < offset; i++) {
      const pad = document.createElement('span');
      pad.className = 'cal-empty';
      grid.appendChild(pad);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cal-day';
      btn.textContent = day;
      btn.dataset.date = iso(date);
      btn.setAttribute('aria-label', date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' }));
      if (!isBookable(date)) btn.disabled = true;
      if (+date === +today) btn.classList.add('is-today');
      if (selectedDate && +date === +selectedDate) {
        btn.classList.add('is-selected');
        btn.setAttribute('aria-pressed', 'true');
      }
      btn.addEventListener('click', () => { selectedDate = date; render(); updateSummary(); });
      grid.appendChild(btn);
    }
  }

  function updateSummary() {
    fieldDate.value = selectedDate ? iso(selectedDate) : '';
    fieldSlot.value = selectedSlot || '';
    summary.classList.toggle('is-set', !!selectedDate);
    summaryDate.textContent = selectedDate
      ? selectedDate.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      : 'No date selected';
    summarySlot.textContent = selectedSlot
      ? SLOT_LABELS[selectedSlot]
      : selectedDate ? 'Now choose a preferred time' : 'Pick a day from the calendar';
  }

  prevBtn.addEventListener('click', () => { view.setMonth(view.getMonth() - 1); render(); });
  nextBtn.addEventListener('click', () => { view.setMonth(view.getMonth() + 1); render(); });

  slotBtns.forEach((btn) => btn.addEventListener('click', () => {
    selectedSlot = btn.dataset.slot;
    slotBtns.forEach((b) => b.setAttribute('aria-checked', String(b === btn)));
    updateSummary();
  }));

  // Exposed so forms.js can validate and reset the booking without knowing calendar internals
  HWS.booking = {
    validate() {
      if (!selectedDate) return 'Please choose a preferred day from the calendar.';
      if (!selectedSlot) return 'Please choose a preferred time slot.';
      return null;
    },
    reset() {
      selectedDate = null; selectedSlot = null;
      slotBtns.forEach((b) => b.setAttribute('aria-checked', 'false'));
      view = new Date(firstMonth);
      render(); updateSummary();
    },
  };

  render();
  updateSummary();
})();
