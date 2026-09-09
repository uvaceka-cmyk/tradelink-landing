/* =========================================================
   TradeLink — sdílený skript
   1) navigace (hamburger)
   2) hák pro pozdější animace kamery
   3) průchod: typ návštěvníka → obor → podobor → výsledek
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 0) odkazy z e-mailů ----------
     Když Supabase přesměruje potvrzení účtu nebo obnovu hesla na
     úvodní stránku (fallback na Site URL), pošleme návštěvníka tam,
     kde se to má dokončit. Token si nese s sebou. */
  (function routeAuthLink() {
    var hash = window.location.hash || '';
    var query = window.location.search || '';
    var type = (hash.match(/[#&]type=([a-z_]+)/) || query.match(/[?&]type=([a-z_]+)/) || [])[1];
    if (!type) return;

    var path = window.location.pathname;
    var target = null;

    if (type === 'recovery' && !/nove-heslo/.test(path)) target = 'nove-heslo.html';
    if ((type === 'signup' || type === 'email' || type === 'email_change') && !/prihlaseni/.test(path)) {
      target = 'prihlaseni.html' + (query ? query + '&potvrzeno=1' : '?potvrzeno=1');
    }
    if (target) window.location.replace(target + (target.indexOf('?') < 0 ? query : '') + hash);
  })();

  /* ---------- 1) navigace ---------- */
  var toggle = document.querySelector('.nav__toggle');
  var menu = document.getElementById('nav-menu');

  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = menu.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') {
        menu.classList.remove('is-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---------- 2) hák pro animace ----------
     Každá scéna dostane --scene-progress (0 = pod okem, 1 = nad ním).
     GSAP / ScrollTrigger se sem později napojí místo tohoto výpočtu,
     nebo si ho může rovnou převzít.                                   */
  var scenes = document.querySelectorAll('[data-scene]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (scenes.length && !reduced) {
    var ticking = false;
    var updateScenes = function () {
      var vh = window.innerHeight;
      scenes.forEach(function (scene) {
        var box = scene.getBoundingClientRect();
        var progress = 1 - (box.top + box.height) / (vh + box.height);
        scene.style.setProperty('--scene-progress', Math.min(1, Math.max(0, progress)).toFixed(3));
      });
      ticking = false;
    };
    var onScroll = function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(updateScenes);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    updateScenes();
  }

  /* ---------- 3) průchod na stránce výběru oboru ---------- */
  var journey = document.getElementById('journey');
  if (!journey) return;

  var ROLES = {
    'hledam-zamestnance': {
      title: 'Hledám zaměstnance',
      lead: 'Vyberte odvětví, ve kterém potřebujete nové lidi.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen relevantní pracovníky.',
      result: 'Tady se po spuštění zobrazí pracovníci, kteří v tomto oboru hledají práci.'
    },
    'hledam-praci': {
      title: 'Hledám práci',
      lead: 'Vyberte odvětví, ve kterém chcete pracovat.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen nabídky, které vám sedí.',
      result: 'Tady se po spuštění zobrazí nabídky práce v tomto oboru.'
    },
    'hledam-zakazky': {
      title: 'Hledám zakázky',
      lead: 'Vyberte odvětví, ve kterém sháníte zakázky.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen poptávky, které umíte obsloužit.',
      result: 'Tady se po spuštění zobrazí poptávky a zakázky v tomto oboru.'
    },
    'chci-zadat-zakazku': {
      title: 'Chci zadat zakázku',
      lead: 'Vyberte odvětví, ve kterém potřebujete práci provést.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen firmy, které to dělají.',
      result: 'Tady se po spuštění zobrazí firmy a živnostníci, kteří tuto práci provedou.'
    }
  };

  var ICONS = {
    stavebnictvi: '<path d="M3 21h18M5 21V8l7-4 7 4v13M9.5 21v-5h5v5"/>',
    vyroba: '<path d="M3 21h18M4 21V11l5 3V11l5 3V7l5 3v11"/>',
    logistika: '<path d="M2.5 16V7h10v9M12.5 10h4l3 3.2V16M2.5 16h2M9 16h4.5M19.5 16h2"/><circle cx="6.5" cy="17.6" r="1.9"/><circle cx="16.5" cy="17.6" r="1.9"/>',
    gastro: '<path d="M5 3v7a2.5 2.5 0 0 0 5 0V3M7.5 10v11M15 3c-1.4 1.6-2 3.4-2 5.6 0 1.9.8 3 2 3.2V21"/>',
    administrativa: '<rect x="3" y="7.5" width="18" height="12.5" rx="2"/><path d="M8.5 7.5V5.6A1.6 1.6 0 0 1 10 4h4a1.6 1.6 0 0 1 1.6 1.6v1.9M3 13h18"/>',
    it: '<rect x="2.5" y="4.5" width="19" height="12" rx="2"/><path d="M8 20h8M12 16.5V20"/>'
  };

  var INDUSTRIES = [
    {
      id: 'stavebnictvi', name: 'Stavebnictví',
      desc: 'Stavby, řemesla, rekonstrukce',
      subs: ['Zednictví a obklady', 'Elektroinstalace', 'Instalatérství a topení', 'Truhlářství a interiéry', 'Střechy a izolace', 'Zemní a výkopové práce', 'Malířství a podlahy']
    },
    {
      id: 'vyroba', name: 'Výroba',
      desc: 'Strojírenství, montáž, kvalita',
      subs: ['Strojírenská výroba', 'Svařování', 'CNC obrábění', 'Montážní práce', 'Kontrola kvality', 'Údržba strojů']
    },
    {
      id: 'logistika', name: 'Logistika',
      desc: 'Doprava, sklady, spedice',
      subs: ['Řidiči nákladních vozidel', 'Skladové provozy', 'Vychystávání a expedice', 'Spedice a doprava', 'Kurýrní a rozvozové služby']
    },
    {
      id: 'gastro', name: 'Gastro a hotelnictví',
      desc: 'Kuchyně, obsluha, ubytování',
      subs: ['Kuchyně', 'Obsluha a servis', 'Bar a kavárna', 'Housekeeping a úklid', 'Hotelová recepce', 'Catering a akce']
    },
    {
      id: 'administrativa', name: 'Administrativa, obchod a služby',
      desc: 'Kancelář, prodej, podpora',
      subs: ['Účetnictví a mzdy', 'HR a nábor', 'Asistence a back office', 'Obchod a prodej', 'Zákaznická podpora', 'Marketing a komunikace']
    },
    {
      id: 'it', name: 'IT a technologie',
      desc: 'Vývoj, data, infrastruktura',
      subs: ['Vývoj softwaru', 'Správa sítí a IT podpora', 'Data a analytika', 'Kybernetická bezpečnost', 'Design a UX', 'Projektové řízení']
    }
  ];

  var ARROW = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>';

  var crumbs = document.getElementById('crumbs');
  var roleTag = document.getElementById('role-tag');
  var heading = document.getElementById('journey-heading');
  var lead = document.getElementById('journey-lead');
  var body = document.getElementById('journey-body');

  var state = { role: null, industry: null, sub: null };

  function params() {
    return new URLSearchParams(window.location.search);
  }

  function readState() {
    var q = params();
    var role = q.get('role');
    state.role = ROLES[role] ? role : 'hledam-praci';
    state.industry = q.get('obor');
    state.sub = q.get('podobor');
  }

  function url() {
    var q = new URLSearchParams({ role: state.role });
    if (state.industry) q.set('obor', state.industry);
    if (state.sub) q.set('podobor', state.sub);
    return 'obory.html?' + q.toString();
  }

  function findIndustry(id) {
    for (var i = 0; i < INDUSTRIES.length; i++) {
      if (INDUSTRIES[i].id === id) return INDUSTRIES[i];
    }
    return null;
  }

  function go(next, push) {
    Object.keys(next).forEach(function (k) { state[k] = next[k]; });
    if (push !== false) window.history.pushState(state, '', url());
    render();
    journey.scrollIntoView({ block: 'start', behavior: reduced ? 'auto' : 'smooth' });
  }

  function icon(id) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round">' +
      (ICONS[id] || '') + '</svg>';
  }

  function renderCrumbs(industry) {
    var parts = ['<a href="recepce.html">Recepce</a>'];
    var role = ROLES[state.role];

    if (!industry) {
      parts.push('<span class="crumbs__sep">/</span><span class="crumbs__now">' + role.title + '</span>');
    } else {
      parts.push('<span class="crumbs__sep">/</span><a href="obory.html?role=' + state.role + '">' + role.title + '</a>');
      if (!state.sub) {
        parts.push('<span class="crumbs__sep">/</span><span class="crumbs__now">' + industry.name + '</span>');
      } else {
        parts.push('<span class="crumbs__sep">/</span><a href="obory.html?role=' + state.role +
          '&obor=' + industry.id + '">' + industry.name + '</a>');
        parts.push('<span class="crumbs__sep">/</span><span class="crumbs__now">' + state.sub + '</span>');
      }
    }
    crumbs.innerHTML = parts.join('');
  }

  function tile(attrs, iconSvg, title, desc) {
    return '<button class="tile" type="button" ' + attrs + '>' +
      '<span class="tile__icon" aria-hidden="true">' + iconSvg + '</span>' +
      '<span class="tile__body"><span class="tile__title">' + title + '</span>' +
      (desc ? '<span class="tile__desc">' + desc + '</span>' : '') + '</span>' +
      '<span class="tile__arrow" aria-hidden="true">' + ARROW + '</span></button>';
  }

  function render() {
    var role = ROLES[state.role];
    var industry = state.industry ? findIndustry(state.industry) : null;
    if (!industry) { state.industry = null; state.sub = null; }

    document.title = role.title + ' — TradeLink';
    roleTag.textContent = role.title;
    renderCrumbs(industry);

    /* krok 3 — výsledek */
    if (industry && state.sub) {
      heading.textContent = state.sub;
      lead.textContent = industry.name;
      body.innerHTML =
        '<div class="result">' +
          '<h2>Zatím připravujeme</h2>' +
          '<p>' + role.result + '</p>' +
          '<p class="result__meta">' + industry.name + ' → ' + state.sub + '</p>' +
        '</div>' +
        '<div class="actions" style="margin-top:26px">' +
          '<a class="btn" href="registrace.html?role=' + state.role + '">Založit účet</a>' +
          '<button class="btn btn--ghost" type="button" data-back="sub">Zpět na podobory</button>' +
          '<a class="btn btn--ghost" href="recepce.html">Zpět na recepci</a>' +
        '</div>';
      return;
    }

    /* krok 2 — podobory */
    if (industry) {
      heading.textContent = industry.name;
      lead.textContent = role.subLead;
      body.innerHTML =
        '<div class="tiles">' +
          industry.subs.map(function (sub) {
            return tile('data-sub="' + sub + '"', icon(industry.id), sub, '');
          }).join('') +
        '</div>' +
        '<div class="actions" style="margin-top:26px">' +
          '<button class="btn btn--ghost" type="button" data-back="industry">Zpět na odvětví</button>' +
        '</div>';
      return;
    }

    /* krok 1 — odvětví */
    heading.textContent = role.title;
    lead.textContent = role.lead;
    body.innerHTML =
      '<div class="tiles">' +
        INDUSTRIES.map(function (ind) {
          return tile('data-industry="' + ind.id + '"', icon(ind.id), ind.name, ind.desc);
        }).join('') +
      '</div>';
  }

  body.addEventListener('click', function (e) {
    var el = e.target.closest('[data-industry],[data-sub],[data-back]');
    if (!el) return;
    if (el.dataset.industry) return go({ industry: el.dataset.industry, sub: null });
    if (el.dataset.sub) return go({ sub: el.dataset.sub });
    if (el.dataset.back === 'sub') return go({ sub: null });
    if (el.dataset.back === 'industry') return go({ industry: null, sub: null });
  });

  window.addEventListener('popstate', function () {
    readState();
    render();
  });

  readState();
  render();
})();
