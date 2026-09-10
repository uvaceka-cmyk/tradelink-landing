-- =========================================================
-- TradeLink — jen bezpečné odkazy v profilu
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 015-soukromi-spravcu.sql.
--
-- Proč to je:
--
-- Pole `web` v profilu se na stránce firmy vypisuje jako odkaz.
-- Kontrolovala se jen délka, takže tam šlo uložit `javascript:…`
-- a komukoli, kdo na odkaz klikne, spustit v prohlížeči cizí kód —
-- včetně vytažení přihlášení ze session. Formulář to nezachytil
-- (`type="url"` takovou adresu bere) a přes veřejné API se dá
-- formulář obejít úplně.
--
-- Kontrola patří do databáze, ne do formuláře: tudy projde všechno.
-- Adresa musí začínat http:// nebo https://, nic jiného.
-- =========================================================

alter table public.profiles drop constraint if exists profiles_web_schema;
alter table public.profiles add constraint profiles_web_schema check (
  web is null or web ~* '^https?://[^\s]+$'
);

comment on constraint profiles_web_schema on public.profiles is
  'Odkaz na web smí být jen http(s). Jiné schéma (javascript:, data:) by šlo zneužít k spuštění cizího kódu.';
