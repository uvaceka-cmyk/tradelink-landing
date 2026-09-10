/* =========================================================
   TradeLink — přechod mezi scénami (atrium → recepce)
   Žádná SPA, žádná knihovna: jen krátká CSS animace před
   běžnou navigací na další HTML stránku, a jemné probuzení
   scény po příchodu. Respektuje prefers-reduced-motion.
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var EXIT_MS = 1150;

  /* ---------- příchod na scénu ---------- */
  var enter = document.querySelector('[data-enter]');
  if (enter) {
    if (reduced) {
      enter.classList.add('is-entered');
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { enter.classList.add('is-entered'); });
      });
    }
  }

  /* ---------- odchod ze scény před navigací ---------- */
  var links = document.querySelectorAll('[data-transition]');
  var leaving = false;

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      var href = link.getAttribute('href');
      if (!href || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || leaving) return;

      e.preventDefault();
      leaving = true;

      if (reduced) {
        window.location.href = href;
        return;
      }

      link.classList.add('is-pressed');
      /* kamera přijede k pultu; fotka recepce se prolne přes atrium.
         Nav a výtah stojí mimo animované vrstvy a dál reagují. */
      document.body.classList.add('is-leaving');
      window.setTimeout(function () { window.location.href = href; }, EXIT_MS);
    });
  });
})();
