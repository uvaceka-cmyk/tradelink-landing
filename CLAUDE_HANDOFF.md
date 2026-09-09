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

**Živě:** https://tradelink-landing.pages.dev
**Repo:** https://github.com/uvaceka-cmyk/tradelink-landing (veřejné, větev `main`)
**Nasazení:** Cloudflare Pages, automaticky z `main`, build output directory = `site`, bez build příkazu
**Databáze:** Supabase projekt `tradelink`, ref `hgjajfkaotflkmyrryak`, region eu-central-1 (Frankfurt)

Web je celý česky. Vlastní doména zatím není.

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

None — current work is in a stable state.

## Decisions Made

- **Homepage nesmí začínat výběrem oboru ani typu uživatele.** Flow je záměrně
  homepage → info → lobby → recepce → kdo jsem → obor → podobor → nabídky.
- **Ceny jsou z webu úmyslně odstraněné** (uživatel to výslovně chtěl). V databázi zůstal
  sloupec `trial_ends_at`, který se firmám plní — na webu se nikde nezobrazuje.
  Obchodní model, na kterém se domluvili: lidé zdarma navždy, firmy první 3 měsíce zdarma,
  potom nízký měsíční poplatek. Konkrétní částka není stanovená.
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

- **V databázi jsou testovací data — před spuštěním smazat.** Dva účty, heslo u obou
  `TestHeslo12345`:
  - `uvacek.a+tlfirma@gmail.com` — firma (Alza.cz a.s.), **správce**, zveřejněný profil,
    tři inzeráty, jedno hodnocení od druhého účtu
  - `uvacek.a+tlosoba@gmail.com` — osoba, odpověděla na inzerát a firmu ohodnotila

  Nechal jsem je schválně, aby měl kamarád na čem stavět výpis. Úklid:
  `delete from auth.users where email like 'uvacek.a+tl%';` (profily, inzeráty,
  odpovědi i hodnocení odejdou s nimi). Zbývají ještě tři vyřízená hlášení a jedna
  zkušební zpráva ve zpětné vazbě — ty se mažou zvlášť.
- **Registrace naráží na limit dvou e-mailů za hodinu**, takže druhý testovací účet
  vznikl přímo v databázi vložením do `auth.users` **a `auth.identities`** — bez toho
  druhého se účet nepřihlásí („Database error querying schema"). Hodí se to vědět,
  až bude potřeba další testovací účet, dokud není vlastní odesílatel e-mailů.
- **Uživatel ještě nemá vlastní účet.** `uvacek.a@gmail.com` je v `private.budouci_spravci`,
  takže se správcem stane sám, jakmile se zaregistruje. **Ten mechanismus zatím nikdo
  nevyzkoušel** — registraci blokoval limit e-mailů. Po registraci ověřit, že `spravce`
  je `true`. Zatím je správcem jen testovací účet `uvacek.a+tlfirma@gmail.com`.
- **Automatické skrytí při třech hlášeních jde zneužít** — tři spolčené účty shodí
  konkurenci, než se k tomu správce dostane. Zatím to beru jako přijatelnou cenu za to,
  že podvod neviselo ve výpisu; při větším provozu zvážit vyšší mez nebo váhu podle
  stáří účtu.
- **Rozhraní Supabase i Cloudflare padá pod překladačem Chromu.** Supabase to hlásí přímo
  chybovou stránkou. Uživatel má překlad zapnutý — než se vypne, dělat zásahy raději přes
  SQL editor (ten přežívá) nebo přes API.
- **Právní texty mají nevyplněná místa** (nově osm, přibylo kontaktní místo) (označené `class="todo"`):
  provozovatel, IČO, sídlo, kontaktní e-mail, datum účinnosti. Uživatel je doplní, až
  založí firmu. Bez nich nelze web spustit naostro. Texty by měl před spuštěním vidět právník.
- **Redirect URL allow-list v Supabase není nastavený.** Obchází to směrovač v `app.js`,
  který odkazy z e-mailů přesměruje z úvodní stránky, kam patří. Správně tam patří
  `https://tradelink-landing.pages.dev/**`.
- **Doména `tradelink.cz` je koupená u Wedosu a přidaná do Cloudflare** (zóna
  `3c2c776363aa922f8773259560ddc32e`, stav `pending`). Čeká na to, až uživatel ve Wedosu
  přepne jmenné servery na `ken.ns.cloudflare.com` a `paislee.ns.cloudflare.com`.
  Do té doby web běží jen na pages.dev. Po aktivaci: připojit doménu k Pages projektu,
  přesměrovat pages.dev na tradelink.cz, změnit Site URL v Supabase.
- **Supabase zdarma pošle jen 2 e-maily za hodinu**, což omezuje i testování registrací.
  Zruší se to vlastním odesílatelem (custom SMTP), ten ale bez domény funguje jen na půl.
  Uživatel se rozhodl pořídit doménu a udělat to rovnou pořádně — **koupí ji po výplatě**.
  Do té doby limit necháváme být; mezikrok přes Brevo by se stejně předělával.
  Nouzově jde na dobu vývoje vypnout potvrzování e-mailu (Authentication → Providers →
  Email → Confirm email) — **před spuštěním se musí zase zapnout.**
- **ARES neověří oprávnění.** Potvrdí, že firma existuje — ne že IČO zadal její jednatel.
  Řešení (ověřovací dopis, platba z firemního účtu, datová schránka, bankovní identita)
  zatím nikdo nedělá; je to popsané v podmínkách užití.
- **Starý uniklý klíč zůstává v historii gitu** (commit `5e0534f`). Je neplatný, takže
  nepředstavuje riziko; vyčištění historie by rozbilo existující klony.
- **Seznam jednorázových domén zastarává.** Nové schránky vznikají průběžně; doplní se
  vložením řádku do `private.blokovane_domeny` (viz `supabase/005-jednorazove-schranky.sql`).
- **Lobby nemá fotku** — je poskládané z CSS. Čeká na obrázek od kamaráda.
- **Odvětví je zatím 6**, uživatel chce ~30 (seznam měl ze starší verze webu).
- **Animace nejsou implementované.** Struktura je připravená: sekce nesou `data-scene`,
  vrstvy `data-depth`, `app.js` nastavuje `--scene-progress`. Čeká na kamaráda.

## Next Steps

1. **[Kamarád]** Výpis po výběru podoboru nad pohledem `verejne_inzeraty` — dnes tam končí
   placeholder „zatím připravujeme". V databázi jsou testovací inzeráty, na kterých to jde
   rovnou vidět. Filtr: `typ` + `obor` + `podobor` (na to je index).
2. **[Uživatel]** Nastavit si účet jako správce, jinak je fronta nahlášení nepřístupná.
3. **[Claude]** Doladit podle zpětné vazby, až začnou chodit první uživatelé.
5. Doplnit údaje o provozovateli do `podminky.html` a `soukromi.html` (až uživatel založí firmu).
6. **Doména a odesílání e-mailů** — až ji uživatel koupí (`tradelink.cz` byla 9. 9. volná,
   `tradelink.com` obsazená). Postup: doména → účet u odesílatele (Resend / Brevo / Mailjet)
   → ověřit doménu záznamy SPF a DKIM v DNS → v Supabase přepnout na vlastní SMTP a zvednout
   limit v Auth → Rate Limits (i s vlastním SMTP je výchozí 30/hodinu). Pak teprve padne
   limit 2 zprávy za hodinu. Zároveň nastavit novou doménu jako Site URL a přidat ji do
   redirect allow-listu, a napojit ji na Cloudflare Pages.

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

- Pořadí flow (homepage → lobby → recepce → volba → obor → podobor). Nedávat obory na homepage.
- Zmínky o cenách na webu. Byly odstraněny na výslovné přání a mají zůstat pryč,
  dokud uživatel neřekne jinak.
- Popisky pod názvy voleb na recepci — odstraněny záměrně.
- Klíč `ARES_SECRET` nikdy nezapisovat do repozitáře ani do SQL migrace.
- Kontroly v databázi (povinné IČO u firem, unikátní index, ověření podpisu v triggeru)
  neoslabovat ve prospěch kontrol ve formuláři.

## Last Session

**9. 9. 2026** — Profily, inzeráty, odpovědi, hodnocení firem, nahlašování s frontou
pro správce, zpětná vazba, viditelnost ve vyhledávačích a právní povinnosti platformy.

Ověřeno proti živé databázi: zrušení účtu smaže i hodnocení a odpovědi a přihlásit se
už nelze; skrytí obsahu uloží důvod, který autor vidí, a vrácení zpět ho smaže.
Dříve ověřeno ze dvou účtů: cizí data nejdou číst, měnit ani mazat.

Doména tradelink.cz je zaregistrovaná a přidaná do Cloudflare, ale **v registru pořád
má nameservery Wedosu** — čeká na uživatele. Blokuje to připojení domény, e-mail
info@tradelink.cz, účty u Seznamu a Googlu i vlastní odesílání e-mailů.

Poslední commit: `4985f45`

Na projektu pracují dva lidé pod jedním účtem Claude z různých počítačů — sessions nemají
společnou paměť, kontext drží jen repozitář, git historie a tento soubor.
