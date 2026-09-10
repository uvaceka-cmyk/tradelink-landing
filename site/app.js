/* =========================================================
   TradeLink — sdílený skript
   1) navigace (hamburger)
   2) hák pro pozdější animace kamery
   3) průchod: typ návštěvníka → obor → podobor → výpis
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

  /* ---------- 0b) kanonická adresa ----------
     Stránky, které mají být ve výsledcích hledání, nesou kanonickou
     adresu rovnou v HTML — Seznam JavaScript nespouští, takže značka
     doplněná až tady by pro něj neexistovala. Tady se proto doplňuje
     jen tam, kde v HTML není: na stránkách, které se skládají až
     v prohlížeči podle parametru v adrese. */
  (function kanonicka() {
    if (document.querySelector('link[rel="canonical"]')) return;

    var adresa = window.location.origin + window.location.pathname;

    var odkaz = document.createElement('link');
    odkaz.setAttribute('rel', 'canonical');
    odkaz.setAttribute('href', adresa);
    document.head.appendChild(odkaz);

    var og = document.querySelector('meta[property="og:url"]');
    if (!og && document.querySelector('meta[property="og:title"]')) {
      og = document.createElement('meta');
      og.setAttribute('property', 'og:url');
      document.head.appendChild(og);
    }
    if (og) og.setAttribute('content', adresa);
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
      subLead: 'Zvolte konkrétní obor, ať vidíte jen relevantní pracovníky.'
    },
    'hledam-praci': {
      title: 'Hledám práci',
      lead: 'Vyberte odvětví, ve kterém chcete pracovat.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen nabídky, které vám sedí.'
    },
    'hledam-zakazky': {
      title: 'Hledám zakázky',
      lead: 'Vyberte odvětví, ve kterém sháníte zakázky.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen poptávky, které umíte obsloužit.'
    },
    'chci-zadat-zakazku': {
      title: 'Chci zadat zakázku',
      lead: 'Vyberte odvětví, ve kterém potřebujete práci provést.',
      subLead: 'Zvolte konkrétní obor, ať vidíte jen firmy, které to dělají.'
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

  var INDUSTRIES = window.TRADELINK_OBORY || [];

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

  /* Podobor i názvy z databáze se skládají do HTML. Podobor přitom
     přichází z adresy, kterou může kdokoli přepsat — bez tohohle by
     šlo odkazem podstrčit cizí kód. */
  function esc(t) {
    return String(t == null ? '' : t)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function renderCrumbs(industry) {
    var parts = ['<a href="recepce.html">Recepce</a>'];
    var role = ROLES[state.role];

    if (!industry) {
      parts.push('<span class="crumbs__sep">/</span><span class="crumbs__now">' + esc(role.title) + '</span>');
    } else {
      parts.push('<span class="crumbs__sep">/</span><a href="obory.html?role=' + encodeURIComponent(state.role) + '">' + esc(role.title) + '</a>');
      if (!state.sub) {
        parts.push('<span class="crumbs__sep">/</span><span class="crumbs__now">' + esc(industry.name) + '</span>');
      } else {
        parts.push('<span class="crumbs__sep">/</span><a href="obory.html?role=' + encodeURIComponent(state.role) +
          '&obor=' + encodeURIComponent(industry.id) + '">' + esc(industry.name) + '</a>');
        parts.push('<span class="crumbs__sep">/</span><span class="crumbs__now">' + esc(state.sub) + '</span>');
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

  /* ---------- výpis ----------
     Poslední krok průchodu. Co se v něm ukáže, se řídí tím, s čím
     návštěvník přišel na recepci: kdo hledá práci, chce vidět nabídky
     práce; kdo hledá lidi, chce vidět lidi. Proto se tu sahá jednou do
     inzerátů a jednou do profilů.

     Čte se z veřejných pohledů `verejne_inzeraty` a `verejne_profily` —
     ty už mají odfiltrované skryté, prošlé i nezveřejněné položky
     a nenesou e-maily. Klíč v `supabase-config.js` je veřejný, jiná
     data než tahle přes něj nejdou přečíst. */

  var VYPIS = {
    'hledam-praci': {
      zdroj: 'verejne_inzeraty', filtr: 'typ=eq.prace',
      nadpis: 'Nabídky práce', cekani: 'Místo pro nabídku práce',
      prazdno: 'V tomhle oboru zatím žádná nabídka práce není. Zkuste jiný obor, ' +
               'nebo si založte účet — dáme vědět, až se objeví.'
    },
    'hledam-zakazky': {
      zdroj: 'verejne_inzeraty', filtr: 'typ=eq.zakazka',
      nadpis: 'Poptávky zakázek', cekani: 'Místo pro poptávku',
      prazdno: 'V tomhle oboru zatím nikdo zakázku nepoptává. Zkuste jiný obor, ' +
               'nebo si založte účet — dáme vědět, až se objeví.'
    },
    'hledam-zamestnance': {
      zdroj: 'verejne_profily', filtr: 'account_type=eq.osoba',
      nadpis: 'Lidé, kteří hledají práci', cekani: 'Místo pro profil uchazeče',
      prazdno: 'V tomhle oboru se zatím nikdo nenabízí. Zkuste jiný obor, ' +
               'nebo si založte účet a zadejte nabídku práce.'
    },
    'chci-zadat-zakazku': {
      zdroj: 'verejne_profily', filtr: 'account_type=eq.firma',
      nadpis: 'Firmy a živnostníci', cekani: 'Místo pro profil firmy',
      prazdno: 'V tomhle oboru zatím žádná firma zveřejněný profil nemá. Zkuste jiný obor, ' +
               'nebo si založte účet a zadejte poptávku.'
    }
  };

  /* Doběhlá odpověď se zahodí, pokud návštěvník mezitím klikl jinam. */
  var vypisToken = 0;

  function akce() {
    return '<div class="actions" style="margin-top:26px">' +
      '<a class="btn" href="registrace.html?role=' + encodeURIComponent(state.role) + '">Založit účet</a>' +
      '<button class="btn btn--ghost" type="button" data-back="sub">Zpět na podobory</button>' +
      '<a class="btn btn--ghost" href="recepce.html">Zpět na recepci</a>' +
      '</div>';
  }

  /* Prázdný výpis ukazuje místa, kam nabídky teprve přijdou — ať je poznat,
     jak to bude vypadat, až tu něco bude. Karty jsou schválně neproklikávací,
     přerušované a bez textu, aby si je nikdo nespletl se skutečnou nabídkou.
     Pro čtečky jsou skryté; co se děje, říká věta pod nimi. */
  function prazdneKarty(popisek) {
    var jedna =
      '<div class="karta karta--prazdna" aria-hidden="true">' +
        '<span class="karta__cekani">' + esc(popisek) + '</span>' +
        '<span class="kostra kostra--dlouha"></span>' +
        '<span class="kostra kostra--kratka"></span>' +
      '</div>';
    return jedna + jedna + jedna;
  }

  function kartaInzeratu(i) {
    var meta = [];
    if (i.autor_overena_firma) meta.push('<span class="tag tag--free">Ověřená firma</span>');
    if (i.lokalita) meta.push('<span class="tag">' + esc(i.lokalita) + '</span>');
    if (i.odmena) meta.push('<span class="tag">' + esc(i.odmena) + '</span>');

    return '<a class="karta" href="/nabidka/' + encodeURIComponent(i.id) + '">' +
      '<span class="karta__nadpis">' + esc(i.nazev) + '</span>' +
      '<span class="karta__meta">' + meta.join('') + '</span>' +
      '<span class="karta__popis">' + esc(i.popis) + '</span>' +
      '<span class="karta__pata">' + esc(i.autor_jmeno) + '</span>' +
      '</a>';
  }

  function kartaProfilu(p) {
    var meta = [];
    if (p.overena_firma) meta.push('<span class="tag tag--free">Ověřená firma</span>');
    if (p.lokalita) meta.push('<span class="tag">' + esc(p.lokalita) + '</span>');
    if (p.hodnoceni_pocet) {
      meta.push('<span class="tag">★ ' + esc(p.hodnoceni_prumer) +
        ' (' + esc(p.hodnoceni_pocet) + ')</span>');
    }

    return '<a class="karta" href="/firma/' + encodeURIComponent(p.id) + '">' +
      '<span class="karta__nadpis">' + esc(p.jmeno) + '</span>' +
      '<span class="karta__meta">' + meta.join('') + '</span>' +
      '<span class="karta__popis">' + esc(p.popis) + '</span>' +
      '</a>';
  }

  function vypis(industry, sub) {
    var nastaveni = VYPIS[state.role];
    var muj = ++vypisToken;

    body.innerHTML = '<p class="vypis__stav" role="status">Načítám nabídky…</p>' + akce();

    var sb = window.TRADELINK_SUPABASE;
    if (!sb || !sb.url || !sb.anonKey) {
      body.innerHTML = '<p class="vypis__stav">Výpis se teď nedá načíst.</p>' + akce();
      return;
    }

    var adresa = sb.url + '/rest/v1/' + nastaveni.zdroj +
      '?select=*&' + nastaveni.filtr +
      '&obor=eq.' + encodeURIComponent(industry.id) +
      '&podobor=eq.' + encodeURIComponent(sub) +
      '&order=created_at.desc&limit=60';

    fetch(adresa, { headers: { apikey: sb.anonKey, Authorization: 'Bearer ' + sb.anonKey } })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        if (muj !== vypisToken) return;

        if (!data.length) {
          body.innerHTML =
            '<h2 class="vypis__nadpis">' + esc(nastaveni.nadpis) +
              ' <span class="vypis__pocet">0</span></h2>' +
            '<div class="vypis">' + prazdneKarty(nastaveni.cekani) + '</div>' +
            '<p class="vypis__prazdno">' + esc(nastaveni.prazdno) + '</p>' +
            '<p class="vypis__prazdno vypis__prazdno--meta">' +
              esc(industry.name) + ' → ' + esc(sub) + '</p>' +
            akce();
          return;
        }

        var karta = nastaveni.zdroj === 'verejne_inzeraty' ? kartaInzeratu : kartaProfilu;
        body.innerHTML =
          '<h2 class="vypis__nadpis">' + esc(nastaveni.nadpis) +
            ' <span class="vypis__pocet">' + data.length + '</span></h2>' +
          '<div class="vypis">' + data.map(karta).join('') + '</div>' + akce();
      })
      .catch(function () {
        if (muj !== vypisToken) return;
        body.innerHTML =
          '<div class="result">' +
            '<h2>Výpis se nepodařilo načíst</h2>' +
            '<p>Zkuste to prosím za chvíli znovu.</p>' +
          '</div>' + akce();
      });
  }

  function render() {
    var role = ROLES[state.role];
    var industry = state.industry ? findIndustry(state.industry) : null;
    if (!industry) { state.industry = null; state.sub = null; }

    document.title = role.title + ' — TradeLink';
    roleTag.textContent = role.title;
    renderCrumbs(industry);

    /* krok 3 — výpis */
    if (industry && state.sub) {
      heading.textContent = state.sub;
      lead.textContent = industry.name;
      vypis(industry, state.sub);
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
