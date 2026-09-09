/* =========================================================
   /nabidka/<id> — inzerát vykreslený na serveru
   =========================================================
   Proč to existuje:

   Stránka inzerat.html si obsah dotahuje až v prohlížeči. Člověku
   to nevadí, vyhledávači ano — Seznam JavaScript nespouští vůbec
   a Google ho zpracovává se zpožděním. Inzerát by se tak do
   výsledků hledání dostal pozdě, nebo vůbec.

   Tahle funkce proto pošle hotové HTML rovnou ze serveru, včetně
   popisků pro sdílení a strukturovaných dat JobPosting, kterými se
   nabídky dostanou do Google Jobs.
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

function stranka({ titulek, popisek, url, telo, jsonLd, robots }) {
  const puvodProSdileni = new URL(url).origin;
  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#05070a">
<title>${esc(titulek)}</title>
<meta name="description" content="${esc(popisek)}">
${robots ? '<meta name="robots" content="' + robots + '">' : ''}
<link rel="canonical" href="${esc(url)}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TradeLink">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="${esc(titulek)}">
<meta property="og:description" content="${esc(popisek)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(puvodProSdileni)}/tradelink.jpeg">
<meta property="og:image:width" content="1600">
<meta property="og:image:height" content="900">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="${esc(puvodProSdileni)}/tradelink.jpeg">
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
    <a href="/recepce.html">Recepce</a>
    <a href="/registrace.html">Založit účet</a>
    <a class="is-cta" id="nav-account" href="/prihlaseni.html">Přihlásit se</a>
  </nav>
</header>
<main class="journey shell">
${telo}
</main>
<footer class="foot shell">
  <a class="foot__brand" href="/">TradeLink</a>
  <span class="foot__links">
    <a href="/podminky.html">Podmínky užití</a>
    <a href="/soukromi.html">Ochrana údajů</a>
    <a href="/zpetna-vazba.html">Zpětná vazba</a>
  </span>
  <small>© 2026 TradeLink</small>
</footer>
<script src="/supabase-config.js"></script>
<script src="/app.js" defer></script>
<script type="module">import { paintNav } from '/auth.js'; paintNav();</script>
</body>
</html>`;
}

export async function onRequestGet({ params, request }) {
  const id = params.id;
  const puvod = new URL(request.url).origin;

  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    return new Response(stranka({
      titulek: 'Inzerát nenalezen — TradeLink',
      popisek: 'Takový inzerát na TradeLinku není.',
      url: puvod + '/nabidka/' + id,
      robots: 'noindex',
      telo: '<h1>Inzerát nenalezen</h1><p class="journey__lead">Zkuste se podívat na <a href="/recepce.html">recepci</a>.</p>'
    }), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const res = await fetch(
    SUPABASE_URL + '/rest/v1/verejne_inzeraty?id=eq.' + encodeURIComponent(id) + '&select=*',
    { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
  );
  const data = res.ok ? await res.json() : [];
  const i = data[0];

  if (!i) {
    return new Response(stranka({
      titulek: 'Inzerát už není k dispozici — TradeLink',
      popisek: 'Inzerát byl stažený, nebo mu vypršela platnost.',
      url: puvod + '/nabidka/' + id,
      robots: 'noindex',
      telo: '<h1>Inzerát už není k dispozici</h1>' +
            '<p class="journey__lead">Zadavatel ho stáhl, nebo mu vypršela platnost. ' +
            'Další najdete přes <a href="/recepce.html">recepci</a>.</p>'
    }), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  const odvetvi = ODVETVI[i.obor] || i.obor;
  const jePrace = i.typ === 'prace';
  const titulek = i.nazev + (i.lokalita ? ' — ' + i.lokalita : '') + ' | TradeLink';
  const popisek = (i.popis || '').replace(/\s+/g, ' ').slice(0, 155);
  const url = puvod + '/nabidka/' + i.id;

  /* Strukturovaná data. U nabídek práce JobPosting, kterým se
     dostanou do Google Jobs; u poptávek stačí obecný Offer. */
  const jsonLd = jePrace ? {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: i.nazev,
    description: i.popis,
    datePosted: i.created_at,
    validThrough: i.plati_do || undefined,
    employmentType: 'FULL_TIME',
    industry: odvetvi,
    hiringOrganization: {
      '@type': 'Organization',
      name: i.autor_jmeno,
      identifier: i.autor_ico || undefined,
      url: puvod + '/firma/' + i.autor_id
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: i.lokalita || 'Česká republika',
        addressCountry: 'CZ'
      }
    },
    directApply: true,
    url: url
  } : {
    '@context': 'https://schema.org',
    '@type': 'Demand',
    name: i.nazev,
    description: i.popis,
    category: odvetvi,
    availableAtOrFrom: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: i.lokalita || 'Česká republika', addressCountry: 'CZ' } },
    url: url
  };

  const telo = `
  <p class="journey__role">${jePrace ? 'Nabídka práce' : 'Poptávka zakázky'}</p>
  <h1>${esc(i.nazev)}</h1>
  <div class="firma__meta">
    ${i.autor_overena_firma ? '<span class="tag tag--free">Ověřená firma</span>' : ''}
    <span class="tag">${esc(odvetvi)}${i.podobor ? ' → ' + esc(i.podobor) : ''}</span>
    ${i.lokalita ? '<span class="tag">' + esc(i.lokalita) + '</span>' : ''}
  </div>

  <p style="color:var(--fg-dim);line-height:1.75;white-space:pre-wrap;margin-bottom:28px">${esc(i.popis)}</p>

  <dl class="detail">
    <div class="detail__row"><dt>Zadal</dt><dd>${
      i.autor_typ === 'firma'
        ? '<a href="/firma/' + esc(i.autor_id) + '">' + esc(i.autor_jmeno) + '</a>'
        : esc(i.autor_jmeno)
    }</dd></div>
    ${i.odmena ? '<div class="detail__row"><dt>' + (jePrace ? 'Mzda' : 'Rozpočet') + '</dt><dd>' + esc(i.odmena) + '</dd></div>' : ''}
    ${i.plati_do ? '<div class="detail__row"><dt>Platí do</dt><dd>' + esc(i.plati_do) + '</dd></div>' : ''}
  </dl>

  <div class="actions" style="margin-top:32px">
    <a class="btn" href="/inzerat.html?id=${esc(i.id)}">Ozvat se</a>
    <a class="btn btn--ghost" href="/recepce.html">Další nabídky</a>
  </div>

  <div class="sdileni">
    <span class="sdileni__popis">Poslat dál:</span>
    <a class="sdileni__odkaz" rel="nofollow noopener" target="_blank"
       href="https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}">Facebook</a>
    <a class="sdileni__odkaz" rel="nofollow noopener" target="_blank"
       href="https://api.whatsapp.com/send?text=${encodeURIComponent(i.nazev + ' — ' + url)}">WhatsApp</a>
    <a class="sdileni__odkaz" rel="nofollow noopener" target="_blank"
       href="https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}">LinkedIn</a>
    <a class="sdileni__odkaz" rel="nofollow"
       href="mailto:?subject=${encodeURIComponent(i.nazev)}&body=${encodeURIComponent(url)}">E-mailem</a>
  </div>`;

  return new Response(stranka({ titulek, popisek, url, telo, jsonLd }), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=300'
    }
  });
}
