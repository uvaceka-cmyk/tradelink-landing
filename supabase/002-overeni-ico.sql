-- =========================================================
-- TradeLink — ověřování firem podle IČO
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na schema.sql, spouští se po něm.
--
-- Cíl: na TradeLinku nemá vzniknout firemní účet bez skutečné
-- firmy. IČO je proto pro firemní účty povinné, ukládá se k němu
-- název ze systému ARES a jedno IČO smí mít jen jeden účet.
-- =========================================================

alter table public.profiles
  add column if not exists ares_nazev     text,
  add column if not exists ares_sidlo     text,
  add column if not exists ares_overeno_at timestamptz;

comment on column public.profiles.ares_nazev is
  'Obchodní jméno tak, jak je vedené v registru ARES při registraci.';
comment on column public.profiles.ares_overeno_at is
  'Kdy byla firma naposledy dohledána v ARES.';

-- Jedno IČO = jeden firemní účet.
create unique index if not exists profiles_ico_unique
  on public.profiles (ico)
  where ico is not null;

-- ---------------------------------------------------------
-- Firemní účet bez IČO nevznikne. Kontrolu držíme v databázi,
-- ne jen ve formuláři — na formulář se spolehnout nedá.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acc  text := coalesce(new.raw_user_meta_data ->> 'account_type', 'osoba');
  v_ico text := nullif(trim(new.raw_user_meta_data ->> 'ico'), '');
begin
  if acc = 'firma' and v_ico is null then
    raise exception 'Firemní účet vyžaduje IČO.'
      using errcode = 'check_violation';
  end if;

  insert into public.profiles (
    id, email, account_type, entry_role, full_name,
    company_name, ico, ares_nazev, ares_sidlo, ares_overeno_at, trial_ends_at
  )
  values (
    new.id,
    new.email,
    acc,
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    v_ico,
    new.raw_user_meta_data ->> 'ares_nazev',
    new.raw_user_meta_data ->> 'ares_sidlo',
    case when v_ico is not null then now() end,
    case when acc = 'firma' then now() + interval '3 months' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------
-- Zjištění, jestli je IČO už zabrané.
-- Vrací jen ano/ne — kdo za IČO stojí, nikomu neprozradí.
-- ---------------------------------------------------------
create or replace function public.ico_je_obsazene(p_ico text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (select 1 from public.profiles where ico = p_ico);
$$;

revoke all on function public.ico_je_obsazene(text) from public;
grant execute on function public.ico_je_obsazene(text) to anon, authenticated;
