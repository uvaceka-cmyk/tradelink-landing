/* =========================================================
   /robots.txt — co smí vyhledávače procházet
   =========================================================
   Generuje se za běhu kvůli jedinému řádku: odkaz na mapu webu
   musí být celou adresou, ne cestou. Web běží na pages.dev
   i na vlastní doméně, takže se adresa bere z požadavku
   a je správná na obou.
   ========================================================= */

/* Stránky, které do výsledků hledání nepatří. */
const SOUKROME = [
  '/ucet', '/profil', '/prihlaseni', '/registrace',
  '/obnova-hesla', '/nove-heslo', '/moje-inzeraty',
  '/moje-odpovedi', '/sprava'
];

export function onRequestGet({ request }) {
  const puvod = new URL(request.url).origin;

  const radky = [
    '# TradeLink — co smí vyhledávače procházet',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# Soukromé a přihlašovací stránky do výsledků hledání nepatří'
  ];

  for (const cesta of SOUKROME) {
    radky.push('Disallow: ' + cesta);
    radky.push('Disallow: ' + cesta + '.html');
  }

  radky.push(
    'Disallow: /api/',
    '',
    '# Detail inzerátu má pro vyhledávače vlastní adresu /nabidka/<id>,',
    '# která se vykresluje na serveru. Verzi pro prohlížeč neindexujeme,',
    '# aby se tentýž obsah nepočítal dvakrát.',
    'Disallow: /inzerat.html',
    'Disallow: /firma.html',
    '',
    'Sitemap: ' + puvod + '/sitemap.xml',
    ''
  );

  return new Response(radky.join('\n'), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
