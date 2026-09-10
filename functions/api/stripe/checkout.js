/* =========================================================
   /api/stripe/checkout — začátek platby
   =========================================================
   Přihlášená firma sem pošle svůj token, funkce ověří, že token
   opravdu patří jí, a vrátí adresu platební stránky Stripu.

   Proč přes server: klíč ke Stripu nesmí do prohlížeče. Kdyby tam
   byl, vytvoří si s ním kdokoli platbu na cizí účet, nebo si přečte
   seznam zákazníků.

   Nastavení v Cloudflare (Settings → Variables and Secrets):
     STRIPE_SECRET_KEY   — tajný klíč ke Stripu (sk_…)
     STRIPE_PRICE_ID     — identifikátor měsíčního tarifu (price_…)
   ========================================================= */

const SUPABASE_URL = 'https://hgjajfkaotflkmyrryak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uAKMzAdb_30eR7VJd39v5Q_bi8wwyY0';

function chyba(zprava, stav) {
  return new Response(JSON.stringify({ chyba: zprava }), {
    status: stav,
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export async function onRequestPost({ request, env }) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_PRICE_ID) {
    return chyba('Platby zatím nejsou spuštěné.', 503);
  }

  /* Token posílá prohlížeč v hlavičce. Neověřujeme ho sami — necháme
     to Supabase, který jediný ví, jestli je platný a čí je. */
  const token = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
  if (!token) return chyba('Přihlaste se prosím.', 401);

  const ucet = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token }
  });
  if (!ucet.ok) return chyba('Přihlášení vypršelo. Přihlaste se prosím znovu.', 401);

  const user = await ucet.json();
  if (!user || !user.id) return chyba('Přihlaste se prosím.', 401);

  /* Platí jen firmy. Lidé mají web zdarma a nemají co platit. */
  const profil = await fetch(
    SUPABASE_URL + '/rest/v1/profiles?id=eq.' + encodeURIComponent(user.id) +
    '&select=account_type,stripe_zakaznik,email',
    { headers: { apikey: SUPABASE_KEY, Authorization: 'Bearer ' + token } }
  );
  const p = profil.ok ? (await profil.json())[0] : null;

  if (!p) return chyba('Profil se nepodařilo načíst.', 400);
  if (p.account_type !== 'firma') {
    return chyba('Předplatné se týká jen firemních účtů. Pro lidi je TradeLink zdarma.', 400);
  }

  const puvod = new URL(request.url).origin;
  const telo = new URLSearchParams({
    mode: 'subscription',
    'line_items[0][price]': env.STRIPE_PRICE_ID,
    'line_items[0][quantity]': '1',
    success_url: puvod + '/ucet?platba=ok',
    cancel_url: puvod + '/ucet?platba=zrusena',
    client_reference_id: user.id,
    locale: 'cs',
    /* Ať Stripe posílá účtenky sám — provozovatel je nemusí řešit. */
    'subscription_data[metadata][profil]': user.id
  });

  /* Známého zákazníka posíláme, ať se platba spáruje s existujícím
     záznamem a nevznikne duplicitní. */
  if (p.stripe_zakaznik) {
    telo.set('customer', p.stripe_zakaznik);
  } else if (p.email) {
    telo.set('customer_email', p.email);
  }

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + env.STRIPE_SECRET_KEY,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: telo
  });

  if (!res.ok) {
    return chyba('Platbu se nepodařilo založit. Zkuste to prosím znovu.', 502);
  }

  const session = await res.json();
  return new Response(JSON.stringify({ url: session.url }), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' }
  });
}
