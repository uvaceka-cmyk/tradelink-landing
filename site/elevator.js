/* =========================================================
   TradeLink — kinematický přechod výtahem (patro → patro)
   Žádná SPA: skutečná navigace na další HTML stránku, ale
   celý viewport zůstává po dobu přechodu zakrytý zavřenými
   dveřmi, takže se nikdy neukáže bílý záblesk ani přeskok
   rozložení. Doprovodný synchronní skript hned za <div
   class="elevator-doors"> na cílové stránce zajišťuje, že
   dveře jsou zavřené už při prvním vykreslení.
   Šablona pro další patra — stačí patru přidat vlastní
   data-elevator-floor na <body> a odkaz s
   data-elevator-transition / data-floor-num.
   ========================================================= */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var STORAGE_KEY = 'tl-elevator-arrive';
  var CLOSE_MS = 780;
  var HOLD_MS = 340;
  var OPEN_MS = 900;

  var overlay = document.querySelector('.elevator-doors');
  if (!overlay) return;

  function setDuration(ms) {
    overlay.style.setProperty('--door-dur', ms + 'ms');
  }

  /* ---------- příjezd: dveře jsou už od prvního snímku zavřené ---------- */
  if (overlay.classList.contains('is-holding')) {
    if (reduced) {
      openDoors();
    } else {
      window.setTimeout(openDoors, HOLD_MS);
    }
  }

  function openDoors() {
    setDuration(OPEN_MS);
    overlay.classList.remove('is-holding');
    /* transition:none se musí odstranit v samostatném zúčtování stylů,
       jinak prohlížeč přechod na transform přeskočí */
    overlay.classList.remove('is-instant');
    void overlay.offsetWidth;
    overlay.classList.remove('is-closed');
    document.body.classList.remove('is-elevator-leaving');
    window.setTimeout(function () {
      overlay.classList.remove('is-active');
    }, reduced ? 0 : OPEN_MS + 60);
  }

  /* ---------- odjezd: klik na patro s data-elevator-transition ---------- */
  var links = document.querySelectorAll('[data-elevator-transition]');
  var leaving = false;

  links.forEach(function (link) {
    link.addEventListener('click', function (e) {
      if (leaving || link.classList.contains('is-here')) return;
      var href = link.getAttribute('href');
      var num = link.getAttribute('data-floor-num');
      if (!href || !num || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

      e.preventDefault();
      leaving = true;

      var sheet = document.getElementById('floors-sheet');
      if (sheet && !sheet.hidden) sheet.hidden = true;

      if (reduced) {
        try { sessionStorage.setItem(STORAGE_KEY, num); } catch (err) {}
        window.location.href = href;
        return;
      }

      document.body.classList.add('is-elevator-leaving');
      setDuration(CLOSE_MS);
      overlay.classList.add('is-active');
      void overlay.offsetWidth;
      overlay.classList.add('is-closed');

      window.setTimeout(function () {
        overlay.classList.add('is-holding');
        window.setTimeout(function () {
          try { sessionStorage.setItem(STORAGE_KEY, num); } catch (err) {}
          window.location.href = href;
        }, HOLD_MS);
      }, CLOSE_MS);
    });
  });
})();
