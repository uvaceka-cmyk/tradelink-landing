/* =========================================================
   Přesměrování na hlavní adresu
   =========================================================
   Web je dostupný na tradelink.cz, www.tradelink.cz i na původní
   tradelink-landing.pages.dev. Pro vyhledávače je to tentýž obsah
   na třech adresách — rozdělily by si mezi ně hodnocení a žádná
   by nebyla silná.

   Všechno proto trvale přesměrujeme na tradelink.cz. Trvale (301),
   aby si to vyhledávače zapamatovaly a odkazy zvenčí se přepsaly
   na novou adresu.

   Náhledová nasazení (`<hash>.tradelink-landing.pages.dev`)
   necháváme být — slouží ke kontrole před vydáním a přesměrování
   by je znefunkčnilo.
   ========================================================= */

const HLAVNI = 'tradelink.cz';

export async function onRequest({ request, next }) {
  const url = new URL(request.url);
  const host = url.hostname;

  const jeNahled = /^[0-9a-f]+\.tradelink-landing\.pages\.dev$/i.test(host);
  const presmerovat =
    host === 'www.' + HLAVNI ||
    (host === 'tradelink-landing.pages.dev' && !jeNahled);

  if (presmerovat) {
    url.hostname = HLAVNI;
    url.protocol = 'https:';
    url.port = '';
    return Response.redirect(url.toString(), 301);
  }

  return next();
}
