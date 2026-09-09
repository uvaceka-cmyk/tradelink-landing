-- =========================================================
-- TradeLink — inzeráty a poptávky
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 006-profily.sql.
--
-- Inzerát zadává jen ta strana, která něco poptává:
--   'prace'   — firma hledá zaměstnance
--   'zakazka' — někdo hledá, kdo mu práci provede
--
-- Kdo hledá práci nebo zakázky, inzerát nezadává — ukáže se svým
-- profilem a prochází inzeráty ostatních. Čtyři cesty z recepce tak
-- sedí na sebe a data o jedné věci nejsou na dvou místech.
-- =========================================================

create table if not exists public.inzeraty (
  id          uuid primary key default gen_random_uuid(),
  autor       uuid not null references public.profiles(id) on delete cascade,
  typ         text not null check (typ in ('prace', 'zakazka')),
  nazev       text not null check (char_length(trim(nazev)) between 5 and 120),
  popis       text not null check (char_length(trim(popis)) between 30 and 4000),
  obor        text not null check (char_length(obor) <= 60),
  podobor     text check (podobor is null or char_length(podobor) <= 80),
  lokalita    text check (lokalita is null or char_length(lokalita) <= 120),
  odmena      text check (odmena is null or char_length(odmena) <= 120),
  zverejnen   boolean not null default false,
  plati_do    date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists inzeraty_hledani
  on public.inzeraty (typ, obor, podobor)
  where zverejnen = true;

create index if not exists inzeraty_autor on public.inzeraty (autor);

-- ---------------------------------------------------------
-- Přístup: každý spravuje jen své inzeráty.
-- ---------------------------------------------------------
alter table public.inzeraty enable row level security;

drop policy if exists "inzeraty ctu sve" on public.inzeraty;
create policy "inzeraty ctu sve"
  on public.inzeraty for select using (auth.uid() = autor);

drop policy if exists "inzeraty zakladam sve" on public.inzeraty;
create policy "inzeraty zakladam sve"
  on public.inzeraty for insert with check (auth.uid() = autor);

drop policy if exists "inzeraty upravuji sve" on public.inzeraty;
create policy "inzeraty upravuji sve"
  on public.inzeraty for update using (auth.uid() = autor) with check (auth.uid() = autor);

drop policy if exists "inzeraty mazu sve" on public.inzeraty;
create policy "inzeraty mazu sve"
  on public.inzeraty for delete using (auth.uid() = autor);

-- ---------------------------------------------------------
-- Ochrana proti falešnému obsahu.
--
-- Kontroly sedí v databázi, ne ve formuláři — jinak by je obešel
-- kdokoli, kdo umí poslat požadavek ručně.
-- ---------------------------------------------------------
create or replace function public.inzerat_kontrola()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  p          public.profiles%rowtype;
  pocet_akt  integer;
  LIMIT_AKT  constant integer := 20;
begin
  select * into p from public.profiles where id = new.autor;
  if not found then
    raise exception 'Inzerát nelze zadat bez profilu.' using errcode = 'check_violation';
  end if;

  -- Nabídku práce zadává firma, a to jen ověřená v ARES.
  if new.typ = 'prace' then
    if p.account_type <> 'firma' then
      raise exception 'Nabídku práce může zadat jen firemní účet.' using errcode = 'check_violation';
    end if;
    if p.ares_overeno_at is null then
      raise exception 'Nabídku práce může zadat jen firma ověřená v registru ARES.'
        using errcode = 'check_violation';
    end if;
  end if;

  -- Firma zadávající cokoli musí být ověřená.
  if p.account_type = 'firma' and p.ares_overeno_at is null then
    raise exception 'Firemní účet musí být ověřený v registru ARES.' using errcode = 'check_violation';
  end if;

  -- Strop na počet zveřejněných inzerátů, aby účet nešel použít k zaplavení výpisu.
  if new.zverejnen then
    select count(*) into pocet_akt
      from public.inzeraty
     where autor = new.autor
       and zverejnen = true
       and (TG_OP = 'INSERT' or id <> new.id);

    if pocet_akt >= LIMIT_AKT then
      raise exception 'Najednou lze mít zveřejněných nejvýš % inzerátů.', LIMIT_AKT
        using errcode = 'check_violation';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists inzerat_pred_zapisem on public.inzeraty;
create trigger inzerat_pred_zapisem
  before insert or update on public.inzeraty
  for each row execute function public.inzerat_kontrola();

-- ---------------------------------------------------------
-- Co z inzerátu vidí ostatní.
--
-- Tohle je rozhraní pro výpis — nad tímto pohledem se staví
-- prohlížení inzerátů, do tabulky samotné se nesahá.
-- ---------------------------------------------------------
drop view if exists public.verejne_inzeraty;
create view public.verejne_inzeraty as
select
  i.id,
  i.typ,
  i.nazev,
  i.popis,
  i.obor,
  i.podobor,
  i.lokalita,
  i.odmena,
  i.plati_do,
  i.created_at,
  i.autor                                                        as autor_id,
  coalesce(nullif(trim(p.company_name), ''), p.full_name)        as autor_jmeno,
  p.account_type                                                 as autor_typ,
  (p.ares_overeno_at is not null)                                as autor_overena_firma,
  case when p.account_type = 'firma' then p.ico end              as autor_ico
from public.inzeraty i
join public.profiles p on p.id = i.autor
where i.zverejnen = true
  and (i.plati_do is null or i.plati_do >= current_date);

grant select on public.verejne_inzeraty to anon, authenticated;

comment on view public.verejne_inzeraty is
  'Veřejná podoba inzerátů. Bez e-mailu autora. Skryté a prošlé inzeráty se nezobrazují.';
