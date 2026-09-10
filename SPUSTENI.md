# Kontrolní seznam před spuštěním

Tenhle soubor je jediné místo, kam se dívat, až se TradeLink bude pouštět naostro.
Právní část má vlastní podrobný rozpis v `pravni/PRED-SPUSTENIM.md`; tohle je přehled
**celého projektu** — co je hotové, co rozpracované a co chybí.

Naposledy aktualizováno: **10. 9. 2026**

---

## 1. Blokátory — bez těchhle věcí se spustit nedá

| # | Co | Na kom | Stav |
|---|---|---|---|
| 1.1 | **Údaje o provozovateli** do `podminky.html` a `soukromi.html` — jméno/název, IČO, sídlo, datum účinnosti (8 žlutých míst `class="todo"`) | uživatel | čeká na založení firmy |
| 1.2 | **Právník na podmínky užití** — nejsme právní kancelář, texty jsou psané podle zákona, ale posouzené nejsou | uživatel | nezačato |
| 1.3 | **Záznamy o zpracování** doplnit a uložit (`pravni/zaznamy-o-zpracovani.md`) | uživatel | připravené, chybí údaje |
| 1.4 | **První skutečný obsah** — prázdný web nemá komu co ukázat | oba | nezačato |

## 2. Rozpracované — začaté, nedokončené

| # | Co | Kde | Co zbývá |
|---|---|---|---|
| 2.1 | **Platby přes Stripe** | `supabase/022-platby-stripe.sql`, `functions/api/stripe/checkout.js`, `functions/api/stripe/webhook.js` | migrace **nespuštěná**; chybí tlačítko v `ucet.html`; chybí účet u Stripu (chce IČO) a klíče v Cloudflare: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, `STRIPE_WEBHOOK_SECRET`, `SUPABASE_SERVICE_KEY`; **neotestováno** |
| 2.2 | **Výměna klíče k Resendu** | `private.app_secrets` | klíč se 10. 9. objevil v textu konverzace → vyměnit za nový a starý v Resendu zrušit |
| 2.3 | **Profilové fotky a loga** | — | jen návrh, nezačato: úložiště, ořez v prohlížeči, monogram místo chybějící fotky, napojení na nahlašování a na mazání účtu |
| 2.4 | **Jazykové verze** | `nav-hud.css` | přepínač „CZ" v navigaci je **atrapa** (`aria-hidden`, nikam nevede). Buď odstranit, nebo udělat doopravdy. Kamarád ví. |
| 2.5 | **Rozšíření odvětví na ~30** | `site/obory-data.js` | kamarádova část, zatím 6 odvětví |
| 2.6 | **Fotka do lobby, animace přechodů** | `site/lobby.html` | kamarádova část |

## 3. Hotové a ověřené

**Průchod a obsah** — homepage/atrium → recepce → role → obor → podobor; výpis ověřený
se skutečnými daty ve všech čtyřech rolích; `/nabidky` jako veřejný přehled bez registrace;
prázdné kategorie ukazují připravená místa, ne dojem rozbitého webu.

**Účty** — registrace, přihlášení, obnova hesla, ověření firem přes ARES s podpisem na
serveru, blokace jednorázových schránek, správcovský účet (`info@tradelink.cz`) a fronta
nahlášení na `/sprava`.

**Poptávka bez účtu** — `/poptavka`; text počká skrytý, po potvrzení e-mailu se zveřejní
sám. Ochrany drží databáze (jednorázové schránky, délky, nejvýš tři nepotvrzené na adresu).

**Kdo koho vidí** — odpovídat smí jen přihlášený; telefon a web firmy vydá databáze jen
přihlášenému; zadavatel vidí počet zobrazení svého inzerátu.

**Upozornění** — nová odpověď pošle zadavateli e-mail (ověřeno skutečnou zprávou).
Noční údržba `pg_cron` v 6:00 UTC hlídá konec přístupu (týden předem i v den vypršení)
a maže nepotvrzené poptávky starší měsíce.

**Předplatné** — firma má okno přístupu (zkušební doba nebo zaplaceno + týden odkladu);
mimo něj se její inzeráty a profil nezobrazují. Rozhoduje databáze, ne formulář.
**Datum se zatím vyplňuje ručně** — automaticky ho bude nastavovat Stripe (viz 2.1).

**Infrastruktura** — doména na Cloudflare, pošta `info@tradelink.cz` ve schránce Seznam
Email Profi, odesílání přes Resend z vlastní domény, české šablony e-mailů v Supabase.

**Viditelnost** — Google Search Console ověřená (mapa webu odeslaná, čtyři adresy ručně
poslané k zaindexování), Seznam Webmaster ověřený meta tagem; serverem vykreslené
`/nabidky`, `/nabidka/<id>` a `/firma/<id>` kvůli tomu, že Seznam nespouští JavaScript;
vlastní stránka 404.

## 4. Až se bude spouštět — projít v tomhle pořadí

1. Doplnit údaje o provozovateli (1.1) a nechat texty projít právníkem (1.2).
2. Smazat všechna testovací data z databáze a ověřit, že výpisy jsou prázdné.
3. Rozhodnout o ceně a **sjednotit ji s FAQ i s databází** (dnes: dva měsíce zdarma,
   pak 199 Kč, konečná částka, provozovatel není plátce DPH).
4. Dokončit platby (2.1), nebo vědomě spustit s ručním nastavováním `predplatne_do`.
5. Vyměnit klíč k Resendu (2.2).
6. Rozhodnout o atrapě přepínače jazyků (2.4) — falešný ovládací prvek na webu,
   který slibuje poctivost, je drobná lež.
7. Zkontrolovat limity: Resend 100 zpráv denně a 3 000 měsíčně, Supabase 30 e-mailů
   za hodinu. Při náporu registrací dojdou první.
8. Projít `pravni/PRED-SPUSTENIM.md` — hlavně část „Placené účty přinesou další
   povinnosti".

## 5. Vědomé slabiny, se kterými se spouští

- **ARES potvrdí, že firma existuje — ne že IČO zadal její jednatel.** Napsané
  v podmínkách i ve FAQ, ale je to skutečná díra.
- **Tři spolčené účty umí shodit konkurenci** automatickým skrytím po třech hlášeních.
- **Živnostník s rolí „Hledám zakázky" dostane nabídku zadat inzerát práce**, ačkoli
  podle návrhu nemá zadávat nic.
- **V historii gitu zůstává starý (neplatný) klíč a soukromá adresa provozovatele.**
  Vyčištění by rozbilo existující klony.
- **Seznam jednorázových domén zastarává** — doplňuje se ručně do `private.blokovane_domeny`.
