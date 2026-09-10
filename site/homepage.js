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

/* =========================================================
   Čísla na kartách
   =========================================================
   Dřív byla napevno v HTML (124 pracovníků, 38 poptávek, 21 firem).
   Teď se berou ze skutečných dat přes /api/statistiky, které si
   odpověď drží půl hodiny.

   Když je všechno na nule, karty se vůbec neukážou. Nula vedle nuly
   vypadá hůř než nic — a lhát nebudeme.

   Bez JavaScriptu se karty taky neukážou; to je schválně. Radši žádné
   číslo než číslo, které neplatí.
   ========================================================= */
(function () {
  'use strict';

  var box = document.getElementById('statistiky');
  if (!box) return;

  var OBNOVA = 30 * 60 * 1000;   // půl hodiny, stejně jako mezipaměť odpovědi

  function pred(kdy) {
    var minut = Math.round((Date.now() - new Date(kdy).getTime()) / 60000);
    if (!isFinite(minut) || minut < 1) return 'právě teď';
    if (minut < 60) return 'před ' + minut + ' ' + (minut === 1 ? 'minutou' : minut < 5 ? 'minutami' : 'minutami');
    var hodin = Math.round(minut / 60);
    if (hodin < 24) return 'před ' + hodin + ' ' + (hodin === 1 ? 'hodinou' : hodin < 5 ? 'hodinami' : 'hodinami');
    var dnu = Math.round(hodin / 24);
    return 'před ' + dnu + ' ' + (dnu === 1 ? 'dnem' : 'dny');
  }

  function ukaz(data) {
    if (!data || data.zadna) { box.hidden = true; return; }

    [['lide', data.lide], ['poptavky', data.poptavky], ['firmy', data.firmy]].forEach(function (dvojice) {
      var karta = box.querySelector('[data-karta="' + dvojice[0] + '"]');
      var cislo = box.querySelector('[data-stat="' + dvojice[0] + '"]');
      if (cislo) cislo.textContent = dvojice[1];
      /* Kartu s nulou schováme — vedle skutečných čísel by působila
         jako chyba, a sama o sobě nic neříká. */
      if (karta) karta.hidden = !dvojice[1];
    });

    var poznamka = box.querySelector('[data-karta="posledni"]');
    var kdy = box.querySelector('[data-stat="posledni"]');
    if (poznamka) poznamka.hidden = !data.posledni;
    if (kdy && data.posledni) kdy.textContent = 'přidána ' + pred(data.posledni);

    box.hidden = false;
  }

  function nacti() {
    fetch('/api/statistiky', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(ukaz)
      .catch(function () { box.hidden = true; });
  }

  nacti();
  setInterval(nacti, OBNOVA);
})();
