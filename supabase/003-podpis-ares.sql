-- =========================================================
-- TradeLink — databáze si ověření z ARES kontroluje sama
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 002-overeni-ico.sql.
--
-- Do téhle chvíle platilo, že ověření firmy proběhlo v prohlížeči
-- a databáze musela věřit tomu, co jí přišlo. Kdo uměl poslat
-- požadavek ručně, mohl si napsat cokoli.
--
-- Nově naše serverová funkce /api/ares podepíše výsledek ověření
-- klíčem, který prohlížeč nezná. Databáze podpis přepočítá a bez
-- něj firemní účet vůbec nezaloží.
-- =========================================================

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------
-- Klíč k podpisu. Schéma private není vystavené přes API a
-- tabulka nemá jediné pravidlo pro čtení — dostane se k ní
-- pouze funkce běžící s právy vlastníka.
-- ---------------------------------------------------------
create schema if not exists private;

create table if not exists private.app_secrets (
  klic    text primary key,
  hodnota text not null
);

alter table private.app_secrets enable row level security;

revoke all on schema private from anon, authenticated;
revoke all on table private.app_secrets from anon, authenticated;

-- Klíč se do souboru NEZAPISUJE. Repozitář je veřejný.
--
-- Vygenerování nového klíče (hodnotu nikam nekopírujte ručně):
--   update private.app_secrets
--      set hodnota = encode(extensions.gen_random_bytes(32), 'hex')
--    where klic = 'ares_secret';
--
-- Stejnou hodnotu je pak potřeba nastavit v Cloudflare jako proměnnou
-- ARES_SECRET (Workers & Pages → tradelink-landing → Settings →
-- Variables and Secrets) a projekt znovu nasadit.
insert into private.app_secrets (klic, hodnota)
values ('ares_secret', encode(extensions.gen_random_bytes(32), 'hex'))
on conflict (klic) do nothing;

-- ---------------------------------------------------------
-- Ověření podpisu: token má tvar "platiDo.hmac"
-- ---------------------------------------------------------
create or replace function private.overit_ares_token(
  p_token text,
  p_ico   text,
  p_nazev text
)
returns boolean
language plpgsql
security definer
set search_path = private, extensions, public
as $$
declare
  v_secret   text;
  v_plati_do bigint;
  v_podpis   text;
  v_ocekavan text;
begin
  if p_token is null or p_token !~ '^\d+\.[0-9a-f]{64}$' then
    return false;
  end if;

  v_plati_do := split_part(p_token, '.', 1)::bigint;
  v_podpis   := split_part(p_token, '.', 2);

  -- prošlý podpis neuznáváme
  if v_plati_do < extract(epoch from now()) then
    return false;
  end if;

  select hodnota into v_secret from private.app_secrets where klic = 'ares_secret';
  if v_secret is null then
    return false;
  end if;

  v_ocekavan := encode(
    extensions.hmac(
      convert_to(p_ico || ':' || p_nazev || ':' || v_plati_do, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  return v_podpis = v_ocekavan;
end;
$$;

-- ---------------------------------------------------------
-- Zakládání profilu po registraci
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  acc      text := coalesce(new.raw_user_meta_data ->> 'account_type', 'osoba');
  v_ico    text := nullif(trim(new.raw_user_meta_data ->> 'ico'), '');
  v_nazev  text := nullif(trim(new.raw_user_meta_data ->> 'ares_nazev'), '');
  v_token  text := new.raw_user_meta_data ->> 'ares_token';
  v_overeno boolean := false;
begin
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

-- Název firmy i sídlo se ukládají jen z ověřeného zdroje, takže
-- záznam v profilu odpovídá registru, ne tomu, co kdo vyplnil.
comment on function public.handle_new_user() is
  'Zakládá profil po registraci. Firemní účet vznikne jen s platným podpisem z /api/ares.';
