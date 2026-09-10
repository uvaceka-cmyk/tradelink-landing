# Project Handoff

## Current State

TradeLink je statický web nasazený na Cloudflare Pages, napojený na Supabase (účty + databáze)
a na registr ARES (ověřování firem). Homepage je jedna fullscreen scéna „atrium" se skutečným
výtahem; průchod homepage/atrium → recepce → role → obor → podobor je funkční, účty a ověřování
firem fungují a jsou otestované. Profily lidí i firem se dají
vyplnit a zveřejnit, inzeráty a poptávky se dají zadávat, zveřejňovat a odpovídat na ně.
Funguje hodnocení firem, nahlašování obsahu s frontou pro správce a sběr zpětné vazby.
**Průchod je celý funkční včetně výpisu** — po výběru podoboru se načte, co k té volbě
patří (nabídky práce, poptávky, lidé nebo firmy). **Zbývá ho ale vidět s reálnými daty:**
databáze je prázdná, takže zatím vždycky vyjde prázdný stav.

**Živě:** https://tradelink.cz — doména je připojená, certifikát vydaný.
`www.tradelink.cz` i původní `tradelink-landing.pages.dev` se trvale (301) přesměrují
na hlavní adresu (`functions/_middleware.js`), aby se tentýž obsah nepočítal vícekrát.
**Repo:** https://github.com/uvaceka-cmyk/tradelink-landing (veřejné, větev `main`)
**Nasazení:** Cloudflare Pages, automaticky z `main`, build output directory = `site`, bez build příkazu
**Databáze:** Supabase projekt `tradelink`, ref `hgjajfkaotflkmyrryak`, region eu-central-1 (Frankfurt)

Web je celý česky a běží na vlastní doméně.

## Completed

**Stránky** (vše v `site/`, mobile-first, dark luxury vzhled)
- `index.html` — homepage jako jedna fullscreen scéna „atrium": nadpis, text, 2 CTA, skutečný
  výtah (7 klikatelných pater, vedou na `recepce.html`), integrovaná smoked/blur nav. Na mobilu
  tlačítko „Patra" otevře bottom sheet se stejnými patry. Cinematic přechod na recepci přes
  `transition.js` (~650 ms, `prefers-reduced-motion` respektováno).
- `lobby.html` — **nepoužívaná legacy stránka**, nikam z homepage/recepce neodkazuje. Zůstává
  v repu záměrně nesmazaná (patra na ní jsou pořád klikatelná odkazují na `recepce.html`, ale
  nic na ni už nevede).
- `recepce.html` — fotka jako hlavní vizuál, 4 volby typu návštěvníka (2 vlevo, 2 vpravo),
  vstupní fade animace při příchodu z atria
- `obory.html` — výběr odvětví → podoboru, stav drží URL (`?role=&obor=&podobor=`)
- `registrace.html`, `prihlaseni.html`, `obnova-hesla.html`, `nove-heslo.html`, `ucet.html`
- `faq.html` — časté otázky (ceny, IČO, co znamená ověřená firma, kdo vidí profil,
  hodnocení, nahlašování, zrušení účtu). Odkazovaná z patičky všech stránek včetně
  serverem vykreslených, je v mapě webu.
- `podminky.html`, `soukromi.html` — právní texty

**Homepage / atrium** (`site/homepage.css`, `site/transition.js`, `site/homepage.js` — nové)
- `site/homepage-master.webp` — schválená fotka atria, žádné vypálené UI, hero pozadí
- výtah: `aside.elevator` na desktopu/tabletu (7 pater, kruhová čísla, modrobílý prstenec na
  aktivním „L"), na mobilu tlačítko „Patra" + bottom sheet — obojí vede na `recepce.html`
- `transition.js` — sdílený, bez závislostí: exit animace + navigace pro `[data-transition]`
  odkazy (~650 ms, jen `opacity`/`transform`/`filter`), entrance reveal pro `[data-enter]` na
  `recepce.html`. Respektuje `prefers-reduced-motion`; bez JS odkazy fungují okamžitě.
- ověřeno živě v Claude in Chrome (desktop 1920×1080 i mobil 390×844 — přes lokální stránku se
  stejně-původovými `<iframe>` v reálné šířce, protože `resize_window` v tomhle prostředí
  nefunguje): hover/klik výtahu, přechod na recepci, pokračování do `obory.html`, mobilní sheet
- `site/nav-hud.css` (nové, sdílené homepage + recepcí, pod `.nav--hud`) — horní navigace
  přestavěná na „HUD control bar": smoked glass, tenčí výška, inline SVG ikony (dveře/lobby,
  osoba+/registrace, účet/přihlášení, dům a šipky výtahu na recepci), skyline monogram u brandu,
  metalická linka, výraznější glow na aktivní položce. Čistě vizuální — flow, hrefy ani logika
  (`app.js`, `auth.js`) se nemění. Ikona je sourozenec `<a>`, ne potomek, protože `auth.js`
  přepisuje `textContent` odkazu `#nav-account` podle stavu přihlášení a smazal by ji, kdyby
  byla vevnitř. Ostatní stránky (`lobby.html`, `obory.html`...) mají pořád starou plain `.nav`,
  nedotčenou.
- **Přiblíženo master referenčnímu screenshotu** (density/layout, ne bitmapa — vše skutečné
  HTML/CSS/SVG): nav dostala pravý utility cluster (hledání a jazyk jsou čistě dekorativní,
  `aria-hidden`, na mobilu schované — web nemá vyhledávání ani jinou jazykovou verzi;
  `Přihlásit se`/`Založit účet` jsou pořád stejné odkazy, jen `Založit účet` je teď plné
  tlačítko). Pod CTA na homepage 4 malé info karty (Lidé/Firmy/Ověřeno/Nové nabídky) —
  kvalitativní tvrzení, ne vymyšlená čísla (databázi teď nemáme čím podložit). Výtah je vyšší,
  blíž okraji, patra rozprostřená přes celou výšku, dole podpis „Stejná budova. Společná
  příležitost." Recepce má nad nadpisem drobný štítek „TradeLink · Patro L". Role cards
  a fotka recepce nedotčené.

**Účty (Supabase)**
- registrace, přihlášení, obnova hesla, nastavení nového hesla, přehled účtu
- typ účtu se odvozuje z volby na recepci: *hledám zaměstnance* a *hledám zakázky* = firma,
  *hledám práci* a *chci zadat zakázku* = osoba
- chybové hlášky přeložené do češtiny (`auth.js`, funkce `czechError`)
- obnova hesla neprozradí, jestli e-mail existuje

**Ověřování firem proti ARES**
- `functions/api/ares.js` — Cloudflare Pages Function; ARES nejde volat z prohlížeče (CORS)
- kontrolní číslice IČO (modulo 11) → dohledání v ARES → odmítnutí zaniklých subjektů
- výsledek se podepisuje HMAC-SHA256 klíčem `ARES_SECRET`, podpis platí hodinu
- trigger v databázi podpis přepočítá; bez platného podpisu firemní účet nevznikne
- název a sídlo se do profilu zapisují jen z podepsaných dat, ne od zadávajícího
- jedno IČO = jeden účet (unikátní index v databázi)

**Ověřování lidí**
- potvrzení e-mailu je vyžadované pro všechny účty (nastaveno v Supabase)
- jednorázové schránky (mailinator, yopmail a spol.) se odmítají — seznam je
  v `private.blokovane_domeny`, kontrola běží v triggeru, formulář ji jen předběhne

**Profily** (`site/profil.html`, migrace `006`)
- uživatel vyplňuje popis, odvětví a obor, lokalitu; firmy navíc web a telefon
- údaje z ARES jsou u firem jen ke čtení, profil je nepřepíše
- profil je ve výchozím stavu **skrytý**, zveřejní se zaškrtnutím; zveřejnit jde jen profil
  s popisem a odvětvím (hlídá omezení v databázi, ne formulář)
- ostatním se ukazuje přes pohled `public.verejne_profily` — bez e-mailu, telefon a sídlo
  jen u firem

**Inzeráty a poptávky** (`site/moje-inzeraty.html`, migrace `007`)
- typ `prace` zadává firma, typ `zakazka` soukromá osoba; texty formuláře se mění podle účtu
- zadat, upravit, smazat, skrýt / zveřejnit, nepovinná platnost do data
- ochrany v databázi: nabídku práce zadá jen firma **ověřená v ARES**, neověřená firma
  nezadá nic, jeden účet smí mít naráz nejvýš **20 zveřejněných** inzerátů
- `public.verejne_inzeraty` je rozhraní pro výpis — vynechává skryté i prošlé inzeráty
  a e-mail autora; nese jméno autora, typ účtu a příznak ověřené firmy

**Výpis** (`site/obory.html` + `app.js`, funkce `vypis`)
- poslední krok průchodu; co se ukáže, řídí volba z recepce:
  *hledám práci* → inzeráty `typ=prace`, *hledám zakázky* → `typ=zakazka`,
  *hledám zaměstnance* → profily lidí, *chci zadat zakázku* → profily firem
- čte veřejné pohledy `verejne_inzeraty` a `verejne_profily` — skryté, prošlé
  a nezveřejněné položky v nich nejsou a e-maily nenesou
- karty odkazují na serverem vykreslené `/nabidka/<id>` a `/firma/<id>`
- ošetřené stavy: načítání, prázdný výsledek, chyba spojení; odpověď, která doběhne
  po prokliku jinam, se zahazuje
- **stavěl to Claude, ne kamarád** — původně to byl jeho úkol, ale web byl mezitím
  živý bez své hlavní funkce. Kdo na tom bude dělat dál, ať to nestaví podruhé.

**Odpovědi na inzerát** (`site/inzerat.html`, migrace `010`)
- veřejný detail inzerátu s formulářem „Ozvat se"
- odpověď vidí jen zadavatel a její autor; na vlastní, skrytý ani prošlý inzerát
  odpovědět nelze, jedna odpověď na inzerát od účtu, denní strop 30
- zadavatel vidí u svých inzerátů počet odpovědí včetně nepřečtených
- odesílatel má přehled svých odpovědí na `site/moje-odpovedi.html` včetně toho,
  jestli si je zadavatel přečetl

**Hodnocení firem a živnostníků** (`site/firma.html`, migrace `008`)
- jeden účet hodnotí jednu firmu jednou, jen s potvrzeným e-mailem, vlastní firmu ne
- průměr a počet se propisují do `verejne_profily`
- jméno hodnotícího jen u zveřejněných profilů, jinak „ověřený uživatel"

**Nahlašování obsahu** (migrace `011`)
- nahlásit inzerát, hodnocení nebo profil může i nepřihlášený
- při **třech** nezávislých hlášeních se obsah sám skryje (pojistka, ne rozsudek)
- fronta a rozhodnutí správce na `site/sprava.html`

**Zpětná vazba na platformu** (`site/zpetna-vazba.html`, migrace `009`)
- hodnocení TradeLinku, návrhy a hlášení chyb; psát smí i nepřihlášený
- čte jen správce (`profiles.spravce`) na `site/sprava.html`

**Viditelnost ve vyhledávačích**
- `/nabidka/<id>` — inzerát **vykreslený na serveru** (`functions/nabidka/[id].js`).
  Nutné proto, že Seznam JavaScript nespouští vůbec a Google se zpožděním; stránka
  `inzerat.html` je pro prohlížeč, `/nabidka/<id>` pro vyhledávače a sdílení.
- nabídky práce nesou **JobPosting** (Google Jobs), poptávky obecný Offer
- `/sitemap.xml` (`functions/sitemap.xml.js`) se generuje z databáze, nový inzerát je
  v mapě hned
- `site/robots.txt` drží mimo výsledky přihlašování, účty, správu i `inzerat.html`
  (aby se tentýž obsah nepočítal dvakrát)
- popisky pro sdílení na veřejných stránkách, `noindex` na soukromých
- kanonická adresa se dopočítá v `app.js` podle toho, kde web běží
- `/robots.txt` a `/llms.txt` generují funkce, aby adresy odpovídaly doméně, na které
  web běží — statický robots.txt byl neplatný, mapa webu se musí uvádět celou adresou
- Lighthouse na mobilu: přístupnost, osvědčené postupy, SEO i přístupnost pro AI
  agenty **100/100**, 47 kontrol prošlo, žádná neselhala

**Doména a infrastruktura**
- `tradelink.cz` běží na Cloudflare (přepnuto z Wedosu 9. 9. 2026, zóna aktivní)
- doména i `www` připojené k Pages projektu, certifikát vydaný
- `www` a `pages.dev` se trvale přesměrují na hlavní adresu (`functions/_middleware.js`);
  náhledová nasazení `<hash>.tradelink-landing.pages.dev` zůstávají přístupná
- Supabase Site URL i redirect allow-list ukazují na `https://tradelink.cz`
- `og:image` na všech stránkách ukazuje na `https://tradelink.cz/tradelink.jpeg`
- **příjem**: `info@tradelink.cz` je **skutečná schránka v Seznam Email Profi**
  (od 10. 9. 2026). MX ukazují na `*.emailprofi.seznam.cz` (priority 10 a 20), kořenový
  SPF je `v=spf1 include:spf.seznam.cz ~all`. Čte se na `email.seznam.cz` pod účtem
  `info@tradelink.cz` — **heslo má jen uživatel**. Dřívější přeposílání přes Cloudflare
  Email Routing je vypnuté a jeho DNS záznamy (3 MX + DKIM + starý kořenový SPF) smazané;
  soukromá schránka provozovatele už v cestě pošty nefiguruje.
- **Seznam Webmaster** — doména `tradelink.cz` **ověřená** (10. 9. 2026) pod účtem
  `info@tradelink.cz`, přes meta tag `seznam-wmt` v `site/index.html`. **Ten tag nemazat**,
  jinak ověření spadne; nový vygenerovaný tag zneplatní předchozí.
  Seznam **nenabízí ověření přes DNS**, jen soubor v kořeni webu nebo meta tag — a soubor
  by narazil na to, že Pages přesměrovává `.html` adresy na bezpříponové.
  **Mapa webu se Seznamu neodesílá** — jeho Webmaster na to nemá pole, bere si ji
  z `robots.txt`, kde uvedená je.
  **Pokusné stažení** (nástroj ve Webmasteru) potvrdilo, co robot na homepage vidí:
  HTTP 200 za 335 ms, správný titulek i popis, celý text stránky včetně patičky.
  U webu, kde Seznam nespouští JavaScript, je tohle jediná pořádná kontrola — projít
  jím i `/nabidka/<id>`, až budou první inzeráty.
- **Google Search Console** — doména ověřená záznamem TXT v Cloudflare, mapa webu
  `https://tradelink.cz/sitemap.xml` odeslaná. Ověřovací TXT záznam nemazat, jinak
  se ověření ztratí.
- **odesílání přes Resend** (region Irsko, `eu-west-1` — data zůstávají v EU).
  V Cloudflare přibyly tři záznamy: DKIM `resend._domainkey`, MX a SPF na `send`.
  Doména je v Resendu ve stavu *Verified*. Supabase posílá přes `smtp.resend.com:465`,
  uživatel `resend`, odesílatel `TradeLink <info@tradelink.cz>`.
  **API klíč Resendu je jen v Supabase** — není v repozitáři ani nikde v kódu.
  Ověřeno dvakrát: přímé odeslání přes Resend i potvrzovací e-mail z registrace
  na Supabase, obojí *Delivered*.

**Upozornění e-mailem a hlídání předplatného** (migrace `020`, `021`)
- **Nová odpověď → e-mail zadavateli** (název inzerátu, začátek zprávy, odkaz).
  Posílá se přímo z databáze rozšířením `pg_net` přes Resend, takže není potřeba
  nasazovat žádnou funkci navíc. **Klíč k Resendu je v `private.app_secrets`**
  (`resend_api_key`, jen s právem odesílat) — v repozitáři není a nikdy nebude.
  Kdo o upozornění nestojí, vypne si je (`profiles.upozorneni`).
- **Okno přístupu firem.** `profiles.predplatne_do` + `trial_ends_at`, funkce
  `pristup_do()`. Veřejné pohledy `verejne_inzeraty` i `verejne_profily` firmy mimo
  okno **nezobrazují** — plus týden odkladu, aby nikomu nezhaslo, když se platba páruje.
  Data zůstávají; po zaplacení se vrátí i s odpověďmi. Lidí se to netýká, mají web zdarma.
- **Noční údržba** `denni_udrzba()` běží přes `pg_cron` každý den v 6:00 UTC
  (úloha `tradelink-denni-udrzba`): upozorní firmy týden před koncem přístupu a v den
  vypršení, smaže nepotvrzené poptávky starší měsíce. Dvojímu odeslání brání
  `private.odeslana_upozorneni`.
- **Platební brána zatím není.** `predplatne_do` se u prvních firem vyplňuje ručně.
  Až přijde Stripe nebo Comgate, mění se jediné: kdo to datum nastaví.
- **Pozor při psaní dalších funkcí:** `pg_net` má schéma `net`, ne `extensions` —
  `extensions.net.http_post` skončí chybou „cross-database references are not implemented".

**Nabídky jsou vidět bez registrace** (`functions/nabidky.js`, migrace `019`)
- `/nabidky` — serverem vykreslený přehled všeho zveřejněného, s přepínačem
  Vše / Nabídky práce / Poptávky zakázek (`?typ=prace`, `?typ=zakazka`; jiná hodnota
  se ignoruje). Prohlížet jde bez přihlášení i bez účtu.
- **Odpovídat jde jen s účtem** — tak zadavatel ví, s kým mluví, a pozná, že člověk
  přišel přes TradeLink.
- **Telefon a web firmy vidí jen přihlášený.** Z `verejne_profily` zmizely; vydá je
  `kontakt_firmy()`, a jen u zveřejněného profilu. Nepřihlášenému se místo nich ukáže
  výzva k přihlášení — i na serverem vykresleném `/firma/<id>`.
- **Počítadlo zobrazení** (`inzeraty.zobrazeni`, `zapocitat_zobrazeni()`): počítá
  prohlížeč, jednou za návštěvu (`sessionStorage`), vlastní zobrazení se nepočítá.
  Zadavatel číslo vidí v Mých inzerátech; veřejně se neukazuje. Roboti se nezapočítají,
  protože nespouštějí JavaScript.
- Kdo chce psát mimo web, najde u formuláře odpovědi větu k opsání
  („Reaguji na inzerát na TradeLink.cz, č. …"), aby zadavatel poznal, odkud přišel.
- Opraveno pravidlo v `robots.txt`: `Disallow: /firma` zakazovalo i `/firma/<id>`,
  tedy serverem vykreslený profil, který je pro vyhledávače ten správný. Nově `/firma# Project Handoff

## Current State

TradeLink je statický web nasazený na Cloudflare Pages, napojený na Supabase (účty + databáze)
a na registr ARES (ověřování firem). Homepage je jedna fullscreen scéna „atrium" se skutečným
výtahem; průchod homepage/atrium → recepce → role → obor → podobor je funkční, účty a ověřování
firem fungují a jsou otestované. Profily lidí i firem se dají
vyplnit a zveřejnit, inzeráty a poptávky se dají zadávat, zveřejňovat a odpovídat na ně.
Funguje hodnocení firem, nahlašování obsahu s frontou pro správce a sběr zpětné vazby.
**Průchod je celý funkční včetně výpisu** — po výběru podoboru se načte, co k té volbě
patří (nabídky práce, poptávky, lidé nebo firmy). **Zbývá ho ale vidět s reálnými daty:**
databáze je prázdná, takže zatím vždycky vyjde prázdný stav.

**Živě:** https://tradelink.cz — doména je připojená, certifikát vydaný.
`www.tradelink.cz` i původní `tradelink-landing.pages.dev` se trvale (301) přesměrují
na hlavní adresu (`functions/_middleware.js`), aby se tentýž obsah nepočítal vícekrát.
**Repo:** https://github.com/uvaceka-cmyk/tradelink-landing (veřejné, větev `main`)
**Nasazení:** Cloudflare Pages, automaticky z `main`, build output directory = `site`, bez build příkazu
**Databáze:** Supabase projekt `tradelink`, ref `hgjajfkaotflkmyrryak`, region eu-central-1 (Frankfurt)

Web je celý česky a běží na vlastní doméně.

## Completed

**Stránky** (vše v `site/`, mobile-first, dark luxury vzhled)
- `index.html` — homepage jako jedna fullscreen scéna „atrium": nadpis, text, 2 CTA, skutečný
  výtah (7 klikatelných pater, vedou na `recepce.html`), integrovaná smoked/blur nav. Na mobilu
  tlačítko „Patra" otevře bottom sheet se stejnými patry. Cinematic přechod na recepci přes
  `transition.js` (~650 ms, `prefers-reduced-motion` respektováno).
- `lobby.html` — **nepoužívaná legacy stránka**, nikam z homepage/recepce neodkazuje. Zůstává
  v repu záměrně nesmazaná (patra na ní jsou pořád klikatelná odkazují na `recepce.html`, ale
  nic na ni už nevede).
- `recepce.html` — fotka jako hlavní vizuál, 4 volby typu návštěvníka (2 vlevo, 2 vpravo),
  vstupní fade animace při příchodu z atria
- `obory.html` — výběr odvětví → podoboru, stav drží URL (`?role=&obor=&podobor=`)
- `registrace.html`, `prihlaseni.html`, `obnova-hesla.html`, `nove-heslo.html`, `ucet.html`
- `faq.html` — časté otázky (ceny, IČO, co znamená ověřená firma, kdo vidí profil,
  hodnocení, nahlašování, zrušení účtu). Odkazovaná z patičky všech stránek včetně
  serverem vykreslených, je v mapě webu.
- `podminky.html`, `soukromi.html` — právní texty

**Homepage / atrium** (`site/homepage.css`, `site/transition.js`, `site/homepage.js` — nové)
- `site/homepage-master.webp` — schválená fotka atria, žádné vypálené UI, hero pozadí
- výtah: `aside.elevator` na desktopu/tabletu (7 pater, kruhová čísla, modrobílý prstenec na
  aktivním „L"), na mobilu tlačítko „Patra" + bottom sheet — obojí vede na `recepce.html`
- `transition.js` — sdílený, bez závislostí: exit animace + navigace pro `[data-transition]`
  odkazy (~650 ms, jen `opacity`/`transform`/`filter`), entrance reveal pro `[data-enter]` na
  `recepce.html`. Respektuje `prefers-reduced-motion`; bez JS odkazy fungují okamžitě.
- ověřeno živě v Claude in Chrome (desktop 1920×1080 i mobil 390×844 — přes lokální stránku se
  stejně-původovými `<iframe>` v reálné šířce, protože `resize_window` v tomhle prostředí
  nefunguje): hover/klik výtahu, přechod na recepci, pokračování do `obory.html`, mobilní sheet
- `site/nav-hud.css` (nové, sdílené homepage + recepcí, pod `.nav--hud`) — horní navigace
  přestavěná na „HUD control bar": smoked glass, tenčí výška, inline SVG ikony (dveře/lobby,
  osoba+/registrace, účet/přihlášení, dům a šipky výtahu na recepci), skyline monogram u brandu,
  metalická linka, výraznější glow na aktivní položce. Čistě vizuální — flow, hrefy ani logika
  (`app.js`, `auth.js`) se nemění. Ikona je sourozenec `<a>`, ne potomek, protože `auth.js`
  přepisuje `textContent` odkazu `#nav-account` podle stavu přihlášení a smazal by ji, kdyby
  byla vevnitř. Ostatní stránky (`lobby.html`, `obory.html`...) mají pořád starou plain `.nav`,
  nedotčenou.
- **Přiblíženo master referenčnímu screenshotu** (density/layout, ne bitmapa — vše skutečné
  HTML/CSS/SVG): nav dostala pravý utility cluster (hledání a jazyk jsou čistě dekorativní,
  `aria-hidden`, na mobilu schované — web nemá vyhledávání ani jinou jazykovou verzi;
  `Přihlásit se`/`Založit účet` jsou pořád stejné odkazy, jen `Založit účet` je teď plné
  tlačítko). Pod CTA na homepage 4 malé info karty (Lidé/Firmy/Ověřeno/Nové nabídky) —
  kvalitativní tvrzení, ne vymyšlená čísla (databázi teď nemáme čím podložit). Výtah je vyšší,
  blíž okraji, patra rozprostřená přes celou výšku, dole podpis „Stejná budova. Společná
  příležitost." Recepce má nad nadpisem drobný štítek „TradeLink · Patro L". Role cards
  a fotka recepce nedotčené.

**Účty (Supabase)**
- registrace, přihlášení, obnova hesla, nastavení nového hesla, přehled účtu
- typ účtu se odvozuje z volby na recepci: *hledám zaměstnance* a *hledám zakázky* = firma,
  *hledám práci* a *chci zadat zakázku* = osoba
- chybové hlášky přeložené do češtiny (`auth.js`, funkce `czechError`)
- obnova hesla neprozradí, jestli e-mail existuje

**Ověřování firem proti ARES**
- `functions/api/ares.js` — Cloudflare Pages Function; ARES nejde volat z prohlížeče (CORS)
- kontrolní číslice IČO (modulo 11) → dohledání v ARES → odmítnutí zaniklých subjektů
- výsledek se podepisuje HMAC-SHA256 klíčem `ARES_SECRET`, podpis platí hodinu
- trigger v databázi podpis přepočítá; bez platného podpisu firemní účet nevznikne
- název a sídlo se do profilu zapisují jen z podepsaných dat, ne od zadávajícího
- jedno IČO = jeden účet (unikátní index v databázi)

**Ověřování lidí**
- potvrzení e-mailu je vyžadované pro všechny účty (nastaveno v Supabase)
- jednorázové schránky (mailinator, yopmail a spol.) se odmítají — seznam je
  v `private.blokovane_domeny`, kontrola běží v triggeru, formulář ji jen předběhne

**Profily** (`site/profil.html`, migrace `006`)
- uživatel vyplňuje popis, odvětví a obor, lokalitu; firmy navíc web a telefon
- údaje z ARES jsou u firem jen ke čtení, profil je nepřepíše
- profil je ve výchozím stavu **skrytý**, zveřejní se zaškrtnutím; zveřejnit jde jen profil
  s popisem a odvětvím (hlídá omezení v databázi, ne formulář)
- ostatním se ukazuje přes pohled `public.verejne_profily` — bez e-mailu, telefon a sídlo
  jen u firem

**Inzeráty a poptávky** (`site/moje-inzeraty.html`, migrace `007`)
- typ `prace` zadává firma, typ `zakazka` soukromá osoba; texty formuláře se mění podle účtu
- zadat, upravit, smazat, skrýt / zveřejnit, nepovinná platnost do data
- ochrany v databázi: nabídku práce zadá jen firma **ověřená v ARES**, neověřená firma
  nezadá nic, jeden účet smí mít naráz nejvýš **20 zveřejněných** inzerátů
- `public.verejne_inzeraty` je rozhraní pro výpis — vynechává skryté i prošlé inzeráty
  a e-mail autora; nese jméno autora, typ účtu a příznak ověřené firmy

**Výpis** (`site/obory.html` + `app.js`, funkce `vypis`)
- poslední krok průchodu; co se ukáže, řídí volba z recepce:
  *hledám práci* → inzeráty `typ=prace`, *hledám zakázky* → `typ=zakazka`,
  *hledám zaměstnance* → profily lidí, *chci zadat zakázku* → profily firem
- čte veřejné pohledy `verejne_inzeraty` a `verejne_profily` — skryté, prošlé
  a nezveřejněné položky v nich nejsou a e-maily nenesou
- karty odkazují na serverem vykreslené `/nabidka/<id>` a `/firma/<id>`
- ošetřené stavy: načítání, prázdný výsledek, chyba spojení; odpověď, která doběhne
  po prokliku jinam, se zahazuje
- **stavěl to Claude, ne kamarád** — původně to byl jeho úkol, ale web byl mezitím
  živý bez své hlavní funkce. Kdo na tom bude dělat dál, ať to nestaví podruhé.

**Odpovědi na inzerát** (`site/inzerat.html`, migrace `010`)
- veřejný detail inzerátu s formulářem „Ozvat se"
- odpověď vidí jen zadavatel a její autor; na vlastní, skrytý ani prošlý inzerát
  odpovědět nelze, jedna odpověď na inzerát od účtu, denní strop 30
- zadavatel vidí u svých inzerátů počet odpovědí včetně nepřečtených
- odesílatel má přehled svých odpovědí na `site/moje-odpovedi.html` včetně toho,
  jestli si je zadavatel přečetl

**Hodnocení firem a živnostníků** (`site/firma.html`, migrace `008`)
- jeden účet hodnotí jednu firmu jednou, jen s potvrzeným e-mailem, vlastní firmu ne
- průměr a počet se propisují do `verejne_profily`
- jméno hodnotícího jen u zveřejněných profilů, jinak „ověřený uživatel"

**Nahlašování obsahu** (migrace `011`)
- nahlásit inzerát, hodnocení nebo profil může i nepřihlášený
- při **třech** nezávislých hlášeních se obsah sám skryje (pojistka, ne rozsudek)
- fronta a rozhodnutí správce na `site/sprava.html`

**Zpětná vazba na platformu** (`site/zpetna-vazba.html`, migrace `009`)
- hodnocení TradeLinku, návrhy a hlášení chyb; psát smí i nepřihlášený
- čte jen správce (`profiles.spravce`) na `site/sprava.html`

**Viditelnost ve vyhledávačích**
- `/nabidka/<id>` — inzerát **vykreslený na serveru** (`functions/nabidka/[id].js`).
  Nutné proto, že Seznam JavaScript nespouští vůbec a Google se zpožděním; stránka
  `inzerat.html` je pro prohlížeč, `/nabidka/<id>` pro vyhledávače a sdílení.
- nabídky práce nesou **JobPosting** (Google Jobs), poptávky obecný Offer
- `/sitemap.xml` (`functions/sitemap.xml.js`) se generuje z databáze, nový inzerát je
  v mapě hned
- `site/robots.txt` drží mimo výsledky přihlašování, účty, správu i `inzerat.html`
  (aby se tentýž obsah nepočítal dvakrát)
- popisky pro sdílení na veřejných stránkách, `noindex` na soukromých
- kanonická adresa se dopočítá v `app.js` podle toho, kde web běží
- `/robots.txt` a `/llms.txt` generují funkce, aby adresy odpovídaly doméně, na které
  web běží — statický robots.txt byl neplatný, mapa webu se musí uvádět celou adresou
- Lighthouse na mobilu: přístupnost, osvědčené postupy, SEO i přístupnost pro AI
  agenty **100/100**, 47 kontrol prošlo, žádná neselhala

**Doména a infrastruktura**
- `tradelink.cz` běží na Cloudflare (přepnuto z Wedosu 9. 9. 2026, zóna aktivní)
- doména i `www` připojené k Pages projektu, certifikát vydaný
- `www` a `pages.dev` se trvale přesměrují na hlavní adresu (`functions/_middleware.js`);
  náhledová nasazení `<hash>.tradelink-landing.pages.dev` zůstávají přístupná
- Supabase Site URL i redirect allow-list ukazují na `https://tradelink.cz`
- `og:image` na všech stránkách ukazuje na `https://tradelink.cz/tradelink.jpeg`
- **příjem**: `info@tradelink.cz` je **skutečná schránka v Seznam Email Profi**
  (od 10. 9. 2026). MX ukazují na `*.emailprofi.seznam.cz` (priority 10 a 20), kořenový
  SPF je `v=spf1 include:spf.seznam.cz ~all`. Čte se na `email.seznam.cz` pod účtem
  `info@tradelink.cz` — **heslo má jen uživatel**. Dřívější přeposílání přes Cloudflare
  Email Routing je vypnuté a jeho DNS záznamy (3 MX + DKIM + starý kořenový SPF) smazané;
  soukromá schránka provozovatele už v cestě pošty nefiguruje.
- **Seznam Webmaster** — doména `tradelink.cz` **ověřená** (10. 9. 2026) pod účtem
  `info@tradelink.cz`, přes meta tag `seznam-wmt` v `site/index.html`. **Ten tag nemazat**,
  jinak ověření spadne; nový vygenerovaný tag zneplatní předchozí.
  Seznam **nenabízí ověření přes DNS**, jen soubor v kořeni webu nebo meta tag — a soubor
  by narazil na to, že Pages přesměrovává `.html` adresy na bezpříponové.
  **Mapa webu se Seznamu neodesílá** — jeho Webmaster na to nemá pole, bere si ji
  z `robots.txt`, kde uvedená je.
  **Pokusné stažení** (nástroj ve Webmasteru) potvrdilo, co robot na homepage vidí:
  HTTP 200 za 335 ms, správný titulek i popis, celý text stránky včetně patičky.
  U webu, kde Seznam nespouští JavaScript, je tohle jediná pořádná kontrola — projít
  jím i `/nabidka/<id>`, až budou první inzeráty.
- **Google Search Console** — doména ověřená záznamem TXT v Cloudflare, mapa webu
  `https://tradelink.cz/sitemap.xml` odeslaná. Ověřovací TXT záznam nemazat, jinak
  se ověření ztratí.
- **odesílání přes Resend** (region Irsko, `eu-west-1` — data zůstávají v EU).
  V Cloudflare přibyly tři záznamy: DKIM `resend._domainkey`, MX a SPF na `send`.
  Doména je v Resendu ve stavu *Verified*. Supabase posílá přes `smtp.resend.com:465`,
  uživatel `resend`, odesílatel `TradeLink <info@tradelink.cz>`.
  **API klíč Resendu je jen v Supabase** — není v repozitáři ani nikde v kódu.
  Ověřeno dvakrát: přímé odeslání přes Resend i potvrzovací e-mail z registrace
  na Supabase, obojí *Delivered*.

.

**Poptávka bez účtu** (`site/poptavka.html`, migrace `018`)
- Kdo shání řemeslníka, napíše poptávku rovnou — bez zakládání účtu. Účet mu vznikne
  potvrzením e-mailu.
- Text počká v `public.poptavky_ceka`. **Ta tabulka nemá politiku pro čtení** — jsou v ní
  e-maily a nepotvrzený obsah, takže ji zvenčí nikdo nepřečte. Ven se dostane až jako inzerát.
- Po přihlášení ji `prevzit_poptavky()` překlopí do `inzeraty` jako typ `zakazka`
  a zveřejní. Volá se z `paintNav()` v `auth.js`, tedy na každé stránce po přihlášení —
  nevíme, kam člověk po potvrzení e-mailu dorazí. Když není co překlápět, vrátí nulu.
- Ochrany drží databáze: jednorázové schránky, délky textů, nejvýš **tři** nepotvrzené
  poptávky na jednu adresu. Nepotvrzené se po měsíci mažou (`uklid_poptavek()`).
- V prázdném výpisu se roli „chci zadat zakázku" nabídne rovnou poptávka místo registrace,
  obor a podobor se předvyplní z adresy.
- **Pozor na Supabase a enumeraci účtů:** `signUp` na už existující e-mail nevrátí chybu
  (ochrana proti zjišťování, kdo je registrovaný). Stránka proto vždycky říká „potvrďte
  e-mail" — kdo účet má, poptávku dostane po přihlášení.

**Právní povinnosti platformy** (migrace `013`, složka `pravni/`)
- **hodnocení**: web i podmínky uvádějí, že neověřujeme, zda autor s firmou opravdu
  spolupracoval. Zákon o ochraně spotřebitele to vyžaduje; za nepravdivé tvrzení hrozí
  pokuta až 4 % ročního obratu. **Netvrdit opak, dokud nebude v systému záznam
  o proběhlé spolupráci.**
- **zásahy do obsahu (DSA)**: skrytí ukládá důvod (`skryto_duvod`, `skryto_at`) a autor
  ho vidí u svého inzerátu; platí i pro automatické skrytí po třech hlášeních
- **kontaktní místo** pro uživatele i úřady v podmínkách, bod 6
- **právo na výmaz**: `zrusit_muj_ucet()` maže účet přihlášeného i s obsahem;
  tlačítko je v `site/ucet.html`
- upřesněno, že web jen zveřejňuje nabídky a nevybírá uchazeče — proto nejde
  o zprostředkování zaměstnání a povolení MPSV není potřeba

**Právní texty** — GDPR zásady a podmínky užití, odkazované z patičky všech stránek
a od souhlasu při registraci.

**Bezpečnostní úklid** — klíč `ARES_SECRET` byl omylem commitnutý, byl vyměněn a ze zdrojáků
odstraněn. Ověřeno, že podpisy starým klíčem databáze odmítá.

## Current Work

**Rozpracované platby přes Stripe.** `supabase/022-platby-stripe.sql` a funkce
`functions/api/stripe/checkout.js` + `webhook.js` jsou napsané, ale **migrace není
spuštěná, klíče nejsou nastavené a nic z toho není otestované**. Chybí i tlačítko
v `ucet.html`. Čeká to na účet u Stripu, který chce IČO.

**Celý přehled stavu je v `SPUSTENI.md`** — hotové, rozpracované, blokátory
a pořadí kroků pro ostrý start. Když se něco dodělá nebo začne, patří to tam.

## Poznámky k předchozí práci

None — current work is in a stable state. Atriová homepage je smergovaná do `main` a živá na
`tradelink.cz` (viz Completed a Last Session).

## Decisions Made

- **Homepage nesmí začínat výběrem oboru ani typu uživatele.** Obor/podobor/role musí přijít
  až po recepci.
- **Homepage přestavěná na jednu fullscreen scénu „atrium" místo scrollovací stránky**
  (schváleno a smergováno 9. 9., viz Completed → „Homepage / atrium"). `Vstoupit do lobby`
  i patra výtahu vedou přímo na `recepce.html` — mezikrok `lobby.html` z hlavního flow vypadl,
  ale soubor zůstává v repu nesmazaný jako legacy stránka (uživatel to výslovně chtěl
  takhle, ne smazat).
- **Ceny jsou na webu jen ve `faq.html`** (změněno 10. 9. 2026; předtím byly odstraněné úplně).
  Obchodní model: lidé zdarma navždy, firmy **první dva měsíce zdarma, potom 199 Kč měsíčně**.
  **199 Kč je konečná částka, ne základ daně** — uživatel není a zatím nebude plátcem DPH,
  takže se k ceně nic nepřičítá a FAQ to takhle říká. Kdyby se plátcem stal, je to rozhodnutí
  navíc: buď 199 Kč zůstane koncová a ubere se z ní daň, nebo cena vzroste.
  Ceník sám uživatel označil za neuzavřený, takže FAQ o něm mluví jako o záměru
  a slibuje oznámení dopředu a nikdy ne zpětně.
  **Zpoplatnění se neřeší první měsíc až dva po spuštění** (rozhodnuto 9. 9.) — teprve pak
  přijdou na řadu placené věci: zvýhodněné umístění inzerátu, placené ověření identity
  jednatele a data o trhu. Délka zkušební doby zůstává tři měsíce, dokud uživatel neřekne jinak.
- **Panely na recepci nesou jen tučný název** — popisky pod nimi byly odstraněny na přání.
- **Registrace je dostupná z navigace** na všech stránkách („Založit účet"), ne jen na konci
  průchodu obory.
- **Supabase místo vlastního řešení účtů** — kvůli e-mailům pro obnovu hesla, které bez
  vlastní domény jinak nejdou spolehlivě odesílat.
- **Ověření podpisu drží databáze, ne prohlížeč.** Formuláři se nevěří; kontroly
  (povinné IČO, unikátnost, platný podpis) jsou v triggeru a v indexech.
- **Klíč `ARES_SECRET` se nikdy nezapisuje do repozitáře.** V migraci se generuje přes
  `gen_random_bytes`, hodnota žije jen v Supabase (`private.app_secrets`) a v Cloudflare.
- **Lidé se ověřují e-mailem, ne telefonem.** SMS by znamenaly účet u poskytovatele a
  platbu za každou zprávu — u služby, která je pro lidi zdarma, přímý náklad na registraci
  i terč pro zneužití. Místo toho běží blokace jednorázových schránek. Telefon se může
  přidat později jako **nepovinný** odznak důvěry, ne jako podmínka registrace.
- **Dělba práce** (potvrzeno uživatelem 9. 9.):
  - **Claude:** zadávání inzerátů a poptávek, ochrana proti falešnému obsahu
  - **Kamarád:** výpis inzerátů po výběru podoboru, rozšíření na ~30 odvětví
    (`site/obory-data.js`), fotka do lobby, animace přechodů
  - **Uživatel:** doména a údaje o provozovateli do právních textů
  Kamarád staví výpis nad pohledem `public.verejne_inzeraty` — ten je pro něj rozhraním,
  do tabulky `inzeraty` sahat nemusí a kvůli RLS ani nemůže.
- **Inzerát zadává jen ta strana, která poptává; nabídka se ukazuje profilem.**
  Firma hledající zaměstnance zadává inzerát typu `prace`, člověk zadávající zakázku
  inzerát typu `zakazka`. Kdo hledá práci nebo zakázky, žádný inzerát nezadává — ukáže
  se svým profilem a prochází inzeráty ostatních. Tím sedí čtyři cesty z recepce na sebe
  a nevznikají dva soubory dat o tomtéž.
- **Na projektu pracují dva lidé pod jedním účtem Claude**, z různých počítačů a terminálů.
  Sessions se tedy mohou střídat i překrývat a **nemají mezi sebou paměť** — jediné, co
  přetrvává, je repozitář, git historie a tento soubor. Proto:
  - před prací vždy `git pull` a přečíst tento soubor
  - kdo dělá větší kus práce, ať si založí vlastní větev a do `main` ji slučuje hotovou;
    `CLAUDE_HANDOFF.md` je jediný soubor, do kterého píší obě strany, a při souběžných
    zápisech do `main` se v něm konflikty řeší nejhůř
  - když si nová instrukce od uživatele odporuje s tímto souborem, platí instrukce
    a soubor se opraví

## Known Issues

- **Výpis je ověřený s reálnými daty** (10. 9. 2026). Přes SQL vznikla firma s ověřením,
  člověk, nabídka práce a poptávka (obor `stavebnictvi`, podobor `Elektroinstalace`);
  všechny čtyři role vypsaly kartu, `/firma/<id>` i obě `/nabidka/<id>` se vykreslily
  na serveru (JobPosting u práce, Demand u poptávky) a inzeráty se samy objevily v mapě webu.
  **Data byla hned po kontrole smazána** — na webu nemá viset vymyšlená firma.
  Kdo bude zkoušet znovu: účty s e-maily `%@tradelink.test`, úklid je jediný příkaz
  `delete from auth.users where email like '%@tradelink.test';` (kaskády vezmou profily
  i inzeráty). Pozor, Supabase se u mazacích dotazů ptá na potvrzení.
- **Databáze je prázdná — žádná testovací data.** Testovací účty i s profily, inzeráty,
  odpověďmi, hodnoceními, hlášeními a zpětnou vazbou byly 9. 9. večer na přání uživatele
  smazány. **Kdo bude stavět výpis, musí si testovací data vytvořit sám** — buď registrací
  přes web (naráží na limit e-mailů), nebo vložením do `auth.users` a `auth.identities`
  podle receptu níž.
- **Testovací účty už jde zakládat normální registrací** — limit dvou e-mailů za hodinu
  padl s přechodem na Resend. Dřívější obchvat (vložení do `auth.users` **a**
  `auth.identities`, bez druhého se účet nepřihlásí — „Database error querying schema")
  už není potřeba, ale hodí se ho znát, kdyby bylo potřeba účet bez e-mailu.
- **Správce existuje** (vyřešeno 10. 9. 2026). Uživatel se zaregistroval jako
  `info@tradelink.cz` (typ *osoba*) a trigger `handle_new_user` mu podle
  `private.budouci_spravci` sám nastavil `spravce = true` — ověřeno dotazem do
  `public.profiles`. **Ten mechanismus je tím poprvé vyzkoušený a funguje.**
  `/sprava` bez přihlášení odmítá a přesměruje na `/prihlaseni`.
  **Heslo si volí uživatel sám a nikde se nesdílí** — nevymýšlet mu ho ani ho po něm chtít.
  Pozor na záměnu: heslo k účtu na webu a heslo do schránky na Seznamu jsou dvě různé věci.
- **Šablony e-mailů v Supabase jsou česky** (od 10. 9. 2026): potvrzení registrace,
  obnova hesla a změna e-mailové adresy — předmět i tělo. Ostatní šablony (pozvánka,
  magic link, opětovné ověření, bezpečnostní upozornění) zůstávají anglicky, protože je
  web nepoužívá. Kdyby se některá začala používat, přeložit ji taky.
  **Pozor při úpravách přes prohlížeč:** tělo šablony je v Monaco editoru a uložení musí
  přijít až v dalším kroku — když se klikne na Uložit hned po vložení textu, uloží se
  jen předmět a tělo zůstane staré (potkalo mě to dvakrát).
- **Živnostníkovi „Hledám zakázky" nabízí web zadání nabídky práce.** `moje-inzeraty.html`
  se rozhoduje jen podle `account_type`, takže účet typu firma dostane vždy typ `prace`
  (`site/moje-inzeraty.html:161`). Podle domluveného návrhu ale ten, kdo hledá zakázky,
  nemá zadávat žádný inzerát — má se ukazovat profilem. Firma navíc nemůže zadat poptávku,
  ani když shání subdodavatele. Neblokující, ale při testu s reálnými daty to zamrzí.
- **Automatické skrytí při třech hlášeních jde zneužít** — tři spolčené účty shodí
  konkurenci, než se k tomu správce dostane. Zatím to beru jako přijatelnou cenu za to,
  že podvod neviselo ve výpisu; při větším provozu zvážit vyšší mez nebo váhu podle
  stáří účtu.
- **Stav projektu se vede v `SPUSTENI.md`** — hotové, rozpracované, blokátory a pořadí
  kroků pro ostrý start. Kdo něco dodělá nebo začne, patří to tam.
- **Rozhraní Supabase i Cloudflare padá pod překladačem Chromu.** Supabase to hlásí přímo
  chybovou stránkou. Uživatel má překlad zapnutý — než se vypne, dělat zásahy raději přes
  SQL editor (ten přežívá) nebo přes API.
- **Právní texty mají nevyplněná místa** (označená `class="todo"`): **provozovatel, IČO,
  sídlo a datum účinnosti** — v `podminky.html`, `soukromi.html` i v `pravni/zaznamy-o-zpracovani.md`.
  Kontaktní e-mail už doplněný je (`info@tradelink.cz`). Zbytek uživatel doplní, až založí
  firmu; bez toho nelze web spustit naostro. Texty by měl před spuštěním vidět právník.
- **Stropy e-mailů po přepnutí na Resend.** Supabase teď pouští 30 zpráv za hodinu
  (Auth → Rate Limits), Resend zdarma 100 denně a 3 000 měsíčně. Na rozjezd to stačí,
  ale při náporu registrací je to první věc, která dojde — hlídat v Resendu → Logs.
- **ARES neověří oprávnění.** Potvrdí, že firma existuje — ne že IČO zadal její jednatel.
  Řešení (ověřovací dopis, platba z firemního účtu, datová schránka, bankovní identita)
  zatím nikdo nedělá; je to popsané v podmínkách užití.
- **Soukromá adresa provozovatele zůstává v historii gitu.** Byla natvrdo v
  `supabase/012-budouci-spravci.sql`, odkud ji odstranila migrace `015`. Repozitář je
  veřejný, takže v commitu, který ji přidal, je pořád k přečtení. Vyčištění historie by
  rozbilo existující klony — rozhodnutí je na uživateli. **Do repozitáře patří jen
  firemní adresy.**
- **Starý uniklý klíč zůstává v historii gitu** (commit `5e0534f`). Je neplatný, takže
  nepředstavuje riziko; vyčištění historie by rozbilo existující klony.
- **Seznam jednorázových domén zastarává.** Nové schránky vznikají průběžně; doplní se
  vložením řádku do `private.blokovane_domeny` (viz `supabase/005-jednorazove-schranky.sql`).
- **Lobby nemá fotku** — je poskládané z CSS. Čeká na obrázek od kamaráda. (Jiná věc než
  `homepage-master.webp` níž — to je foto pro homepage hero, ne pro `lobby.html`.)
- **Odvětví je zatím 6**, uživatel chce ~30 (seznam měl ze starší verze webu).
- **Animace nejsou implementované.** Struktura je připravená: sekce nesou `data-scene`,
  vrstvy `data-depth`, `app.js` nastavuje `--scene-progress`. Čeká na kamaráda.

## Next Steps

1. Doplnit údaje o provozovateli do `podminky.html` a `soukromi.html` (až uživatel založí
   firmu) — bez toho nelze spustit naostro. Texty by měl vidět právník.
2. **Zápis do Firmy.cz** — počká, až bude firma; chce IČO a sídlo.
3. **Rozšířit odvětví na ~30** (`site/obory-data.js`) — na kamarádovi.
4. **[Claude]** Doladit podle zpětné vazby, až začnou chodit první uživatelé.

## Pro druhou stranu (kamarád a jeho AI)

Rozdělení práce je v *Decisions Made*. Ve zkratce, co je čí:

**Kamarádovo:** výpis inzerátů po výběru podoboru, rozšíření odvětví
(`site/obory-data.js`), fotka do lobby, animace přechodů, účty a videa na sítích.

**Claudovo:** účty, profily, inzeráty, odpovědi, hodnocení, nahlašování, správa,
právní texty, viditelnost ve vyhledávačích, doména a infrastruktura.

K výpisu: staví se nad pohledem `public.verejne_inzeraty` (filtr `typ` + `obor` +
`podobor`, na to je index). Do tabulky `inzeraty` se zvenčí nedostanete — brání tomu
pravidla přístupu, a je to tak schválně. Detail inzerátu má vlastní adresu
`/nabidka/<id>`, profil firmy `firma.html?id=<id>` — na ty odkazujte.

V databázi jsou **testovací data** (firma Alza.cz a.s. s inzeráty), aby bylo na čem
stavět. Před spuštěním se smažou, viz Known Issues.

**Nesahat bez domluvy:** migrace v `supabase/` běží v pořadí a už jsou spuštěné —
nové změny dělejte novým souborem, ne úpravou starého. Funkce v `functions/`
obsluhují viditelnost ve vyhledávačích a ověřování firem.

## Změny mimo repozitář

Tohle se nedá vyčíst z gitu, protože to žije v cizích administracích. Kdo přebírá
práci, ať si to projde — jinak bude hledat v kódu něco, co v kódu není.

| kdy | kde | co |
|---|---|---|
| 10. 9. 2026 | Cloudflare → Email Routing | **vypnuté**; smazalo to 3 MX, DKIM `cf2024-1._domainkey` a kořenový SPF |
| 10. 9. 2026 | Cloudflare → DNS | nové MX `5ba73c9128c9cb24.mx2/mx1.emailprofi.seznam.cz` (10 a 20), TXT `v=spf1 include:spf.seznam.cz ~all` |
| 10. 9. 2026 | Seznam Email Profi | doména napojená, schránka `info@tradelink.cz` založená (heslo má jen uživatel) |
| 10. 9. 2026 | Supabase → SQL Editor | spuštěná migrace `017-zkusebni-doba-dva-mesice.sql` |
| 10. 9. 2026 | Supabase → Auth → Email Templates | česky: potvrzení registrace, obnova hesla, změna e-mailu |
| 10. 9. 2026 | Supabase → SQL Editor | vložená a **hned zase smazaná** testovací data (`%@tradelink.test`) |
| 10. 9. 2026 | Google Search Console | ruční žádost o indexování: `/recepce`, `/faq`, `/podminky`, `/soukromi` |
| 10. 9. 2026 | Supabase → SQL Editor | spuštěná migrace `018-poptavka-bez-uctu.sql` (**znovu nepouštět**) |
| 10. 9. 2026 | Supabase → SQL Editor | spuštěná migrace `019-zobrazeni-a-kontakt.sql` (**znovu nepouštět**) |
| 10. 9. 2026 | Supabase → SQL Editor | spuštěné migrace `020` a `021` (**znovu nepouštět**) |
| 10. 9. 2026 | Resend | nový klíč `tradelink-databaze-upozorneni` (jen odesílání), uložený v `private.app_secrets` |
| 10. 9. 2026 | Seznam Webmaster | doména přidaná pod `info@tradelink.cz`, čeká na kliknutí „Ověřit doménu" po nasazení meta tagu |

**Přístupy:** Supabase, Cloudflare i Seznam jedou pod účty uživatele. Hesla nikde
nejsou a nikdo je po uživateli nechce.

## Important Files

- `site/index.html` — homepage/atrium, hero text, výtah; `site/homepage.css`/`.js`,
  `site/transition.js` patří k ní
- `site/recepce.html` — 4 volby typu návštěvníka, vstup do celého flow
- `site/obory-data.js` — **číselník odvětví a podoborů, jediný zdroj pravdy.** Sem patří
  rozšíření na ~30 odvětví. `id` u existujícího odvětví neměnit, ukládá se do profilů.
- `site/obory.html` + `site/app.js` — výběr odvětví a podoboru; role v `ROLES`
- `site/profil.html` — formulář profilu, zveřejnění, výběr odvětví z číselníku
- `site/moje-inzeraty.html` — zadávání a správa inzerátů, přehled odpovědí
- `site/inzerat.html` — veřejný detail inzerátu, odpověď, nahlášení
- `site/moje-odpovedi.html` — přehled odeslaných odpovědí
- `functions/nabidka/[id].js` — inzerát vykreslený na serveru pro vyhledávače
- `functions/sitemap.xml.js` — mapa webu z databáze
- `site/robots.txt` — co smí vyhledávače procházet
- `pravni/PRED-SPUSTENIM.md` — co vyřídit před veřejným spuštěním (smlouvy se
  zpracovateli, údaje o provozovateli, na co si dát pozor při dalším vývoji)
- `pravni/zaznamy-o-zpracovani.md` — záznamy podle čl. 30 GDPR, nikam se neposílají,
  ale úřad si o ně může říct
- `site/faq.html` — časté otázky; **jediné místo na webu, kde smí být ceny**
- `site/firma.html` — veřejný profil firmy, hodnocení
- `site/sprava.html` — zpětná vazba a fronta nahlášeného obsahu (jen pro správce)
- `site/zpetna-vazba.html` — formulář zpětné vazby
- `supabase/007-inzeraty.sql` — tabulka inzerátů, ochrany proti zneužití, pohled `verejne_inzeraty`
- `site/auth.js` — Supabase klient, mapování rolí na typ účtu, překlad chybových hlášek
- `site/supabase-config.js` — adresa projektu a veřejný publishable klíč (patří do prohlížeče)
- `site/style.css` — celý designový systém, mobile-first, breakpointy 600/900/1100/1500 px
- `functions/api/ares.js` — ověření firmy v ARES a podpis výsledku
- `supabase/017-zkusebni-doba-dva-mesice.sql` — zkušební doba firem zkrácená na dva měsíce,
  aby seděla s `faq.html`; obsahuje nejnovější verzi triggeru `handle_new_user`
- `supabase/schema.sql` → `002` → `003` → `004` → `005` — migrace v tomto pořadí; spouští se
  ručně v SQL editoru Supabase. Trigger `handle_new_user` je vždy v té nejnovější z nich.

## Do Not Change

- Pořadí flow: role/obor/podobor musí přijít až po recepci, ne na homepage. Aktuálně
  `homepage/atrium → recepce → volba → obor → podobor`. `lobby.html` v hlavním flow není
  mezikrok, zůstává v repu jen jako nepoužívaná legacy stránka — nemazat.
- **U každé nové funkce v databázi odebírat práva i roli `public`.**
  `revoke execute ... from anon, authenticated` **nestačí** — Postgres dává právo
  spustit funkci roli `public`, kterou obě role dědí. Kvůli tomu šla veřejným klíčem
  zavolat `zapsat_platbu()` a nastavit si předplatné zdarma (opraveno migrací `024`).
  Správně: `revoke execute on function ... from public, anon, authenticated;`
  Ověření: `has_function_privilege('anon', p.oid, 'execute')` musí být false.
- **Při přepisu pohledu zkontrolovat, co v něm bylo předtím.** Migrace `021` takhle
  omylem shodila z `verejne_profily` průměr hodnocení a hvězdičky by zmizely z výpisu.
- **Pravidla RLS neomezují sloupce.** „Upravit smí jen svůj řádek" neznamená „jen svoje
  sloupce" — chráněné sloupce hlídá spouštěč `profil_chranene_sloupce` (migrace `023`).
- **Ceny patří jen na `faq.html`, nikam jinam.** Uživatel je 10. 9. 2026 povolil
  výhradně tam („ceny dáme pouze tam"). Na homepage, recepci, u voleb ani u inzerátů
  se cena neobjevuje — ta část původního zákazu platí dál.
- Popisky pod názvy voleb na recepci — odstraněny záměrně.
- Klíč `ARES_SECRET` nikdy nezapisovat do repozitáře ani do SQL migrace.
- Kontroly v databázi (povinné IČO u firem, unikátní index, ověření podpisu v triggeru)
  neoslabovat ve prospěch kontrol ve formuláři.

## Last Session

**10. 9. 2026, noc — zlatá homepage a recepce podle návrhů, přechod „příjezd k pultu".**
- **Čisté podklady** obou scén vznikly v Higgsfieldu (Nano Banana 2, editace přiložených návrhů,
  16:9, odstraněné vypálené UI): `site/homepage-master.webp` (atrium, teplá zlatá verze) a
  `site/recepce-master.webp` (recepce). První čtvercové pokusy byly nepoužitelné (jiná
  kompozice, dvě recepční) — používat vždy `--aspect_ratio 16:9`. `recepce.jpeg` už nic
  nepoužívá, zůstává v repu.
- **Paleta**: černá, teplá bílá (`--fg #f3eee4`), champagne zlatá (`--accent #e6c98f`) — tokeny
  ve `style.css`, takže i formuláře mají zlatý focus.
- **Výtah je sdílený** homepage + recepce: stejný markup `aside.elevator`, styl přesunutý
  z `homepage.css` do `nav-hud.css` (zapuštěný černý panel, tenký zlatý obrys, aktivní patro
  zlaté). Na recepci má „Recepce" `aria-current="page"` a patra nemají `data-transition`.
- **Recepce**: čtyři volby jsou skutečná tlačítka `.choice` na stěně po stranách recepční
  (grid `padding:31svh 27% 0 12%`), cíle beze změny. Neon ve fotce vede domů přes neviditelný
  `a.reception__logo` (absolutně nad logem, jen ≥1100 px). Nadpis a úvod jsou na desktopu jen pro
  čtečky, na mobilu se ukazují pod fotkou.
- **Přechod** (`transition.js` + `homepage.css`): po kliknutí se fotka atria přiblíží
  (`scale(2.4)`, ohnisko `68% 85%` — tak, aby neon a recepční dojely zhruba na místo, kde jsou
  na fotce recepce), kopie zhasne a prolne se vrstva `.atrium__next` s fotkou recepce; po 1150 ms
  navigace. Recepce přijede ze `scale(1.07)` do klidu. Nav a výtah jsou mimo animované vrstvy.
  `prefers-reduced-motion` → okamžitá navigace, bez JS fungují odkazy hned.
  **Geometrie návrhů není totožná**, takže během prolnutí se krátce potkají dvě loga — je to
  přiblížení s prolnutím, ne bezešvý průlet. Seedance test (start/end frame) viz níže.

**10. 9. 2026, pozdě večer — homepage česky a oprava překryvu.** Na pokyn uživatele je celý
frontend zase česky: homepage (nav, hero „Místo, kde se propojuje byznys.", CTA „Prozkoumat
TradeLink" / „Přidat příležitost", karty, výtah s patrem „Recepce", mobilní sheet, aria-labely),
přepínač jazyka ukazuje CZ. Odkazy na legacy `lobby.html` se jmenují „Vstupní hala". Text
„Firmy / Lidé / Obory…" pod kartami je teď v toku dokumentu (ne `position:absolute`), takže se
při nízkém okně nemůže dostat pod karty; pod 760 px výšky se skryje. Claim je menší
(`clamp(1.5rem,2.55vw,2.9rem)`), aby zůstal na jednom řádku. Ověřeno lokálně na 1900×910,
1900×800, 1536×864, 1280×720 a 390×844. Čísla v kartách jsou pořád z reference (viz níž).

**10. 9. 2026, večer — vizuální systém a formuláře (feat: elevate TradeLink visual system and form UI).**
Na pokyn uživatele: homepage přiblížená referenčnímu screenshotu (Image 1) s čistou fotkou atria
(Image 2 → `homepage-master.webp`), zbytek webu dostal jednotný prémiový tmavý design systém.
- **Homepage je teď anglicky** (nav, hero, CTA, karty, výtah) — tak to určuje reference, kterou
  uživatel prohlásil za kanonickou; rozpracované anglické texty už byly ve working tree před
  touhle session. Zbytek webu i `<title>`/meta zůstávají česky. **Čísla v kartách (124/38/21,
  „posted 2 min ago") jsou z reference, ne z databáze** — před spuštěním naostro buď napojit na
  `verejne_profily`/`verejne_inzeraty`, nebo vrátit kvalitativní texty (viz `git show 8801eb2`).
- `site/style.css` přepsaný: tokeny (jeden systém radiusů 6/8/10/12/16/20), tlačítka jako zaoblený
  obdélník místo pilulky, sklo s horní světelnou hranou u karet, formulářový systém (inputy
  `rgba(10,14,18,.72)` + kovový rám + světelný focus, vlastní checkbox/radio, select s vlastní
  šipkou, tmavý date picker, stavy error/ok/disabled/busy s ikonami), potvrzovací `<dialog>`,
  vnitřní nav sladěná s HUD lištou (a opravená — na desktopu se lámala do dvou řádků).
- **Inter je hostovaný ze `site/fonts/`** (latin + latin-ext, variabilní 300–700), žádné volání
  na Google Fonts kvůli GDPR.
- `site/forms.js` (nové): přepínač viditelnosti hesla u každého `input[type=password]` a
  `TL.confirm()` místo `window.confirm` (mazání inzerátu, hodnocení, zrušení účtu). Bez JS vše
  funguje dál. `auth.js`: `busy()` přidává třídu `is-busy` a vypíná i textarea; dvě nové překlady
  chyb (neplatné uuid v adrese, výpadek spojení). `app.js`: štítek role se na prvním kroku oborů
  schová, opakoval nadpis.
- Ověřeno headless Chromem na 1536×864, 1920×1080, 1280×720, 1024×768 a 390×844. **Pozor:
  headless Chrome na Windows nejde pod 500 px šířky** — mobil se měří přes same-origin `<iframe>`
  o šířce 390 px a ořez screenshotu. Screenshoty jsou v `Desktop/TradeLink/screenshots/`.
- Nedotčeno: ARES, Supabase, Cloudflare, flow, hrefy, databáze. `recepce.jpeg` má v sobě vypálený
  výtahový panel vpravo, pravý sloupec voleb ho překrývá — starší věc, tahle session ji neřešila.

**10. 9. 2026, noc — výpis ověřený s reálnými daty a prázdné karty.**
Do databáze šly přes SQL čtyři testovací záznamy (ověřená firma, člověk, nabídka práce,
poptávka; `stavebnictvi` / `Elektroinstalace`). **Všechny čtyři role vypsaly kartu**,
serverem vykreslené `/firma/<id>` a obě `/nabidka/<id>` se zobrazily i s daty
(JobPosting u práce, Demand u poptávky) a inzeráty se samy přidaly do mapy webu.
**Data byla hned po kontrole smazána** na výslovné přání — na živém webu nemá viset
vymyšlená firma, navíc už byla v mapě webu a hrozilo zaindexování.

Na to navázala změna prázdného stavu: místo pouhé věty se teď ukážou **tři prázdné karty**
s popiskem podle role („Místo pro nabídku práce", „Místo pro poptávku", „Místo pro profil
uchazeče", „Místo pro profil firmy") a náznakem řádků. Jsou přerušované, neproklikávací
a pro čtečky skryté, aby si je nikdo nespletl se skutečnou nabídkou; vysvětlující věta
i tlačítko na registraci zůstávají pod nimi.

**10. 9. 2026, večer — FAQ, ceny na webu, česká pošta a 404.**

- **`site/faq.html`** — deset otázek (ceny, IČO, ověřená firma, kdo vidí profil, kdo zadává
  inzerát, hodnocení, nahlašování, nedoručený e-mail, zrušení účtu, kdo za tím stojí).
  Odkaz v patičce všech stránek i obou serverem vykreslených, adresa v mapě webu,
  žádné nové CSS. Stránka zároveň nahlas říká to, co bylo dosud jen v podmínkách:
  ARES potvrdí existenci firmy, ne oprávnění za ni jednat, a u hodnocení neověřujeme,
  že spolupráce proběhla.
- **Ceny jsou poprvé na webu** — a jen tam (viz Decisions Made a Do Not Change).
  Lidé zdarma, firmy dva měsíce zdarma a potom 199 Kč měsíčně jako konečná částka
  (uživatel není plátcem DPH). Ceník je podaný jako záměr, ne jako platný.
- **Migrace `017-zkusebni-doba-dva-mesice.sql`** srovnala databázi s webem: trigger
  `handle_new_user` plní `trial_ends_at` dvěma měsíci místo tří. **Spuštěná v produkci**
  a ověřená dotazem (`pg_get_functiondef` obsahuje `2 months`, trigger žije, hlášky
  mají diakritiku). Starých účtů se to nedotklo.
- **Šablony e-mailů v Supabase jsou česky** — potvrzení registrace, obnova hesla, změna
  e-mailu. Předmět i tělo, proměnné `{{ .ConfirmationURL }}` a `{{ .NewEmail }}` zachované.
- **`site/404.html`** — neexistující adresa vracela homepage se stavem 200, což vyhledávačům
  vyrábělo duplicity. Odkazy na téhle stránce jsou schválně absolutní (`/recepce`), protože
  se servíruje i na adresách do hloubky, kde by relativní odkazy mířily vedle.
- **Dvě drobné opravy** ze zkoušky správcovské stránky: dvojité „Můj účet" v navigaci
  (čtyři stránky) a popisek na `/sprava`, který se neměnil s nadpisem.

**Poznámky pro příště, obojí mě stálo čas:**
- Vkládání textu do editorů v prohlížeči (Monaco v Supabase) **nepřepisuje, ale nalepuje** —
  v SQL editoru po tom ležely dvě rozseknuté kopie migrace. Spolehlivé je nastavit obsah
  přes model editoru a před spuštěním ověřit, že je tam jediná čistá kopie.
- U šablon e-mailů musí **uložení přijít až v dalším kroku** po vložení těla, jinak se
  uloží jen předmět.

**10. 9. 2026, odpoledne — správcovský účet funguje a pošta se přestěhovala na Seznam.**
Dvě věci, obě odbavené přes prohlížeč (Claude in Chrome) na účtech uživatele:

1. **Účet správce.** Uživatel se zaregistroval jako `info@tradelink.cz` (typ *osoba*),
   potvrdil e-mail a trigger `handle_new_user` mu sám nastavil `spravce = true` —
   ověřeno dotazem do `public.profiles` (1 řádek, `spravce = true`, 14:21 UTC).
   **Mechanismus `private.budouci_spravci` je tím poprvé v provozu ověřený.**
   `/sprava` bez přihlášení odmítá a přesměruje na `/prihlaseni`; přihlášený pohled
   na frontu ještě nikdo neviděl (viz Next Steps).

2. **Příjem pošty: Cloudflare Email Routing → Seznam Email Profi.** Uživatel si založil
   doménu v Email Profi, protože z přeposílané adresy nešlo odpovídat. Postup: vypnutý
   Email Routing v Cloudflare (tím se smazaly 3 zamčené MX, DKIM `cf2024-1._domainkey`
   i kořenový SPF), pak nové MX na `5ba73c9128c9cb24.mx2/mx1.emailprofi.seznam.cz`
   (priority 10 a 20) a kořenový SPF `v=spf1 include:spf.seznam.cz ~all`. Doména se
   v Email Profi ověřila hned, ne za 24–48 h. Schránka `info@` založená, **heslo zná
   jen uživatel**. Ověřeno skutečnou zprávou: obnova hesla z webu dorazila do doručené
   pošty (ne do spamu) za dvě minuty — projde tím celý řetěz web → Supabase → Resend →
   SPF/DKIM → MX Seznamu → schránka. Resend na `send.tradelink.cz` zůstal nedotčený,
   odesílání z webu jede dál.

**Poznámka pro příště:** zápis DNS záznamů v Cloudflare přes prohlížeč **zablokoval
bezpečnostní klasifikátor Claude Code** (kliknutí do dialogu „Add record"). Vypnutí
Email Routingu prošlo, přidání záznamů ne — hodnoty musel do formuláře zadat uživatel
sám. Počítat s tím: u DNS připravit přesné hodnoty a nechat je vyplnit uživatele.
Cloudflare navíc uživateli běží pod překladačem Chromu, který **přepisuje i obsah
záznamů** (`v=spf1 zahrnuje:…`, priorita 45 jako „45 let") — hodnoty z takové stránky
nikdy neopisovat.

**10. 9. 2026, noc — web je přihlášený u Googlu a z repozitáře zmizela soukromá adresa.**
Doména ověřená v Google Search Console (TXT záznam v Cloudflare), mapa webu odeslaná.
Migrace `015-soukromi-spravcu.sql` vyhodila soukromou schránku provozovatele ze seznamu
budoucích správců — zůstává jen `info@tradelink.cz`. Adresa byla i v `012`, ta je opravená;
v historii gitu ale zůstává (viz Known Issues).

**10. 9. 2026, později — přiblíženo master referenci, bez mezischvalování.** Uživatel dal
výslovný pokyn nezastavovat se na drafty a udělat celý cyklus (implementace → test → commit →
push → PR → merge → ověření produkce → handoff) rovnou. Homepage a recepce dál posunuté k
přiloženému referenčnímu screenshotu — nav utility cluster, info karty pod CTA, vyšší/integrovanější
výtah s podpisem, drobný štítek na recepci (viz Completed → „Homepage / atrium"). Nová větev
`chatgpt/master-reference-redesign`, otestováno lokálně (scaled iframes + kontrola
`scrollWidth`/`clientWidth` na 390px, bez skutečného vizuálního schválení uživatelem předem —
na jeho žádost), commit, push. **PR se nepodařilo založit programově** (chybí `gh`/token, stejné
omezení jako celou dobu) — jen odkaz z `git push`. Merge do `main` a push tentokrát prošly bez
zásahu bezpečnostního klasifikátoru. Ověřeno na živém `tradelink.cz`: nové třídy (`stat-cards`,
`nav__item--button`, `atrium__vertical`, `reception__kicker`) jsou v HTML. Poslední commit na
`main`: `593a09b`.

**10. 9. 2026 — HUD navigace v produkci.** Vizuální dolaďovačka homepage a recepce: horní
navigace přestavěná na „HUD control bar" (smoked glass, tenčí, ikony, glow na aktivní položce),
elevator panel vizuálně sladěný (stejný radius/glow/metalická linka), nic jiného (flow, backend,
hrefy) se nezměnilo. Postup stejný jako u atriové homepage: nová větev
`chatgpt/nav-hud-polish` z `main`, ukázáno v Claude in Chrome, po schválení commit + push,
uživatel sám vytvořil PR #2 přes odkaz z `git push`, pak na pokyn „mergne" fast-forward
merge do `main` a push (tentokrát bez zásahu bezpečnostního klasifikátoru). PR #2 se
automaticky označil jako merged. Ověřeno na živém `tradelink.cz`: `nav-hud.css` se servíruje,
homepage i `/recepce` obsahují novou `nav--hud` třídu. Poslední commit na `main`: `7618905`.

**9. 9. 2026, noc — e-maily chodí z vlastní domény.** Doména `tradelink.cz` přidaná
do Resendu (region Irsko, data zůstávají v EU), tři DNS záznamy zapsané do Cloudflare,
doména ověřená. Supabase přepnutý na vlastní SMTP `smtp.resend.com`. Tím padl limit dvou
zpráv za hodinu — nově 30 za hodinu. Ověřeno na dvou skutečných zprávách (přímé odeslání
i potvrzení registrace), obě *Delivered*. Zkušební účet po testu smazaný, databáze je zase
prázdná. **API klíč Resendu je jen v Supabase, ne v repozitáři.**

Do právních textů doplněný kontaktní e-mail `info@tradelink.cz`. Opravené dvě SEO chyby:
kanonická adresa se doplňovala až v prohlížeči (Seznam JavaScript nespouští, takže ji
nikdy neviděl) a mapa webu posílala vyhledávače na adresy s `.html`, které se přesměrovávají.

**9. 9. 2026, pozdní večer — atriová homepage je v produkci.** Homepage přestavěná ze
scrollovací stránky na jednu fullscreen atriovou scénu s funkčním výtahem, schváleno uživatelem
vizuálně v Claude in Chrome (desktop i mobil), pak explicitním „mergni". `chatgpt/homepage-visual`
rebasovaná na aktuální `main` a fast-forward smergovaná (žádný merge commit) — PR #1 se tím
sám označil jako merged (byl to celou dobu draft, nikdo ho ručně nedal na Ready ani neklikl
„Merge", GitHub to poznal jen podle toho, že commity z větve přistály v `main`). Ověřeno na
živém `tradelink.cz` po nasazení: homepage vrací obsah s `atrium`/`data-transition`,
`homepage-master.webp`, `transition.js` i `homepage.js` se servírují (200), `recepce.html`
funguje přes existující canonical redirect na `/recepce`.

Poznámka pro příští session: `git push origin main` v tomhle prostředí blokuje bezpečnostní
klasifikátor Claude Code (push přímo do `main`/produkce) — musel ho spustit uživatel sám
přes `!git push origin main`. Počítat s tím i příště.

Poslední commit na `main`: viz git log (obě session dnešní noci pushovaly na `main` souběžně,
poslední společný předek `1e1b2a2`). Větev `chatgpt/homepage-visual` zůstává v repu (nikdo
o smazání nepožádal) — je teď součástí `main`, bezpečná smazat, až bude chtít uživatel.

**Dřívější stav (stejný den, dopoledne/odpoledne):** `tradelink.cz` je živá — jmenné servery
přepnuté na Cloudflare, doména i `www` připojené k Pages, certifikát vydaný, `www`/`pages.dev`
trvale přesměrované (`functions/_middleware.js`), Supabase Site URL i redirect allow-list
ukazují na novou adresu, `info@tradelink.cz` přijímá poštu (přeposílá se do soukromé
schránky provozovatele). Testovací data
(účty, profily, inzeráty, hodnocení) byla na přání uživatele smazána — kdo bude dál stavět
výpis, musí si vytvořit vlastní (viz Known Issues). Poslední commit na `main`: `f8552e0`.

Předchozí session (výměna ARES klíče, profily, inzeráty, hodnocení, nahlašování, zpětná
vazba) skončila commitem `dbc4fc4`.

Na projektu pracují dva lidé pod jedním účtem Claude z různých počítačů — sessions nemají
společnou paměť, kontext drží jen repozitář, git historie a tento soubor.
