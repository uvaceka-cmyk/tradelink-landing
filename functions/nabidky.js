/* =========================================================
   /nabidky — veřejný přehled nabídek práce a poptávek
   =========================================================
   Proč to existuje:

   K nabídkám se dalo dostat jen průchodem recepce → role → obor →
   podobor. Kdo chtěl jen vidět, co je v nabídce, musel projít čtyři
   kroky a předem vědět, co hledá. Tahle stránka ukáže všechno naráz,
   bez přihlášení a bez zakládání účtu.

   Vykresluje se na serveru ze stejného důvodu jako /nabidka/<id>:
   Seznam JavaScript nespouští vůbec a Google se zpožděním. Tohle je
   navíc jediná stránka, přes kterou se vyhledávač dostane k inzerátům
   odkazem — mapa webu je sice zná, ale odkaz váží víc.

   Filtruje se přes ?typ=prace nebo ?typ=zakazka. Jiná hodnota se
   ignoruje, ať se z adresy nedá vyrobit nesmysl.
   ========================================================= */

const SUPABASE_URL = 'https://hgjajfkaotflkmyrryak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uAKMzAdb_30eR7VJd39v5Q_bi8wwyY0';

const ODVETVI = {
  stavebnictvi: 'Stavebnictví',
  vyroba: 'Výroba',
  logistika: 'Logistika',
  gastro: 'Gastro a hotelnictví',
  administrativa: 'Administrativa, obchod a služby',
  it: 'IT a technologie'
};

function esc(t) {
  return String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function zkratit(t, limit) {
  const s = String(t == null ? '' : t).replace(/\s+/g, ' ').trim();
  return s.length <= limit ? s : s.slice(0, limit - 1).trimEnd() + '…';
}

function stranka({ titulek, popisek, url, telo, jsonLd }) {
  const puvod = new URL(url).origin;
  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#05070a">
<title>${esc(titulek)}</title>
<meta name="description" content="${esc(popisek)}">
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradeLink">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="${esc(titulek)}">
<meta property="og:description" content="${esc(popisek)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(puvod)}/tradelink.jpeg">
<meta property="og:image:width" content="1600">
<meta property="og:image:height" content="900">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(puvod)}/tradelink.jpeg">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/style.css">
${jsonLd ? '<script type="application/ld+json">' + JSON.stringify(jsonLd) + '</script>' : ''}
</head>
<body>
<header class="nav">
  <div class="nav__bar">
    <a class="nav__brand" href="/">TradeLink</a>
    <button class="nav__toggle" type="button" aria-expanded="false" aria-controls="nav-menu" aria-label="Otevřít menu"><span></span></button>
  </div>
  <nav class="nav__menu" id="nav-menu" aria-label="Hlavní navigace">
    <a href="/">Hlavní stránka</a>
    <a href="/recepce">Recepce</a>
    <a href="/registrace">Založit účet</a>
    <a class="is-cta" id="nav-account" href="/prihlaseni">Přihlásit se</a>
  </nav>
</header>
<main class="journey shell">
${telo}
</main>
<footer class="foot shell">
  <a class="foot__brand" href="/">TradeLink</a>
  <span class="foot__links">
    <a href="/nabidky">Nabídky</a>
    <a href="/faq">Časté otázky</a>
    <a href="/podminky">Podmínky užití</a>
    <a href="/soukromi">Ochrana údajů</a>
    <a href="/zpetna-vazba">Zpětná vazba</a>
  </span>
  <small>© 2026 TradeLink</small>
</footer>
<script src="/supabase-config.js"></script>
<script src="/app.js" defer></script>
<script type="module">import { paintNav } from '/auth.js'; paintNav();</script>
</body>
</html>`;
}

function karta(i) {
  const meta = [];
  if (i.autor_overena_firma) meta.push('<span class="tag tag--free">Ověřená firma</span>');
  if (i.lokalita) meta.push('<span class="tag">' + esc(i.lokalita) + '</span>');
  if (i.odmena) meta.push('<span class="tag">' + esc(i.odmena) + '</span>');

  const kam = ODVETVI[i.obor] || i.obor;
  const obor = i.podobor ? kam + ' → ' + i.podobor : kam;

  return '<a class="karta" href="/nabidka/' + encodeURIComponent(i.id) + '">' +
    '<span class="karta__nadpis">' + esc(i.nazev) + '</span>' +
    '<span class="karta__meta">' + meta.join('') + '</span>' +
    '<span class="karta__popis">' + esc(zkratit(i.popis, 180)) + '</span>' +
    '<span class="karta__pata">' + esc(obor) +
      (i.autor_jmeno ? ' · ' + esc(i.autor_jmeno) : '') + '</span>' +
    '</a>';
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const puvod = url.origin;

  const zadany = url.searchParams.get('typ');
  const typ = (zadany === 'prace' || zadany === 'zakazka') ? zadany : null;

  const dotaz = SUPABASE_URL + '/rest/v1/verejne_inzeraty?select=*' +
    (typ ? '&typ=eq.' + typ : '') +
    '&order=created_at.desc&limit=100';

  let data = [];
  try {
    const res = await fetch(dotaz, {
      headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY }
    });
    if (res.ok) data = await res.json();
  } catch (e) {
    data = [];
  }

  const nadpis = typ === 'prace' ? 'Nabídky práce'
    : typ === 'zakazka' ? 'Poptávky zakázek'
    : 'Nabídky a poptávky';

  const popisek = typ === 'prace'
    ? 'Aktuální nabídky práce od zaměstnavatelů. Bez přihlášení, bez registrace.'
    : typ === 'zakazka'
    ? 'Aktuální poptávky zakázek. Bez přihlášení, bez registrace.'
    : 'Všechny aktuální nabídky práce a poptávky zakázek na jednom místě. Bez přihlášení, bez registrace.';

  const prepinac =
    '<div class="actions" style="margin-bottom:22px">' +
      '<a class="btn ' + (typ ? 'btn--ghost' : '') + '" href="/nabidky">Vše</a>' +
      '<a class="btn ' + (typ === 'prace' ? '' : 'btn--ghost') + '" href="/nabidky?typ=prace">Nabídky práce</a>' +
      '<a class="btn ' + (typ === 'zakazka' ? '' : 'btn--ghost') + '" href="/nabidky?typ=zakazka">Poptávky zakázek</a>' +
    '</div>';

  const obsah = data.length
    ? '<div class="vypis">' + data.map(karta).join('') + '</div>'
    : '<div class="vypis">' +
        '<div class="karta karta--prazdna" aria-hidden="true">' +
          '<span class="karta__cekani">Místo pro první nabídku</span>' +
          '<span class="kostra kostra--dlouha"></span><span class="kostra kostra--kratka"></span>' +
        '</div>' +
        '<div class="karta karta--prazdna" aria-hidden="true">' +
          '<span class="karta__cekani">Místo pro první nabídku</span>' +
          '<span class="kostra kostra--dlouha"></span><span class="kostra kostra--kratka"></span>' +
        '</div>' +
      '</div>' +
      '<p class="vypis__prazdno">Zatím tu nic není. Poptávku zadáte i bez účtu — ' +
        'napište, co potřebujete, a firmy se ozvou vám.</p>';

  const telo =
    '<p class="journey__role">Přehled</p>' +
    '<h1>' + esc(nadpis) + '</h1>' +
    '<p class="journey__lead">' +
      'Všechno, co je zrovna v nabídce. Prohlížet můžete bez přihlášení i bez účtu — ' +
      'ten potřebujete, teprve až budete chtít odpovědět.' +
    '</p>' +
    prepinac +
    (data.length
      ? '<h2 class="vypis__nadpis">' + esc(nadpis) +
          ' <span class="vypis__pocet">' + data.length + '</span></h2>'
      : '') +
    obsah +
    '<div class="actions" style="margin-top:26px">' +
      '<a class="btn" href="/poptavka">Zadat poptávku</a>' +
      '<a class="btn btn--ghost" href="/recepce">Projít podle oboru</a>' +
    '</div>';

  /* Strukturovaná data: seznam odkazů na jednotlivé inzeráty. Detail
     každého z nich nese vlastní JobPosting nebo Demand, tady stačí
     říct, co je na stránce a v jakém pořadí. */
  const jsonLd = data.length ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: nadpis,
    numberOfItems: data.length,
    itemListElement: data.slice(0, 50).map((i, poradi) => ({
      '@type': 'ListItem',
      position: poradi + 1,
      url: puvod + '/nabidka/' + i.id,
      name: i.nazev
    }))
  } : null;

  return new Response(stranka({
    titulek: nadpis + ' — TradeLink',
    popisek,
    url: puvod + '/nabidky' + (typ ? '?typ=' + typ : ''),
    telo,
    jsonLd
  }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      /* Krátká mezipaměť: nový inzerát se objeví do minuty, ale nápor
         na databázi se rozloží. */
      'Cache-Control': 'public, max-age=60'
    }
  });
}
