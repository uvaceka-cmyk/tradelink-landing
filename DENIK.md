# Deník práce

Zápis po dnech, aby šlo kdykoli udělat shrnutí bez dohadování. **Nový den se
připisuje nahoru**, starší zůstávají beze změny. Čísla o čase a tokenech se dají
spočítat ze záznamů sezení (`~/.claude/projects/…/*.jsonl`), postup je na konci.

Podrobnosti jinde: `SPUSTENI.md` (co zbývá před spuštěním), `KONTROLA.md`
(soupis nálezů z průchodu webem), `CLAUDE_HANDOFF.md` (předávka mezi sezeními).

---

## Středa 10. 9. 2026

**Čas:** 00:36 → 00:05 následujícího dne, zhruba **8 hodin** aktivní práce.
**Objem:** 125 zpráv od uživatele, 1 694 odpovědí Claude (napříč šesti sezeními,
z toho 110 a 1 257 v hlavním sezení). Model Opus 5.
**Tokeny:** 1 385 382 výstupních, 3 883 874 zápis do mezipaměti,
626 491 780 čtení z mezipaměti, 3 380 vstupních mimo mezipaměť —
celkem 631 764 416. Skutečně nová práce z toho tvoří 0,2 %.
Přes API by to stálo zhruba 375–390 dolarů; s předplatným Max se neúčtuje.

**Co přibylo**
- Časté otázky (`/faq`) — poprvé jsou na webu ceny: dva měsíce zdarma, pak 199 Kč
  měsíčně, konečná částka (neplátce DPH).
- Poptávka bez zakládání účtu (`/poptavka`) — účet vzniká potvrzením e-mailu.
- Veřejný přehled nabídek (`/nabidky`) bez registrace, s přepínačem typu.
- E-mail zadavateli při nové odpovědi (ověřeno skutečnou zprávou).
- Okno přístupu firem + noční údržba přes `pg_cron` v 6:00.
- Napojení na platby Stripe (napsané, čeká na účet u Stripu).
- Čísla na homepage podle skutečných dat místo vymyšlených 124 / 38 / 21.
- Vlastní stránka 404, prázdné karty ve výpisu, počítadlo zobrazení.
- Vlastní schránka `info@tradelink.cz` v Seznam Email Profi, české šablony e-mailů.
- Google Search Console i Seznam Webmaster ověřené.
- Viditelnost telefonu si volí každý sám; telefon a web může vyplnit i člověk.
- Odstraněna atrapa přepínače jazyků, tlačítko „Začít" → „Registrace".

**Nalezené a opravené chyby**
- Vážné: přihlášený si mohl sám nastavit práva správce i předplatné (RLS hlídalo
  řádek, ne sloupce) — migrace `023`.
- Vážné: `revoke … from anon` nestačí, Postgres dává právo roli `public`; veřejným
  klíčem šlo zavolat funkci zapisující platby — migrace `024`.
- Vážné: `supabase.rpc()` nemá `.catch()`; volání shodilo `paintNav` a přihlášenému
  se nevykreslila žádná stránka.
- Vážné: telefon člověka viděl každý přihlášený (regrese z migrace `019`).
- Počítadlo zobrazení se nikdy nezvýšilo (dotaz se odesílá až při čekání).
- Profil člověka nabízel hodnocení, které databáze odmítá.
- `robots.txt` zakazoval vyhledávačům serverem vykreslené profily firem.
- Migrace `021` omylem shodila z profilů průměr hodnocení.

**Čím se to zjistilo:** průchod webem jako skutečný uživatel — přihlásit se,
odpovědět na inzerát, zkontrolovat schránku. Tři z těch chyb statická kontrola
kódu minula.

**Otevřené na konci dne:** vnitřní odkazy jdou přes přesměrování; profil člověka
žije na `/firma/<id>`; `/lobby` je indexovatelná; otázka kolem `noindex` na
`/obory`; ukázková data zatím na webu (na přání ponechána).

---

## Úterý 9. 9. 2026

**Čas:** 16:32 → 23:50, **6 h 43 min** aktivní práce.

Z landing page vzniklo funkční místo: průchod homepage → recepce → role → obor →
podobor, účty přes Supabase, ověřování firem v registru ARES s podpisem na serveru,
profily, inzeráty a poptávky, odpovědi, hodnocení firem, nahlašování obsahu
s frontou pro správce, zpětná vazba, právní texty (podmínky, GDPR, DSA, výmaz
účtu), viditelnost ve vyhledávačích (serverem vykreslené `/nabidka/<id>`, mapa webu,
JobPosting), rotace uniklého klíče `ARES_SECRET`, doména `tradelink.cz` na
Cloudflare a odesílání pošty z vlastní domény přes Resend. Homepage přestavěná na
atrium s funkčním výtahem.

---

## Jak spočítat čísla pro další den

```bash
cd ~/.claude/projects/C--Users-andre
# tokeny a počty zpráv: projít *.jsonl, filtrovat podle timestamp,
# sčítat message.usage (input_tokens, output_tokens,
# cache_creation_input_tokens, cache_read_input_tokens)
# aktivní čas: seřadit timestampy, sčítat mezery kratší než 30 minut
```
