-- =========================================================
-- TradeLink — předem určení správci
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 011-nahlaseni.sql.
--
-- Práva správce se dávají profilu, a ten vzniká až registrací.
-- Aby se nemusel nikdo hlídat, kdy se zakladatelé zaregistrují,
-- vede se tu seznam adres, které správcem budou hned od začátku.
--
-- Přidání dalšího:
--   insert into private.budouci_spravci (email) values ('dalsi@email.cz');
--
-- Odebrání práv už existujícímu účtu:
--   update public.profiles set spravce = false where email = '...';
-- =========================================================

create table if not exists private.budouci_spravci (
  email      text primary key,
  pridano_at timestamptz not null default now()
);

alter table private.budouci_spravci enable row level security;
revoke all on table private.budouci_spravci from anon, authenticated, public;

insert into private.budouci_spravci (email) values
  ('uvacek.a@gmail.com')
on conflict (email) do nothing;

-- Kdyby se účet zaregistroval dřív, než tenhle soubor doběhl.
update public.profiles p
   set spravce = true
  from private.budouci_spravci b
 where lower(p.email) = lower(b.email)
   and p.spravce = false;

-- ---------------------------------------------------------
-- Zakládání profilu po registraci — doplněno o práva správce.
-- Zbytek kontrol zůstává beze změny (jednorázové schránky,
-- povinné a ověřené IČO u firem).
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  acc       text := coalesce(new.raw_user_meta_data ->> 'account_type', 'osoba');
  v_ico     text := nullif(trim(new.raw_user_meta_data ->> 'ico'), '');
  v_nazev   text := nullif(trim(new.raw_user_meta_data ->> 'ares_nazev'), '');
  v_token   text := new.raw_user_meta_data ->> 'ares_token';
  v_domena  text := lower(split_part(coalesce(new.email, ''), '@', 2));
  v_overeno boolean := false;
  v_spravce boolean := false;
begin
  if exists (select 1 from private.blokovane_domeny where domena = v_domena) then
    raise exception 'Jednorázové e-mailové schránky nepřijímáme. Použijte prosím svůj běžný e-mail.'
      using errcode = 'check_violation';
  end if;

  if acc = 'firma' then
    if v_ico is null or v_nazev is null then
      raise exception 'Firemní účet vyžaduje ověřené IČO.'
        using errcode = 'check_violation';
    end if;

    v_overeno := private.overit_ares_token(v_token, v_ico, v_nazev);

    if not v_overeno then
      raise exception 'Ověření firmy v registru ARES neproběhlo nebo mu vypršela platnost.'
        using errcode = 'check_violation';
    end if;
  end if;

  select exists (
    select 1 from private.budouci_spravci b where lower(b.email) = lower(new.email)
  ) into v_spravce;

  insert into public.profiles (
    id, email, account_type, entry_role, full_name,
    company_name, ico, ares_nazev, ares_sidlo, ares_overeno_at, trial_ends_at, spravce
  )
  values (
    new.id,
    new.email,
    acc,
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'full_name',
    case when v_overeno then v_nazev end,
    v_ico,
    case when v_overeno then v_nazev end,
    case when v_overeno then new.raw_user_meta_data ->> 'ares_sidlo' end,
    case when v_overeno then now() end,
    case when acc = 'firma' then now() + interval '3 months' end,
    v_spravce
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
