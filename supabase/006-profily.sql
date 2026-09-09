-- =========================================================
-- TradeLink — obsah profilů
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 005-jednorazove-schranky.sql.
--
-- Profil si vyplňuje sám uživatel. Zveřejní se až tehdy, když si to
-- výslovně přeje (zverejnen = true) — do té doby ho nikdo jiný nevidí.
--
-- Ostatním se profil ukazuje přes pohled verejne_profily, který
-- záměrně neobsahuje e-mail ani jméno kontaktní osoby u firem.
-- =========================================================

alter table public.profiles
  add column if not exists popis     text,
  add column if not exists obor      text,
  add column if not exists podobor   text,
  add column if not exists lokalita  text,
  add column if not exists web       text,
  add column if not exists telefon   text,
  add column if not exists zverejnen boolean not null default false;

comment on column public.profiles.zverejnen is
  'Profil je vidět ostatním jen když true. Výchozí stav je skrytý.';

-- Rozumné meze, aby profil nešlo použít jako úložiště textu.
alter table public.profiles drop constraint if exists profiles_delky;
alter table public.profiles add constraint profiles_delky check (
  (popis    is null or char_length(popis)    <= 2000) and
  (obor     is null or char_length(obor)     <= 60)   and
  (podobor  is null or char_length(podobor)  <= 80)   and
  (lokalita is null or char_length(lokalita) <= 120)  and
  (web      is null or char_length(web)      <= 200)  and
  (telefon  is null or char_length(telefon)  <= 30)
);

-- Zveřejnit jde jen profil, který má co ukázat.
alter table public.profiles drop constraint if exists profiles_zverejneni;
alter table public.profiles add constraint profiles_zverejneni check (
  zverejnen = false
  or (popis is not null and char_length(trim(popis)) >= 20 and obor is not null)
);

-- ---------------------------------------------------------
-- Co z profilu vidí ostatní.
--
-- Pohled běží s právy vlastníka, takže obchází RLS na tabulce —
-- proto sám filtruje na zveřejněné profily a vybírá jen sloupce,
-- které mají být venku. E-mail mezi nimi není.
-- ---------------------------------------------------------
drop view if exists public.verejne_profily;
create view public.verejne_profily as
select
  p.id,
  p.account_type,
  coalesce(nullif(trim(p.company_name), ''), p.full_name)      as jmeno,
  p.popis,
  p.obor,
  p.podobor,
  p.lokalita,
  p.web,
  case when p.account_type = 'firma' then p.telefon end        as telefon,
  case when p.account_type = 'firma' then p.ico end            as ico,
  case when p.account_type = 'firma' then p.ares_sidlo end     as sidlo,
  (p.ares_overeno_at is not null)                              as overena_firma,
  p.created_at
from public.profiles p
where p.zverejnen = true;

grant select on public.verejne_profily to anon, authenticated;

comment on view public.verejne_profily is
  'Veřejná podoba profilu. Bez e-mailu; telefon a sídlo jen u firem.';
