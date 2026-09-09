/* =========================================================
   /sitemap.xml — mapa webu pro vyhledávače
   =========================================================
   Skládá se ze stálých stránek a ze všech zveřejněných inzerátů.
   Generuje se při každém dotazu z databáze, takže nový inzerát
   je v mapě hned — nikdo ji nemusí ručně udržovat.
   ========================================================= */

const SUPABASE_URL = 'https://hgjajfkaotflkmyrryak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uAKMzAdb_30eR7VJd39v5Q_bi8wwyY0';

/* Stránky, které mají smysl ve výsledcích hledání. Přihlašování,
   účet ani správa mezi ně nepatří. */
const STRANKY = [
  ['/', '1.0', 'weekly'],
  ['/recepce.html', '0.9', 'monthly'],
  ['/lobby.html', '0.5', 'monthly'],
  ['/zpetna-vazba.html', '0.3', 'yearly'],
  ['/podminky.html', '0.2', 'yearly'],
  ['/soukromi.html', '0.2', 'yearly']
];

export async function onRequestGet({ request }) {
  const puvod = new URL(request.url).origin;
  const polozky = [];

  for (const [cesta, priorita, cetnost] of STRANKY) {
    polozky.push(
      '  <url><loc>' + puvod + cesta + '</loc>' +
      '<changefreq>' + cetnost + '</changefreq>' +
      '<priority>' + priorita + '</priority></url>'
    );
  }

  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/verejne_inzeraty?select=id,created_at&order=created_at.desc&limit=5000',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    if (res.ok) {
      for (const i of await res.json()) {
        polozky.push(
          '  <url><loc>' + puvod + '/nabidka/' + i.id + '</loc>' +
          '<lastmod>' + String(i.created_at).slice(0, 10) + '</lastmod>' +
          '<changefreq>weekly</changefreq><priority>0.8</priority></url>'
        );
      }
    }

    /* zveřejněné profily — „firma XY recenze" je časté hledání */
    const pr = await fetch(
      SUPABASE_URL + '/rest/v1/verejne_profily?select=id,created_at&limit=5000',
      { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + SUPABASE_KEY } }
    );
    if (pr.ok) {
      for (const p of await pr.json()) {
        polozky.push(
          '  <url><loc>' + puvod + '/firma/' + p.id + '</loc>' +
          '<changefreq>monthly</changefreq><priority>0.6</priority></url>'
        );
      }
    }
  } catch (e) {
    /* Když databáze neodpoví, pošleme aspoň stálé stránky —
       prázdná mapa je horší než neúplná. */
  }

  const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    polozky.join('\n') + '\n</urlset>';

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
