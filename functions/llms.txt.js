/* =========================================================
   /llms.txt — co je TradeLink, srozumitelně pro jazykové modely
   =========================================================
   Vznikající zvyklost: soubor, ve kterém web sám vysvětlí, co
   nabízí, aby si to model nemusel domýšlet z rozházeného HTML.
   Lidé se dnes ptají chatbotů „kde najdu zedníka v Brně" stejně
   často jako vyhledávače, a odpověď staví na tom, co si model
   o webu přečte.
   ========================================================= */

export function onRequestGet({ request }) {
  const puvod = new URL(request.url).origin;

  const text = `# TradeLink

> Česká platforma, která propojuje firmy, pracovníky a zakázky. Firmy se ověřují
> podle IČO proti registru ARES, takže neexistující firma účet nezaloží.

TradeLink rozlišuje čtyři cesty podle toho, kdo návštěvník je:

- **Hledám zaměstnance** — firma zadává nabídky práce
- **Hledám práci** — člověk prochází nabídky a odpovídá na ně
- **Hledám zakázky** — firma nebo živnostník prochází poptávky
- **Chci zadat zakázku** — člověk zadává poptávku po práci

Obory: stavebnictví, výroba, logistika, gastronomie a hotelnictví,
administrativa a obchod, IT a technologie.

## Stránky

- [Hlavní stránka](${puvod}/): co TradeLink je a jak funguje
- [Recepce](${puvod}/recepce.html): volba, kdo jste a co hledáte
- [Mapa webu](${puvod}/sitemap.xml): všechny zveřejněné inzeráty
- [Podmínky užití](${puvod}/podminky.html)
- [Ochrana osobních údajů](${puvod}/soukromi.html)

## Jak jsou vedené inzeráty

Každý zveřejněný inzerát má vlastní adresu ve tvaru \`${puvod}/nabidka/<id>\`
a nese strukturovaná data (JobPosting u nabídek práce). Adresy inzerátů
najdete v mapě webu.

## Co TradeLink nedělá

Nezprostředkovává zaměstnání — pouze zveřejňuje nabídky a poptávky, nevybírá
uchazeče ani je nedoporučuje zaměstnavatelům. Není stranou smluv, které spolu
uživatelé uzavřou. Ověření v registru ARES potvrzuje, že firma existuje,
neříká nic o kvalitě její práce.

Hodnocení firem pocházejí od registrovaných uživatelů, ale platforma neověřuje,
zda s firmou skutečně spolupracovali.
`;

  return new Response(text, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600'
    }
  });
}
