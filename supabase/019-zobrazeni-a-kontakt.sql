-- =========================================================
-- TradeLink — počítadlo zobrazení a kontakt až po přihlášení
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 018-poptavka-bez-uctu.sql.
--
-- Proč to je:
--
-- 1) Zadavatel nevidí, jestli jeho inzerát někdo četl. Bez čísla nemá
--    jak poznat, že mu TradeLink něco přinesl — a my nemáme čím to
--    tvrzení podložit, až se začne platit.
--
-- 2) Telefon a web firmy byly veřejné komukoli. Kdo chtěl, obešel web
--    a ozval se mimo něj; firma se pak nedozvěděla, odkud člověk přišel.
--    Nově jsou vidět až po přihlášení.
-- =========================================================

-- ---------------------------------------------------------
-- 1) Počítadlo zobrazení
-- ---------------------------------------------------------
alter table public.inzeraty
  add column if not exists zobrazeni integer not null default 0;

comment on column public.inzeraty.zobrazeni is
  'Kolikrát někdo otevřel detail inzerátu. Počítá prohlížeč, jednou za návštěvu; roboti se nezapočítají, protože nespouštějí JavaScript.';

-- Zvyšuje počítadlo. Smí ji volat i nepřihlášený — jinak by se
-- nezapočítal nikdo, kdo si inzerát jen prohlíží.
--
-- Vrací void schválně: kdyby vracela počet, dal by se přes ni číst
-- provoz cizích inzerátů. Zadavatel svoje číslo vidí ve svém přehledu.
create or replace function public.zapocitat_zobrazeni(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.inzeraty
     set zobrazeni = zobrazeni + 1
   where id = p_id
     and zverejnen = true;
end;
$$;

grant execute on function public.zapocitat_zobrazeni(uuid) to anon, authenticated;

-- ---------------------------------------------------------
-- 2) Kontakt firmy až po přihlášení
--
-- Z veřejného pohledu mizí telefon i web. Zbytek zůstává, aby profil
-- dál dával smysl i nepřihlášenému — jen se na firmu nedá ozvat mimo
-- TradeLink, aniž by o tom kdokoli věděl.
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
  case when p.account_type = 'firma' then p.ico end            as ico,
  case when p.account_type = 'firma' then p.ares_sidlo end     as sidlo,
  (p.ares_overeno_at is not null)                              as overena_firma,
  p.created_at
from public.profiles p
where p.zverejnen = true;

grant select on public.verejne_profily to anon, authenticated;

comment on view public.verejne_profily is
  'Veřejná podoba profilu. Bez e-mailu, bez telefonu a bez webu — ty vydá kontakt_firmy() jen přihlášenému.';

-- Kontakt vydá jen přihlášenému a jen u zveřejněného profilu.
create or replace function public.kontakt_firmy(p_id uuid)
returns table (telefon text, web text)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Kontakt uvidíte po přihlášení.' using errcode = 'insufficient_privilege';
  end if;

  return query
    select p.telefon, p.web
      from public.profiles p
     where p.id = p_id
       and p.zverejnen = true;
end;
$$;

revoke execute on function public.kontakt_firmy(uuid) from anon;
grant execute on function public.kontakt_firmy(uuid) to authenticated;
