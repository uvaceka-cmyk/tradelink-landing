-- =========================================================
-- TradeLink — předplatné firem a noční údržba
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 020-upozorneni-na-odpoved.sql.
--
-- Proč to je:
--
-- Inzeráty firmy svítily dál, i kdyby zkušební doba dávno skončila.
-- Nic to nehlídalo. Provozovatel to ručně kontrolovat nebude a nemá.
--
-- Nově má firma "okno přístupu": zkušební doba, nebo zaplacené
-- předplatné, plus týden odkladu. Mimo okno její inzeráty a profil
-- z výpisů zmizí — samy, bez zásahu. Data zůstávají; po zaplacení
-- se všechno vrátí i s odpověďmi.
--
-- Rozhoduje o tom databáze, ne formulář. Kontrola v prohlížeči by
-- se dala obejít jedním požadavkem poslaným ručně.
--
-- Lidí (account_type = 'osoba') se to netýká, ti mají web zdarma.
-- =========================================================

-- ---------------------------------------------------------
-- Do kdy má firma zaplaceno
-- ---------------------------------------------------------
alter table public.profiles
  add column if not exists predplatne_do timestamptz;

comment on column public.profiles.predplatne_do is
  'Do kdy má firma zaplaceno. Prázdné = neplatí; pak rozhoduje trial_ends_at. Zatím se vyplňuje ručně, platební brána přijde později.';

-- Konec okna přístupu: pozdější ze zkušební doby a předplatného.
-- greatest() v Postgresu prázdné hodnoty přeskakuje, takže stačí obojí.
create or replace function public.pristup_do(p public.profiles)
returns timestamptz
language sql
immutable
as $$
  select greatest(p.trial_ends_at, p.predplatne_do);
$$;

-- ---------------------------------------------------------
-- Výpisy berou okno přístupu v potaz.
--
-- Týden odkladu je schválně: platba se páruje se zpožděním a nikomu
-- nemají zhasnout inzeráty ve chvíli, kdy peníze jsou na cestě.
-- ---------------------------------------------------------
drop view if exists public.verejne_inzeraty;
create view public.verejne_inzeraty as
select
  i.id, i.typ, i.nazev, i.popis, i.obor, i.podobor, i.lokalita, i.odmena,
  i.plati_do, i.created_at,
  i.autor                                                        as autor_id,
  coalesce(nullif(trim(p.company_name), ''), p.full_name)        as autor_jmeno,
  p.account_type                                                 as autor_typ,
  (p.ares_overeno_at is not null)                                as autor_overena_firma,
  case when p.account_type = 'firma' then p.ico end              as autor_ico
from public.inzeraty i
join public.profiles p on p.id = i.autor
where i.zverejnen = true
  and (i.plati_do is null or i.plati_do >= current_date)
  and (
    p.account_type <> 'firma'
    or now() < coalesce(public.pristup_do(p), '-infinity'::timestamptz) + interval '7 days'
  );

grant select on public.verejne_inzeraty to anon, authenticated;

comment on view public.verejne_inzeraty is
  'Veřejná podoba inzerátů. Bez e-mailu autora. Skryté, prošlé a inzeráty firem mimo okno přístupu se nezobrazují.';

drop view if exists public.verejne_profily;
create view public.verejne_profily as
select
  p.id, p.account_type,
  coalesce(nullif(trim(p.company_name), ''), p.full_name)      as jmeno,
  p.popis, p.obor, p.podobor, p.lokalita,
  case when p.account_type = 'firma' then p.ico end            as ico,
  case when p.account_type = 'firma' then p.ares_sidlo end     as sidlo,
  (p.ares_overeno_at is not null)                              as overena_firma,
  p.created_at
from public.profiles p
where p.zverejnen = true
  and (
    p.account_type <> 'firma'
    or now() < coalesce(public.pristup_do(p), '-infinity'::timestamptz) + interval '7 days'
  );

grant select on public.verejne_profily to anon, authenticated;

comment on view public.verejne_profily is
  'Veřejná podoba profilu. Bez e-mailu, telefonu a webu — ty vydá kontakt_firmy(). Firmy mimo okno přístupu se nezobrazují.';

-- ---------------------------------------------------------
-- Aby se upozornění neposlalo dvakrát.
-- ---------------------------------------------------------
create table if not exists private.odeslana_upozorneni (
  profil      uuid not null,
  druh        text not null,
  k_datu      date not null,
  odeslano_at timestamptz not null default now(),
  primary key (profil, druh, k_datu)
);

alter table private.odeslana_upozorneni enable row level security;
revoke all on table private.odeslana_upozorneni from anon, authenticated;

-- ---------------------------------------------------------
-- Upozornění na konec přístupu: týden předem a v den vypršení.
-- ---------------------------------------------------------
create or replace function private.upozornit_na_konec_pristupu()
returns integer
language plpgsql
security definer
set search_path = private, public
as $$
declare
  r       record;
  dnu     integer;
  v_druh  text;
  vlozeno integer;
  pocet   integer := 0;
begin
  for r in
    select p.id, p.email, p.company_name, public.pristup_do(p) as konec
      from public.profiles p
     where p.account_type = 'firma'
       and p.email is not null
       and public.pristup_do(p) is not null
  loop
    dnu := (r.konec::date - current_date);

    if dnu = 7 then
      v_druh := 'pristup-7';
    elsif dnu = 0 then
      v_druh := 'pristup-0';
    else
      continue;
    end if;

    insert into private.odeslana_upozorneni (profil, druh, k_datu)
    values (r.id, v_druh, r.konec::date)
    on conflict do nothing;

    get diagnostics vlozeno = row_count;
    if vlozeno = 0 then
      continue;  -- už odesláno
    end if;

    perform private.poslat_email(
      r.email,
      case when dnu = 7
        then 'Za týden vyprší přístup — TradeLink'
        else 'Přístup vypršel — TradeLink' end,
      case when dnu = 7
        then '<h2>Za týden vyprší přístup k inzerátům</h2>' ||
             '<p>Po tomhle datu se vaše inzeráty přestanou zobrazovat. Nikam nezmizí — ' ||
             'jakmile bude zaplaceno, vrátí se i s odpověďmi.</p>'
        else '<h2>Přístup k inzerátům vypršel</h2>' ||
             '<p>Vaše inzeráty se přestaly zobrazovat. Zůstávají uložené — ' ||
             'jakmile bude zaplaceno, vrátí se i s odpověďmi.</p>' end ||
      '<p><a href="https://tradelink.cz/ucet">Můj účet</a></p>' ||
      '<p>TradeLink · <a href="https://tradelink.cz">tradelink.cz</a></p>'
    );

    pocet := pocet + 1;
  end loop;

  return pocet;
end;
$$;

revoke execute on function private.upozornit_na_konec_pristupu() from anon, authenticated;

-- ---------------------------------------------------------
-- Noční údržba. Jedno místo, které se stará samo:
-- upozornění na konec přístupu + úklid nepotvrzených poptávek.
-- ---------------------------------------------------------
create or replace function public.denni_udrzba()
returns text
language plpgsql
security definer
set search_path = public, private
as $$
declare
  a integer;
  b integer;
begin
  a := private.upozornit_na_konec_pristupu();
  b := public.uklid_poptavek();
  return 'upozornění: ' || a || ', smazané poptávky: ' || b;
end;
$$;

revoke execute on function public.denni_udrzba() from anon, authenticated;

-- ---------------------------------------------------------
-- Plánovač. Běží každý den v 6:00 UTC (7:00 / 8:00 našeho času).
-- ---------------------------------------------------------
create extension if not exists pg_cron;

select cron.unschedule('tradelink-denni-udrzba')
 where exists (select 1 from cron.job where jobname = 'tradelink-denni-udrzba');

select cron.schedule('tradelink-denni-udrzba', '0 6 * * *', $$select public.denni_udrzba()$$);
