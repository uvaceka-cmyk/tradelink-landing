-- =========================================================
-- TradeLink — poptávka bez účtu
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 017-zkusebni-doba-dva-mesice.sql.
--
-- Proč to je:
--
-- Člověk, který shání řemeslníka, je ochotný napsat tři věty — ne zakládat
-- účet, potvrzovat e-mail a teprve pak psát poptávku. Registrace před
-- zadáním byla ta největší překážka, proč je výpis prázdný.
--
-- Poptávka se proto napíše rovnou a počká tady, dokud autor nepotvrdí
-- e-mail. Teprve pak se překlopí mezi inzeráty a zveřejní.
--
-- Čekající poptávky NIKDO zvenčí nepřečte — jsou v nich e-maily a text,
-- který ještě neprošel potvrzením. Tabulka nemá jedinou politiku pro čtení,
-- jen pro zápis. Ven se dostanou až jako řádný inzerát.
-- =========================================================

create table if not exists public.poptavky_ceka (
  id          uuid primary key default gen_random_uuid(),
  email       text not null check (position('@' in email) > 1 and char_length(email) <= 200),
  nazev       text not null check (char_length(trim(nazev)) between 5 and 120),
  popis       text not null check (char_length(trim(popis)) between 30 and 4000),
  obor        text not null check (char_length(obor) <= 60),
  podobor     text check (podobor is null or char_length(podobor) <= 80),
  lokalita    text check (lokalita is null or char_length(lokalita) <= 120),
  odmena      text check (odmena is null or char_length(odmena) <= 120),
  created_at  timestamptz not null default now(),
  prevzato_at timestamptz
);

create index if not exists poptavky_ceka_email
  on public.poptavky_ceka (lower(email)) where prevzato_at is null;

comment on table public.poptavky_ceka is
  'Poptávky zadané bez účtu. Čekají na potvrzení e-mailu, pak je prevzit_poptavky() překlopí do inzeraty. Zvenčí se nedají číst.';

-- ---------------------------------------------------------
-- Přístup: zapsat smí kdokoli, přečíst nikdo.
-- ---------------------------------------------------------
alter table public.poptavky_ceka enable row level security;

drop policy if exists "poptavku zadá kdokoli" on public.poptavky_ceka;
create policy "poptavku zadá kdokoli"
  on public.poptavky_ceka for insert to anon, authenticated with check (true);

-- Žádná politika pro select, update ani delete. Číst a mazat umí jen
-- funkce níž, které běží s právy vlastníka.
grant insert on table public.poptavky_ceka to anon, authenticated;

-- ---------------------------------------------------------
-- Ochrana proti zaplavení.
--
-- Kontroly sedí v databázi, ne ve formuláři — jinak by je obešel kdokoli,
-- kdo umí poslat požadavek ručně.
-- ---------------------------------------------------------
create or replace function public.poptavka_ceka_kontrola()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_domena  text := lower(split_part(coalesce(new.email, ''), '@', 2));
  pocet     integer;
  LIMIT_MAX constant integer := 3;
begin
  new.email := lower(trim(new.email));

  if exists (select 1 from private.blokovane_domeny where domena = v_domena) then
    raise exception 'Jednorázové e-mailové schránky nepřijímáme. Použijte prosím svůj běžný e-mail.'
      using errcode = 'check_violation';
  end if;

  -- Jedna adresa smí mít najednou nejvýš tři nepotvrzené poptávky.
  select count(*) into pocet
    from public.poptavky_ceka
   where lower(email) = new.email
     and prevzato_at is null;

  if pocet >= LIMIT_MAX then
    raise exception 'Na tento e-mail už čeká % nepotvrzených poptávek. Potvrďte prosím nejdřív ty.', LIMIT_MAX
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists poptavka_ceka_pred_zapisem on public.poptavky_ceka;
create trigger poptavka_ceka_pred_zapisem
  before insert on public.poptavky_ceka
  for each row execute function public.poptavka_ceka_kontrola();

-- ---------------------------------------------------------
-- Překlopení do inzerátů po potvrzení e-mailu.
--
-- Volá se z prohlížeče po přihlášení. Bere jen poptávky, které patří
-- k adrese přihlášeného účtu — cizí si nikdo nepřivlastní.
--
-- Když jedna poptávka projít nemůže (třeba neověřená firma), přeskočí se
-- a zbytek se překlopí. Přihlášení kvůli jedné vadné poptávce nespadne.
-- ---------------------------------------------------------
create or replace function public.prevzit_poptavky()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id    uuid := auth.uid();
  v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  r       public.poptavky_ceka%rowtype;
  pocet   integer := 0;
begin
  if v_id is null or v_email = '' then
    return 0;
  end if;

  for r in
    select * from public.poptavky_ceka
     where lower(email) = v_email and prevzato_at is null
     order by created_at
  loop
    begin
      insert into public.inzeraty (autor, typ, nazev, popis, obor, podobor, lokalita, odmena, zverejnen)
      values (v_id, 'zakazka', r.nazev, r.popis, r.obor, r.podobor, r.lokalita, r.odmena, true);

      update public.poptavky_ceka set prevzato_at = now() where id = r.id;
      pocet := pocet + 1;
    exception when others then
      -- Poptávku nechceme ztratit ani kvůli ní shodit přihlášení.
      null;
    end;
  end loop;

  return pocet;
end;
$$;

grant execute on function public.prevzit_poptavky() to authenticated;

-- ---------------------------------------------------------
-- Úklid. Kdo e-mail nepotvrdí, po měsíci se jeho text smaže —
-- držet nepotvrzené osobní údaje déle není k čemu.
-- ---------------------------------------------------------
create or replace function public.uklid_poptavek()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  pocet integer;
begin
  delete from public.poptavky_ceka
   where prevzato_at is null
     and created_at < now() - interval '30 days';
  get diagnostics pocet = row_count;
  return pocet;
end;
$$;

revoke execute on function public.uklid_poptavek() from anon, authenticated;
