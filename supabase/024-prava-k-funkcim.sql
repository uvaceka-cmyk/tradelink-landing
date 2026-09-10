-- =========================================================
-- TradeLink — odebrání práv k funkcím, které nikdo volat nemá
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 023-chranene-sloupce-profilu.sql.
--
-- Proč to je — a je to vážné:
--
-- V předchozích migracích stálo `revoke execute ... from anon,
-- authenticated`. To NESTAČÍ. Postgres dává právo spustit funkci
-- automaticky roli `public`, kterou obě role dědí — odebrání jim
-- samotným tedy nic neudělalo.
--
-- Prakticky to znamenalo, že kdokoli s veřejným klíčem mohl zavolat:
--   * zapsat_platbu()  → nastavit si předplatné do roku 2099 zdarma,
--   * denni_udrzba()   → rozeslat upozornění a spustit úklid,
--   * uklid_poptavek() → smazat čekající poptávky.
--
-- Správně se odebírá i roli `public`.
--
-- Ověření (obojí musí být false):
--   select p.proname,
--          has_function_privilege('anon', p.oid, 'execute') as smi_anon
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public' and p.proname = 'zapsat_platbu';
-- =========================================================

-- Volá jen webhook plateb servisním klíčem.
revoke execute on function public.zapsat_platbu(text, text, timestamptz, text) from public, anon, authenticated;

-- Volá jen plánovač (pg_cron) pod účtem postgres.
revoke execute on function public.denni_udrzba() from public, anon, authenticated;
revoke execute on function public.uklid_poptavek() from public, anon, authenticated;

-- Spouštěče. Volat je napřímo nedává smysl a nikomu to nepřísluší.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.profil_chranene_sloupce() from public, anon, authenticated;
revoke execute on function public.upozornit_na_odpoved() from public, anon, authenticated;
revoke execute on function public.poptavka_ceka_kontrola() from public, anon, authenticated;
revoke execute on function public.inzerat_kontrola() from public, anon, authenticated;
revoke execute on function public.hodnoceni_kontrola() from public, anon, authenticated;

-- Kontakt na firmu a převzetí poptávek patří přihlášeným.
revoke execute on function public.kontakt_firmy(uuid) from public, anon;
grant  execute on function public.kontakt_firmy(uuid) to authenticated;

revoke execute on function public.prevzit_poptavky() from public, anon;
grant  execute on function public.prevzit_poptavky() to authenticated;

-- Tyhle zůstávají otevřené schválně:
--   zapocitat_zobrazeni() — počítadlo musí umět zvýšit i nepřihlášený,
--   jsem_spravce()        — nepřihlášenému vrátí false,
--   ico_je_obsazene()     — potřebuje ho registrační formulář.
