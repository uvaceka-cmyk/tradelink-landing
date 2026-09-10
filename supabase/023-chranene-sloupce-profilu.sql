-- =========================================================
-- TradeLink — chráněné sloupce profilu
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 022-platby-stripe.sql.
--
-- Proč to je — a je to vážné:
--
-- Pravidlo „profil lze upravit jen svůj" povoluje úpravu vlastního
-- řádku, ale NEŘÍKÁ NIC O TOM, KTERÉ SLOUPCE. Přihlášený uživatel si
-- tak mohl jedním požadavkem mimo formulář:
--   * nastavit spravce = true a dostat se do fronty nahlášení,
--   * nastavit predplatne_do na rok 2099 a mít inzeráty zdarma,
--   * nastavit ares_overeno_at a tvářit se jako ověřená firma,
--   * změnit ico nebo account_type.
--
-- Formulář to neumožňoval, ale formuláři se nevěří — celý projekt
-- stojí na tom, že kontroly drží databáze.
--
-- Řešení: spouštěč vrátí chráněným sloupcům jejich původní hodnotu.
-- Servisní klíč (webhook plateb, migrace) omezený není — ten se do
-- prohlížeče nikdy nedostane.
-- =========================================================

create or replace function public.profil_chranene_sloupce()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text := coalesce(current_setting('request.jwt.claims', true)::jsonb ->> 'role', '');
begin
  -- Zápis servisním klíčem nebo přímo z databáze necháváme být.
  if v_role = 'service_role' or v_role = '' then
    return new;
  end if;

  new.spravce         := old.spravce;
  new.email           := old.email;
  new.account_type    := old.account_type;
  new.ico             := old.ico;
  new.ares_nazev      := old.ares_nazev;
  new.ares_sidlo      := old.ares_sidlo;
  new.ares_overeno_at := old.ares_overeno_at;
  new.company_name    := old.company_name;
  new.trial_ends_at   := old.trial_ends_at;
  new.predplatne_do   := old.predplatne_do;
  new.predplatne_stav := old.predplatne_stav;
  new.predplatne_od   := old.predplatne_od;
  new.stripe_zakaznik := old.stripe_zakaznik;

  return new;
end;
$$;

drop trigger if exists profil_chranene_sloupce_trg on public.profiles;
create trigger profil_chranene_sloupce_trg
  before update on public.profiles
  for each row execute function public.profil_chranene_sloupce();

comment on function public.profil_chranene_sloupce() is
  'Vrací chráněným sloupcům původní hodnotu. Uživatel si smí měnit jen to, co je ve formuláři profilu: jméno, popis, obor, podobor, lokalitu, web, telefon, zveřejnění a upozorneni.';
