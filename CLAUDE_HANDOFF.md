# Project Handoff

## Current State

TradeLink je statický web nasazený na Cloudflare Pages, napojený na Supabase (účty + databáze)
a na registr ARES (ověřování firem). Průchod homepage → lobby → recepce → obor → podobor je
funkční, účty a ověřování firem fungují a jsou otestované. Profily lidí i firem se dají
vyplnit a zveřejnit, inzeráty a poptávky se dají zadávat, zveřejňovat a odpovídat na ně.
Funguje hodnocení firem, nahlašování obsahu s frontou pro správce a sběr zpětné vazby.
**Chybí poslední článek: výpis** — po výběru podoboru se pořád zobrazí „zatím připravujeme",
takže se uživatelé k inzerátům dostanou jen přes přímý odkaz. Výpis staví kamarád nad
pohledem `public.verejne_inzeraty` a odkazuje na `inzerat.html?id=` a `firma.html?id=`.

**Živě:** https://tradelink.cz — doména je připojená, certifikát vydaný.
`www.tradelink.cz` i původní `tradelink-landing.pages.dev` se trvale (301) přesměrují
na hlavní adresu (`functions/_middleware.js`), aby se tentýž obsah nepočítal vícekrát.
**Repo:** https://github.com/uvaceka-cmyk/tradelink-landing (veřejné, větev `main`)
**Nasazení:** Cloudflare Pages, automaticky z `main`, build output directory = `site`, bez build příkazu
**Databáze:** Supabase projekt `tradelink`, ref `hgjajfkaotflkmyrryak`, region eu-central-1 (Frankfurt)

Web je celý česky a běží na vlastní doméně.

## Completed

**Stránky** (vše v `site/`, mobile-first, dark luxury vzhled)
- `index.html` — hero, O TradeLinku, Jak to funguje, Výhody, závěrečná výzva
- `lobby.html` — mezikrok mezi homepage a recepcí, panel pater
- `recepce.html` — fotka jako hlavní vizuál, 4 volby typu návštěvníka (2 vlevo, 2 vpravo)
- `obory.html` — výběr odvětví → podoboru, stav drží URL (`?role=&obor=&podobor=`)
- `registrace.html`, `prihlaseni.html`, `obnova-hesla.html`, `nove-heslo.html`, `ucet.html`
- `podminky.html`, `soukromi.html` — právní texty

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
- `info@tradelink.cz` → `uvacek.a@gmail.com` (Cloudflare Email Routing, MX i SPF
  nastavené, příjem ověřený). Odesílání z domény zatím nefunguje — viz Known Issues.

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

**Homepage přestavěná na interaktivní budovu** (větev `chatgpt/homepage-visual`, draft PR #1,
poslední commit `5aa5e44`) — homepage už není klasická scrollovací stránka (hero + O TradeLinku +
Jak to funguje + Výhody + závěrečné CTA), ale jedna fullscreen scéna „atrium" podle schváleného
konceptu. `site/homepage-master.webp` (schválená fotka atria, žádné vypálené UI) je hero pozadí.

**Nový flow (schváleno uživatelem 9. 9.):** `homepage/atrium → recepce.html → role → obor →
podobor → nabídky`. `Vstoupit do lobby` (nav i hero) a všech 7 pater výtahu vedou **přímo** na
`recepce.html` — `lobby.html` jako mezikrok se teď v hlavním flow nepoužívá. **`site/lobby.html`
zůstává v repu beze změny jako nepoužívaná legacy stránka — záměrně nesmazaná, nikam z nové
homepage neodkazovaná.**

Co je hotové:
- `site/index.html` — atrium scéna, integrovaná smoked/blur nav (`.nav--atrium`) bez odkazů na
  smazané sekce, skutečný výtah panel (`aside.elevator`, 7 klikatelných pater, kruhová čísla,
  modrobílý prstenec na aktivním „L"), mobilní tlačítko „Patra" + bottom sheet se stejnými patry.
- `site/homepage.css` — přepsáno pro atrium layout, pozice/glow výtahu, bottom sheet, `is-leaving`
  přechodový stav. Pořád izolované od zbytku designu.
- `site/recepce.html` — vizuálně beze změny (existující panely/ikony/texty netknuté), jen přidán
  `data-enter` pro vstupní fade a načtení `transition.js`.
- `site/transition.js` **(nové)** — sdílené, bez závislostí: exit animace + navigace pro
  `[data-transition]` odkazy (~650 ms, jen `opacity`/`transform`/`filter`), entrance reveal pro
  `[data-enter]`. Respektuje `prefers-reduced-motion`; bez JS odkazy fungují okamžitě.
- `site/homepage.js` **(nové)** — jen pro `index.html`: otevírání/zavírání mobilního bottom
  sheetu (klik, Escape, klik na pozadí).
- `site/style.css` — pár řádků pro `.reception[data-enter]` vstupní animaci.

**Ověřeno živě v Claude in Chrome** (stejné okno uživatele, žádný jiný nástroj — protože
`resize_window` v tomhle prostředí nefunguje, přes lokální stránku se dvěma stejně-původovými
`<iframe>` v reálné šířce 1920px a 390px, jen vizuálně zmenšenými transformací, takže `@media`
dotazy se spouští doopravdy): desktop i mobilní layout, hover na výtahu, klik na patro → přechod →
přistání na `recepce.html`, pokračování z recepce do `obory.html`, otevření/zavření mobilního
bottom sheetu. **Mobil byl tentokrát ověřen vizuálně** (na rozdíl od minula).

Větev je rebasovaná na aktuální `main` (`f8552e0` — nese kontaktní e-mail v právních textech
a vše předtím). Pushnuto na `chatgpt/homepage-visual`. **Do `main` zatím nemergováno — čeká na
finální schválení uživatelem.**

Popis PR #1 na GitHubu a přepnutí z Draft na Ready čekají na ruční akci uživatele (bez `gh`/API
tokenu v tomhle prostředí nejde upravit programově) — navržený text byl předaný v chatu.

## Decisions Made

- **Homepage nesmí začínat výběrem oboru ani typu uživatele.** Obor/podobor/role musí přijít
  až po recepci.
- **Homepage přestavěná na jednu fullscreen scénu „atrium" místo scrollovací stránky**
  (schváleno 9. 9., viz Current Work). `Vstoupit do lobby` i patra výtahu teď vedou přímo na
  `recepce.html` — mezikrok `lobby.html` z hlavního flow vypadl, ale soubor zůstává v repu
  nesmazaný jako legacy stránka (uživatel to výslovně chtěl takhle, ne smazat).
- **Ceny jsou z webu úmyslně odstraněné** (uživatel to výslovně chtěl). V databázi zůstal
  sloupec `trial_ends_at`, který se firmám plní — na webu se nikde nezobrazuje.
  Obchodní model, na kterém se domluvili: lidé zdarma navždy, firmy první 3 měsíce zdarma,
  potom nízký měsíční poplatek. Konkrétní částka není stanovená.
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

- **Databáze je prázdná — žádná testovací data.** Testovací účty i s profily, inzeráty,
  odpověďmi, hodnoceními, hlášeními a zpětnou vazbou byly 9. 9. večer na přání uživatele
  smazány. **Kdo bude stavět výpis, musí si testovací data vytvořit sám** — buď registrací
  přes web (naráží na limit e-mailů), nebo vložením do `auth.users` a `auth.identities`
  podle receptu níž.
- **Registrace naráží na limit dvou e-mailů za hodinu**, takže druhý testovací účet
  vznikl přímo v databázi vložením do `auth.users` **a `auth.identities`** — bez toho
  druhého se účet nepřihlásí („Database error querying schema"). Hodí se to vědět,
  až bude potřeba další testovací účet, dokud není vlastní odesílatel e-mailů.
- **Nikdo teď není správce, na `/sprava` se nikdo nedostane.** V `private.budouci_spravci`
  jsou `uvacek.a@gmail.com` i `info@tradelink.cz` — oba se stanou správcem sami, jakmile
  se s tou adresou zaregistrují. **Ten mechanismus zatím nikdo nevyzkoušel**, po první
  registraci ověřit, že `spravce` je `true`.
  Uživatel chce svůj účet na `info@tradelink.cz` — schránka už poštu přijímá, takže
  registraci nic nebrání (jen naráží na limit dvou e-mailů za hodinu).
  **Heslo si volí sám a nikde se nesdílí** — nevymýšlet mu ho ani ho po něm nechtít.
- **Automatické skrytí při třech hlášeních jde zneužít** — tři spolčené účty shodí
  konkurenci, než se k tomu správce dostane. Zatím to beru jako přijatelnou cenu za to,
  že podvod neviselo ve výpisu; při větším provozu zvážit vyšší mez nebo váhu podle
  stáří účtu.
- **Rozhraní Supabase i Cloudflare padá pod překladačem Chromu.** Supabase to hlásí přímo
  chybovou stránkou. Uživatel má překlad zapnutý — než se vypne, dělat zásahy raději přes
  SQL editor (ten přežívá) nebo přes API.
- **Právní texty mají nevyplněná místa** (označená `class="todo"`): **provozovatel, IČO,
  sídlo a datum účinnosti** — v `podminky.html`, `soukromi.html` i v `pravni/zaznamy-o-zpracovani.md`.
  Kontaktní e-mail už doplněný je (`info@tradelink.cz`). Zbytek uživatel doplní, až založí
  firmu; bez toho nelze web spustit naostro. Texty by měl před spuštěním vidět právník.
- **Odesílání e-mailů pořád běží přes sdíleného odesílatele Supabase** — limit
  **2 zprávy za hodinu**, což brzdí registrace i testování. Příjem už funguje:
  `info@tradelink.cz` se přeposílá na `uvacek.a@gmail.com`. Na odesílání zbývá:
  účet u Resend / Brevo / Mailjet → ověřit `tradelink.cz` záznamy SPF a DKIM v DNS
  (zóna je v Cloudflare, zápis je hotový během minuty) → v Supabase přepnout na vlastní
  SMTP a zvednout limit v Auth → Rate Limits (i s vlastním SMTP je výchozí 30/hodinu).
  Bez toho zůstává nouzová možnost vypnout na dobu vývoje potvrzování e-mailu
  (Authentication → Providers → Email → Confirm email) — **před spuštěním zase zapnout.**
- **ARES neověří oprávnění.** Potvrdí, že firma existuje — ne že IČO zadal její jednatel.
  Řešení (ověřovací dopis, platba z firemního účtu, datová schránka, bankovní identita)
  zatím nikdo nedělá; je to popsané v podmínkách užití.
- **Starý uniklý klíč zůstává v historii gitu** (commit `5e0534f`). Je neplatný, takže
  nepředstavuje riziko; vyčištění historie by rozbilo existující klony.
- **Seznam jednorázových domén zastarává.** Nové schránky vznikají průběžně; doplní se
  vložením řádku do `private.blokovane_domeny` (viz `supabase/005-jednorazove-schranky.sql`).
- **Lobby nemá fotku** — je poskládané z CSS. Čeká na obrázek od kamaráda. (Jiná věc než
  `homepage-master.webp` níž — to je foto pro homepage hero, ne pro `lobby.html`.)
- **Homepage hero na `chatgpt/homepage-visual` nemá vizuálně ověřený mobil.** `homepage-master.webp`
  je hotové a ověřené na desktopu (viz `Current Work`), ale okno v tomhle prostředí nejde zmenšit
  (`resize_window` ani `window.resizeTo()` neúčinkují), takže mobilní breakpoint v `homepage.css`
  byl jen přečtený v kódu, ne vyrenderovaný. Ověřit v DevTools nebo na telefonu před mergem.
- **Odvětví je zatím 6**, uživatel chce ~30 (seznam měl ze starší verze webu).
- **Animace nejsou implementované.** Struktura je připravená: sekce nesou `data-scene`,
  vrstvy `data-depth`, `app.js` nastavuje `--scene-progress`. Čeká na kamaráda.

## Next Steps

1. **[Kamarád]** Výpis po výběru podoboru nad pohledem `verejne_inzeraty` — dnes tam končí
   placeholder „zatím připravujeme". Databáze je prázdná — testovací inzeráty je potřeba
   si napřed vytvořit (recept v Known Issues). Filtr: `typ` + `obor` + `podobor` (na to je index).
2. **[Uživatel]** Nastavit si účet jako správce, jinak je fronta nahlášení nepřístupná.
3. **[Claude]** Doladit podle zpětné vazby, až začnou chodit první uživatelé.
4. Doplnit údaje o provozovateli do `podminky.html` a `soukromi.html` (až uživatel založí firmu).
5. **Odesílání e-mailů** — účet u Resend / Brevo / Mailjet, ověřit `tradelink.cz` záznamy
   SPF a DKIM, v Supabase přepnout na vlastní SMTP a zvednout limit v Auth → Rate Limits.
   Teprve tím padne limit dvou zpráv za hodinu, který dnes brzdí i registrace.
6. **Vyhledávače** — Google Search Console (ověření DNS záznamem v Cloudflare),
   Seznam Webmaster a zápis do Firmy.cz (obojí potřebuje účet na Seznamu
   pod `info@tradelink.cz`).

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

## Important Files

- `site/index.html` — homepage, pořadí sekcí a celý vstupní text
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
- `site/firma.html` — veřejný profil firmy, hodnocení
- `site/sprava.html` — zpětná vazba a fronta nahlášeného obsahu (jen pro správce)
- `site/zpetna-vazba.html` — formulář zpětné vazby
- `supabase/007-inzeraty.sql` — tabulka inzerátů, ochrany proti zneužití, pohled `verejne_inzeraty`
- `site/auth.js` — Supabase klient, mapování rolí na typ účtu, překlad chybových hlášek
- `site/supabase-config.js` — adresa projektu a veřejný publishable klíč (patří do prohlížeče)
- `site/style.css` — celý designový systém, mobile-first, breakpointy 600/900/1100/1500 px
- `functions/api/ares.js` — ověření firmy v ARES a podpis výsledku
- `supabase/schema.sql` → `002` → `003` → `004` → `005` — migrace v tomto pořadí; spouští se
  ručně v SQL editoru Supabase. Trigger `handle_new_user` je vždy v té nejnovější z nich.

## Do Not Change

- Pořadí flow: role/obor/podobor musí přijít až po recepci, ne na homepage. Do 9. 9. platilo
  `homepage → lobby → recepce → volba → obor → podobor`; od schválení nové atriové homepage
  (viz `chatgpt/homepage-visual`, Current Work) je to `homepage/atrium → recepce → volba → obor
  → podobor` — `lobby.html` už v hlavním flow není mezikrok, zůstává v repu jen jako nepoužívaná
  legacy stránka. Po mergi do `main` tenhle řádek i „Current State" nahoře aktualizovat.
- Zmínky o cenách na webu. Byly odstraněny na výslovné přání a mají zůstat pryč,
  dokud uživatel neřekne jinak.
- Popisky pod názvy voleb na recepci — odstraněny záměrně.
- Klíč `ARES_SECRET` nikdy nezapisovat do repozitáře ani do SQL migrace.
- Kontroly v databázi (povinné IČO u firem, unikátní index, ověření podpisu v triggeru)
  neoslabovat ve prospěch kontrol ve formuláři.

## Last Session

**9. 9. 2026, pozdní večer** — Na `chatgpt/homepage-visual` (draft PR #1): homepage přestavěná
z scrollovací stránky na jednu fullscreen atriovou scénu s funkčním výtahem (viz Current Work
pro detaily). Schválený nový flow: `homepage/atrium → recepce → role → obor → podobor`,
`lobby.html` zůstává v repu nesmazaná jako legacy. Ověřeno živě v Claude in Chrome — tentokrát
včetně mobilu (přes lokální iframe stránku s reálnou šířkou viewportu, protože `resize_window`
v tomhle prostředí nefunguje). Rebasováno na aktuální `main`, pushnuto. Poslední commit na
`chatgpt/homepage-visual`: `5aa5e44`. **Do `main` zatím nemergováno — čeká na finální schválení
uživatelem**, pak jde přímo do produkce na `tradelink.cz`. Popis PR #1 a přepnutí Draft → Ready
čekají na ruční akci uživatele (bez `gh`/tokenu nejde upravit programově).

**Dřívější stav (stejný den, dopoledne/odpoledne):** `tradelink.cz` je živá — jmenné servery
přepnuté na Cloudflare, doména i `www` připojené k Pages, certifikát vydaný, `www`/`pages.dev`
trvale přesměrované (`functions/_middleware.js`), Supabase Site URL i redirect allow-list
ukazují na novou adresu, `info@tradelink.cz` přijímá poštu (přeposílá se na `uvacek.a@gmail.com`).
Odesílání z domény zatím nefunguje, limit dvou zpráv za hodinu pořád platí. Testovací data
(účty, profily, inzeráty, hodnocení) byla na přání uživatele smazána — kdo bude dál stavět
výpis, musí si vytvořit vlastní (viz Known Issues). Poslední commit na `main`: `f8552e0`.

Předchozí session (výměna ARES klíče, profily, inzeráty, hodnocení, nahlašování, zpětná
vazba) skončila commitem `dbc4fc4`.

Na projektu pracují dva lidé pod jedním účtem Claude z různých počítačů — sessions nemají
společnou paměť, kontext drží jen repozitář, git historie a tento soubor.
