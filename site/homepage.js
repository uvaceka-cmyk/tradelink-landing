/* =========================================================
   TradeLink — homepage (atrium)
   Mobilní bottom sheet s patry výtahu. Jen pro index.html.
   ========================================================= */
(function () {
  'use strict';

  var toggle = document.querySelector('.floors-toggle');
  var sheet = document.getElementById('floors-sheet');
  if (!toggle || !sheet) return;

  var closers = sheet.querySelectorAll('[data-sheet-close]');
  var lastFocused = null;

  function open() {
    lastFocused = document.activeElement;
    sheet.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    document.addEventListener('keydown', onKeydown);
  }

  function close() {
    sheet.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    document.removeEventListener('keydown', onKeydown);
    if (lastFocused) lastFocused.focus();
  }

  function onKeydown(e) {
    if (e.key === 'Escape') close();
  }

  toggle.addEventListener('click', function () {
    if (sheet.hidden) open(); else close();
  });

  closers.forEach(function (el) {
    el.addEventListener('click', close);
  });
})();
