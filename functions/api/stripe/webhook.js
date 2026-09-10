/* =========================================================
   /api/stripe/webhook — Stripe hlásí, že se zaplatilo
   =========================================================
   Tohle je jediné místo, které posouvá `predplatne_do`. Nikdo to
   nevyplňuje ručně: Stripe po každé platbě pošle zprávu a databáze
   se podle ní srovná.

   Podpis se ověřuje. Bez toho by stačilo poslat na tuhle adresu
   vlastní zprávu a mít předplatné zdarma napořád.

   Nastavení v Cloudflare (Settings → Variables and Secrets):
     STRIPE_SECRET_KEY     — tajný klíč ke Stripu (sk_…)
     STRIPE_WEBHOOK_SECRET — podpisové tajemství webhooku (whsec_…)
     SUPABASE_SERVICE_KEY  — servisní klíč Supabase (obchází RLS,
                             proto nikam jinam nepatří)
   ========================================================= */

const SUPABASE_URL = 'https://hgjajfkaotflkmyrryak.supabase.co';

/* Porovnání, které netrvá různě dlouho podle toho, kolik znaků sedí.
   U podpisů se to dělá vždycky — z rozdílů v čase jde podpis uhodnout. */
function stejne(a, b) {
  if (a.length !== b.length) return false;
  let rozdil = 0;
  for (let i = 0; i < a.length; i++) rozdil |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return rozdil === 0;
}

async function podpisSedi(telo, hlavicka, tajemstvi) {
  if (!hlavicka) return false;

  const casti = Object.fromEntries(
    hlavicka.split(',').map(c => c.split('=').map(x => x.trim()))
  );
  const cas = casti.t;
  const podpis = casti.v1;
  if (!cas || !podpis) return false;

  /* Stará zpráva se odmítá — jinak by šla odchycená platba přehrát
     znovu a znovu. Pět minut je tolerance, kterou doporučuje Stripe. */
  const stari = Math.abs(Math.floor(Date.now() / 1000) - Number(cas));
  if (!Number.isFinite(stari) || stari > 300) return false;

  const klic = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(tajemstvi),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const vypocet = await crypto.subtle.sign(
    'HMAC', klic, new TextEncoder().encode(cas + '.' + telo)
  );
  const hex = [...new Uint8Array(vypocet)]
    .map(b => b.toString(16).padStart(2, '0')).join('');

  return stejne(hex, podpis);
}

/* Ze Stripu chodí konec zaplaceného období jako číslo vteřin. */
function naDatum(vteriny) {
  return vteriny ? new Date(Number(vteriny) * 1000).toISOString() : null;
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_WEBHOOK_SECRET || !env.SUPABASE_SERVICE_KEY) {
    return new Response('Platby zatím nejsou spuštěné.', { status: 503 });
  }

  const telo = await request.text();
  const sedi = await podpisSedi(telo, request.headers.get('stripe-signature'), env.STRIPE_WEBHOOK_SECRET);
  if (!sedi) return new Response('Neplatný podpis.', { status: 400 });

  let udalost;
  try { udalost = JSON.parse(telo); } catch (e) { return new Response('Nečitelná zpráva.', { status: 400 }); }

  const o = (udalost.data && udalost.data.object) || {};
  let zakaznik = null;
  let email = null;
  let doKdy = null;
  let stav = null;

  if (udalost.type === 'checkout.session.completed') {
    zakaznik = o.customer;
    email = (o.customer_details && o.customer_details.email) || o.customer_email;
    /* Konec období tu ještě není — dorazí vzápětí v invoice.paid.
       Zapisujeme aspoň zákazníka, ať je platba s kým spárovat. */
    stav = 'active';
  } else if (udalost.type === 'invoice.paid' || udalost.type === 'invoice.payment_succeeded') {
    zakaznik = o.customer;
    email = o.customer_email;
    doKdy = naDatum(o.period_end || (o.lines && o.lines.data && o.lines.data[0] && o.lines.data[0].period && o.lines.data[0].period.end));
    stav = 'active';
  } else if (udalost.type === 'customer.subscription.updated' || udalost.type === 'customer.subscription.deleted') {
    zakaznik = o.customer;
    doKdy = naDatum(o.current_period_end);
    stav = udalost.type.endsWith('deleted') ? 'canceled' : (o.status || null);
  } else {
    /* Ostatní zprávy nás nezajímají, ale musíme odpovědět 200 —
       jinak je Stripe posílá pořád dokola. */
    return new Response('ok', { status: 200 });
  }

  if (!zakaznik && !email) return new Response('ok', { status: 200 });

  const res = await fetch(SUPABASE_URL + '/rest/v1/rpc/zapsat_platbu', {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: 'Bearer ' + env.SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_zakaznik: zakaznik || null,
      p_email: email || null,
      p_do: doKdy,
      p_stav: stav
    })
  });

  /* Když se zápis nepovede, vrátíme chybu schválně: Stripe to zkusí
     poslat znovu. Ztracená platba je horší než zpráva navíc. */
  if (!res.ok) return new Response('Zápis se nepovedl.', { status: 500 });

  return new Response('ok', { status: 200 });
}
