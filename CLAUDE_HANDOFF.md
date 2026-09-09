# Project Handoff

## Current State

TradeLink je statický web nasazený na Cloudflare Pages, napojený na Supabase (účty + databáze)
a na registr ARES (ověřování firem). Průchod homepage → lobby → recepce → obor → podobor je
funkční, účty a ověřování firem fungují a jsou otestované. Vlastní obsah platformy
(profily, inzeráty, poptávky) zatím neexistuje — po výběru podoboru se zobrazí „zatím připravujeme".

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
  v , kontrola běží v triggeru, formulář ji jen předběhne

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
- **Dělba práce:** obory (rozšíření na ~30), fotky a animace dělá kamarád uživatele.
  Doménu zařizuje uživatel později.
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

- **`ARES_SECRET` je v Cloudflare uložený jako typ „Text", ne „Tajný kód"** — hodnota je
  čitelná každému, kdo se dostane do dashboardu. Přepnout na Secret.
- **Testovací účet** `Uvacek.a+tltest@gmail.com` vznikl při testování registrace.
  Smazat v Supabase → Authentication → Users.
- **Právní texty mají 6 nevyplněných míst** v každém dokumentu (označené `class="todo"`):
  provozovatel, IČO, sídlo, kontaktní e-mail, datum účinnosti. Uživatel je doplní, až
  založí firmu. Bez nich nelze web spustit naostro. Texty by měl před spuštěním vidět právník.
- **Redirect URL allow-list v Supabase není nastavený.** Obchází to směrovač v `app.js`,
  který odkazy z e-mailů přesměruje z úvodní stránky, kam patří. Správně tam patří
  `https://tradelink-landing.pages.dev/**`.
- **Google Translate rozbíjí dashboardy Supabase i Cloudflare** — přepisuje DOM, aplikace
  padají a neukazují data (kvůli tomu se jednou nezobrazila existující proměnná prostředí).
  Před prací v dashboardech vypnout překlad pro daný web.
- **Supabase zdarma pošle jen 2 e-maily za hodinu.** Na ostrý provoz je potřeba vlastní
  doména a odesílací služba.
- **ARES neověří oprávnění.** Potvrdí, že firma existuje — ne že IČO zadal její jednatel.
  Řešení (ověřovací dopis, platba z firemního účtu, datová schránka, bankovní identita)
  zatím nikdo nedělá; je to popsané v podmínkách užití.
- **Starý uniklý klíč zůstává v historii gitu** (commit `5e0534f`). Je neplatný, takže
  nepředstavuje riziko; vyčištění historie by rozbilo existující klony.
- **Seznam jednorázových domén zastarává.** Nové schránky vznikají průběžně; doplňují se
  řádkem .
- **Lobby nemá fotku** — je poskládané z CSS. Čeká na obrázek od kamaráda.
- **Odvětví je zatím 6**, uživatel chce ~30 (seznam měl ze starší verze webu).
- **Animace nejsou implementované.** Struktura je připravená: sekce nesou `data-scene`,
  vrstvy `data-depth`, `app.js` nastavuje `--scene-progress`. Čeká na kamaráda.

## Next Steps

1. Přepnout `ARES_SECRET` v Cloudflare na typ „Tajný kód" a smazat testovací účet.
2. Doplnit údaje o provozovateli do `podminky.html` a `soukromi.html` (až uživatel založí firmu).
3. Postavit vlastní obsah platformy — profily firem a lidí, inzeráty a poptávky, výpis
   po výběru podoboru. Do té doby je web jen brožura.
4. K inzerátům přidat ochranu proti falešnému obsahu: inzerát smí zadat jen ověřená firma,
   limit na účet, nahlášení, fronta na kontrolu.
5. Nastavit redirect URL v Supabase a doménu, až bude k dispozici (kvůli doručitelnosti e-mailů).

## Important Files

- `site/index.html` — homepage, pořadí sekcí a celý vstupní text
- `site/recepce.html` — 4 volby typu návštěvníka, vstup do celého flow
- `site/obory.html` + `site/app.js` — výběr odvětví a podoboru; **data odvětví jsou
  v `app.js` v konstantě `INDUSTRIES`**, role v `ROLES`
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

**9. 9. 2026** — Výměna kompromitovaného klíče  (byl commitnutý v ),
zesílení ověřování podpisu, odstranění klíče ze zdrojáků, otestování celého řetězce.
Založen tento handoff. Přidáno odmítání jednorázových e-mailových schránek při registraci.

Poslední commit: 
Na projektu pracují dva lidé pod jedním účtem Claude z různých počítačů — sessions nemají
společnou paměť, kontext drží jen repozitář, git historie a tento soubor.
