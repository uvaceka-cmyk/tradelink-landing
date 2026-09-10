/* =========================================================
   /firma/<id> — profil firmy vykreslený na serveru
   =========================================================
   Stejný důvod jako u /nabidka/<id>: stránka firma.html si obsah
   dotahuje až v prohlížeči a Seznam JavaScript nespouští.

   Navíc nese strukturovaná data Organization s průměrným
   hodnocením. Díky nim se ve výsledcích hledání může u firmy
   ukázat hvězdičkový průměr — a „firma XY recenze" je přesně to,
   co lidé hledají.
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

function hvezdy(kolik) {
  const plne = Math.round(kolik || 0);
  let out = '';
  for (let i = 1; i <= 5; i++) {
    out += '<span class="hvezda' + (i <= plne ? ' je-plna' : '') + '">★</span>';
  }
  return '<span class="hvezdy hvezdy--velke">' + out + '</span>';
}

function stranka({ titulek, popisek, url, telo, jsonLd, robots }) {
  const puvod = new URL(url).origin;
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
<meta property="og:type" content="profile">
<meta property="og:site_name" content="TradeLink">
<meta property="og:locale" content="cs_CZ">
<meta property="og:title" content="${esc(titulek)}">
<meta property="og:description" content="${esc(popisek)}">
<meta property="og:url" content="${esc(url)}">
<meta property="og:image" content="${esc(puvod)}/tradelink.jpeg">
<meta name="twitter:card" content="summary_large_image">
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

export async function onRequestGet({ params, request }) {
  const id = params.id;
  const puvod = new URL(request.url).origin;

  const nenalezeno = (zprava) => new Response(stranka({
    titulek: 'Profil nenalezen — TradeLink',
    popisek: zprava,
    url: puvod + '/firma/' + id,
    robots: 'noindex',
    telo: '<h1>Profil nenalezen</h1><p class="journey__lead">' + esc(zprava) +
          ' Zkuste se podívat na <a href="/recepce">recepci</a>.</p>'
  }), { status: 404, headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  if (!/^[0-9a-f-]{36}$/i.test(id)) return nenalezeno('Taková adresa profilu neexistuje.');

  const hlavicky = { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY };

  const [pRes, hRes] = await Promise.all([
    fetch(SUPABASE_URL + '/rest/v1/verejne_profily?id=eq.' + encodeURIComponent(id) + '&select=*', { headers: hlavicky }),
    fetch(SUPABASE_URL + '/rest/v1/verejna_hodnoceni?firma=eq.' + encodeURIComponent(id) +
          '&select=*&order=created_at.desc&limit=20', { headers: hlavicky })
  ]);

  const p = (pRes.ok ? await pRes.json() : [])[0];
  if (!p) return nenalezeno('Profil tu není, nebo není zveřejněný.');

  const hodnoceni = hRes.ok ? await hRes.json() : [];
  const odvetvi = ODVETVI[p.obor] || p.obor;
  const titulek = p.jmeno + (p.lokalita ? ' — ' + p.lokalita : '') + ' | TradeLink';
  const popisek = (p.popis || '').replace(/\s+/g, ' ').slice(0, 155);
  const url = puvod + '/firma/' + p.id;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': p.account_type === 'firma' ? 'Organization' : 'Person',
    name: p.jmeno,
    description: p.popis || undefined,
    url: url,
    identifier: p.ico || undefined,
    address: p.sidlo ? { '@type': 'PostalAddress', streetAddress: p.sidlo, addressCountry: 'CZ' } : undefined,
    areaServed: p.lokalita || undefined,
    telephone: p.telefon || undefined,
    sameAs: p.web || undefined,
    aggregateRating: p.hodnoceni_pocet ? {
      '@type': 'AggregateRating',
      ratingValue: p.hodnoceni_prumer,
      reviewCount: p.hodnoceni_pocet,
      bestRating: 5,
      worstRating: 1
    } : undefined,
    review: hodnoceni.filter(h => h.text).slice(0, 10).map(h => ({
      '@type': 'Review',
      reviewRating: { '@type': 'Rating', ratingValue: h.hvezdicky, bestRating: 5, worstRating: 1 },
      reviewBody: h.text,
      datePublished: String(h.created_at).slice(0, 10),
      author: { '@type': 'Person', name: h.autor_jmeno || 'Ověřený uživatel' }
    }))
  };

  const telo = `
  <p class="journey__role">${p.account_type === 'firma' ? 'Firma' : 'Profil'}</p>
  <h1>${esc(p.jmeno)}</h1>
  <div class="firma__meta">
    ${p.overena_firma ? '<span class="tag tag--free">Ověřeno v ARES</span>' : ''}
    ${p.obor ? '<span class="tag">' + esc(odvetvi) + (p.podobor ? ' → ' + esc(p.podobor) : '') + '</span>' : ''}
    ${p.lokalita ? '<span class="tag">' + esc(p.lokalita) + '</span>' : ''}
  </div>

  <div class="firma__skore">
    ${p.hodnoceni_pocet
      ? hvezdy(p.hodnoceni_prumer) + '<strong>' + p.hodnoceni_prumer + '</strong>' +
        '<span class="skore__pocet">' + p.hodnoceni_pocet + ' hodnocení</span>'
      : '<span class="skore__pocet">Zatím bez hodnocení</span>'}
  </div>

  <p class="journey__lead">${esc(p.popis || '')}</p>

  <dl class="detail">
    ${p.ico ? '<div class="detail__row"><dt>IČO</dt><dd>' + esc(p.ico) + '</dd></div>' : ''}
    ${p.sidlo ? '<div class="detail__row"><dt>Sídlo</dt><dd>' + esc(p.sidlo) + '</dd></div>' : ''}
    ${p.web ? '<div class="detail__row"><dt>Web</dt><dd><a href="' + esc(p.web) + '" rel="noopener nofollow">' + esc(p.web) + '</a></dd></div>' : ''}
    ${p.telefon ? '<div class="detail__row"><dt>Telefon</dt><dd>' + esc(p.telefon) + '</dd></div>' : ''}
  </dl>

  <h2 style="font-size:var(--step-2);margin:44px 0 18px">Hodnocení</h2>
  <p class="overovani-recenzi">
    Hodnotit může jen přihlášený účet s potvrzeným e-mailem, a to každou firmu jednou.
    <strong>Neověřujeme ale, že autor hodnocení s firmou opravdu spolupracoval</strong> —
    platforma o proběhlé spolupráci zatím nemá záznam.
  </p>
  ${hodnoceni.length
    ? hodnoceni.map(h => `<article class="recenze">
        <div class="recenze__hlava">${hvezdy(h.hvezdicky).replace(' hvezdy--velke', '')}
          <span class="recenze__autor">${esc(h.autor_jmeno || 'Ověřený uživatel')} ·
            ${new Date(h.created_at).toLocaleDateString('cs-CZ', { year: 'numeric', month: 'long' })}</span>
        </div>
        ${h.text ? '<p>' + esc(h.text) + '</p>' : ''}
      </article>`).join('')
    : '<p class="journey__lead">Tuhle firmu zatím nikdo nehodnotil.</p>'}

  <div class="actions" style="margin-top:32px">
    <a class="btn" href="/firma?id=${esc(p.id)}">Ohodnotit firmu</a>
    <a class="btn btn--ghost" href="/recepce">Zpět na recepci</a>
  </div>`;

  return new Response(stranka({ titulek, popisek, url, telo, jsonLd }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=300' }
  });
}
