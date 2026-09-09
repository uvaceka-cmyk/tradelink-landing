-- =========================================================
-- TradeLink — odmítnutí jednorázových e-mailových schránek
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 004-zesileni-podpisu.sql.
--
-- Osobní účty ověřujeme potvrzením e-mailu. To ale samo o sobě
-- nestačí — přes jednorázové schránky (mailinator a spol.) jde
-- vyrobit falešné účty ve velkém, protože potvrzovací odkaz je
-- veřejně přístupný komukoli.
--
-- Seznam je v tabulce, ne v kódu, aby šel doplňovat bez nasazování:
--   insert into private.blokovane_domeny (domena) values ('neco.cz');
-- =========================================================

create table if not exists private.blokovane_domeny (
  domena     text primary key,
  pridano_at timestamptz not null default now()
);

alter table private.blokovane_domeny enable row level security;
revoke all on table private.blokovane_domeny from anon, authenticated, public;

insert into private.blokovane_domeny (domena) values
  ('mailinator.com'), ('yopmail.com'), ('yopmail.fr'), ('yopmail.net'),
  ('guerrillamail.com'), ('guerrillamail.net'), ('guerrillamail.org'), ('sharklasers.com'),
  ('grr.la'), ('spam4.me'), ('pokemail.net'),
  ('10minutemail.com'), ('10minutemail.net'), ('minuteinbox.com'),
  ('tempmail.com'), ('temp-mail.org'), ('tempmailo.com'), ('tempmail.plus'),
  ('tempail.com'), ('tempr.email'), ('tmpmail.org'), ('tmails.net'),
  ('throwawaymail.com'), ('trashmail.com'), ('trashmail.de'), ('mytrashmail.com'),
  ('wegwerfemail.de'), ('getnada.com'), ('nada.email'), ('maildrop.cc'),
  ('dispostable.com'), ('fakeinbox.com'), ('mailnesia.com'), ('tempinbox.com'),
  ('emailondeck.com'), ('spamgourmet.com'), ('mytemp.email'), ('moakt.com'),
  ('discard.email'), ('mailcatch.com'), ('inboxbear.com'), ('mail-temporaire.fr'),
  ('jetable.org'), ('spambox.us'), ('mailexpire.com'), ('incognitomail.com'),
  ('anonbox.net'), ('burnermail.io'), ('harakirimail.com'), ('mvrht.net'),
  ('luxusmail.org'), ('mail7.io'), ('mohmal.com'), ('emailfake.com'),
  ('1secmail.com'), ('1secmail.org'), ('1secmail.net'), ('dropmail.me'),
  ('cs.email'), ('byom.de'), ('esiix.com'), ('zetmail.com'),
  ('vomoto.com'), ('trbvm.com'), ('spamherelots.com'), ('tempmailaddress.com')
on conflict (domena) do nothing;

-- ---------------------------------------------------------
-- Dotaz pro formulář. Vrací jen ano/ne, seznam neprozradí.
-- ---------------------------------------------------------
create or replace function public.email_domena_blokovana(p_email text)
returns boolean
language sql
security definer
stable
set search_path = public, private
as $$
  select exists (
    select 1 from private.blokovane_domeny
     where domena = lower(split_part(trim(p_email), '@', 2))
  );
$$;

revoke all on function public.email_domena_blokovana(text) from public;
grant execute on function public.email_domena_blokovana(text) to anon, authenticated;

-- ---------------------------------------------------------
-- Skutečná kontrola: v triggeru, kde ji formulář neobejde.
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
    case when v_overeno then v_nazev end,
    v_ico,
    case when v_overeno then v_nazev end,
    case when v_overeno then new.raw_user_meta_data ->> 'ares_sidlo' end,
    case when v_overeno then now() end,
    case when acc = 'firma' then now() + interval '3 months' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
