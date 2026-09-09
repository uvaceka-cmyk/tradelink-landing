/* =========================================================
   /api/ares?ico=12345678

   Ověření firmy proti registru ARES (Ministerstvo financí ČR).
   Běží jako Cloudflare Pages Function, protože ARES nepovoluje
   volání přímo z prohlížeče.

   Kromě údajů z registru vrací podpis (HMAC-SHA256). Ten pak
   putuje s registrací do databáze, která si ho ověří sama —
   proto si nikdo nemůže vymyslet firmu, která neexistuje.
   Podpis platí hodinu.

   Klíč k podpisu je v proměnné prostředí ARES_SECRET
   (Cloudflare → projekt → Settings → Environment variables)
   a musí se shodovat s klíčem uloženým v databázi.
   ========================================================= */

const ARES = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/';
const PLATNOST_SEKUND = 3600;

/* Kontrolní číslice IČO (modulo 11). Odchytí překlepy dřív,
   než se vůbec někam sáhne. */
export function icoChecksum(ico) {
  if (!/^\d{8}$/.test(ico)) return false;
  let sum = 0;
  for (let i = 0; i < 7; i++) sum += Number(ico[i]) * (8 - i);
  const rest = sum % 11;
  const check = rest === 0 ? 1 : rest === 1 ? 0 : 11 - rest;
  return check === Number(ico[7]);
}

async function podepsat(zprava, tajemstvi) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(tajemstvi), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(zprava));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, statusCode) {
  return new Response(JSON.stringify(data), {
    status: statusCode || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequestGet({ request, env }) {
  const ico = (new URL(request.url).searchParams.get('ico') || '').replace(/\s/g, '');

  if (!/^\d{8}$/.test(ico)) {
    return json({ ok: false, duvod: 'format', zprava: 'IČO musí mít osm číslic.' }, 400);
  }
  if (!icoChecksum(ico)) {
    return json({ ok: false, duvod: 'kontrolni-cislice', zprava: 'Toto IČO neexistuje — nesedí kontrolní číslice.' }, 400);
  }

  let res;
  try {
    res = await fetch(ARES + ico, {
      headers: { Accept: 'application/json' },
      cf: { cacheTtl: 86400, cacheEverything: true }
    });
  } catch (e) {
    return json({ ok: false, duvod: 'ares-nedostupny', zprava: 'Registr ARES teď neodpovídá. Zkuste to prosím za chvíli.' }, 503);
  }

  if (res.status === 404) {
    return json({ ok: false, duvod: 'nenalezeno', zprava: 'Firmu s tímto IČO se v registru ARES nepodařilo najít.' }, 404);
  }
  if (!res.ok) {
    return json({ ok: false, duvod: 'ares-chyba', zprava: 'Registr ARES vrátil chybu. Zkuste to prosím za chvíli.' }, 502);
  }

  const data = await res.json();

  /* datumZaniku vyplněné = subjekt už zanikl */
  if (data.datumZaniku) {
    return json({
      ok: false,
      duvod: 'zaniklo',
      zprava: 'Tento subjekt už podle registru ARES zanikl (' + data.datumZaniku + ').'
    }, 409);
  }

  const odpoved = {
    ok: true,
    ico: data.ico,
    nazev: data.obchodniJmeno,
    sidlo: data.sidlo ? data.sidlo.textovaAdresa : null,
    pravniForma: data.pravniForma || null,
    vznik: data.datumVzniku || null
  };

  /* Podpis pro databázi. Bez klíče projde ověření jen v prohlížeči
     a databáze registraci firmy odmítne — to je zamýšlené chování,
     ne tiché selhání. */
  if (env && env.ARES_SECRET) {
    const platiDo = Math.floor(Date.now() / 1000) + PLATNOST_SEKUND;
    const podpis = await podepsat(
      odpoved.ico + ':' + odpoved.nazev + ':' + platiDo,
      env.ARES_SECRET
    );
    odpoved.token = platiDo + '.' + podpis;
  }

  return json(odpoved);
}
