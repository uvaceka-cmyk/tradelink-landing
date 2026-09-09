/* =========================================================
   /api/ares?ico=12345678

   Ověření firmy proti registru ARES (Ministerstvo financí ČR).
   Běží jako Cloudflare Pages Function, protože ARES nepovoluje
   volání přímo z prohlížeče.

   Vrací jen to, co je veřejné v obchodním rejstříku:
   název, sídlo, právní formu a jestli subjekt ještě existuje.
   ========================================================= */

const ARES = 'https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/';

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

function json(data, statusCode) {
  return new Response(JSON.stringify(data), {
    status: statusCode || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'public, max-age=86400'
    }
  });
}

export async function onRequestGet({ request }) {
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

  return json({
    ok: true,
    ico: data.ico,
    nazev: data.obchodniJmeno,
    sidlo: data.sidlo ? data.sidlo.textovaAdresa : null,
    pravniForma: data.pravniForma || null,
    vznik: data.datumVzniku || null
  });
}
