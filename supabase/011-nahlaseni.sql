-- =========================================================
-- TradeLink — nahlašování obsahu a fronta na kontrolu
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 010-odpovedi.sql.
--
-- Ověření v ARES odchytí neexistující firmu. Neodchytí firmu, která
-- existuje a přitom podvádí. Na to je tohle: kdokoli nahlásí obsah,
-- při více nezávislých hlášeních se sám skryje, a správce rozhodne.
-- =========================================================

create table if not exists public.nahlaseni (
  id         uuid primary key default gen_random_uuid(),
  typ        text not null check (typ in ('inzerat', 'hodnoceni', 'profil')),
  cil        uuid not null,
  autor      uuid references public.profiles(id) on delete set null,
  duvod      text not null check (duvod in (
               'podvod', 'neexistujici-firma', 'urazlivy-obsah',
               'nesouvisi-s-oborem', 'diskriminace', 'spam', 'jine')),
  poznamka   text check (poznamka is null or char_length(poznamka) <= 1000),
  vyrizeno   boolean not null default false,
  vysledek   text check (vysledek is null or vysledek in ('skryto', 'ponechano')),
  created_at timestamptz not null default now()
);

-- Jeden účet nahlásí jednu věc jednou. Nepřihlášené hlášení
-- se nespáruje, proto se pro ně index neuplatní.
create unique index if not exists nahlaseni_jedno_na_ucet
  on public.nahlaseni (typ, cil, autor) where autor is not null;

create index if not exists nahlaseni_nevyrizena
  on public.nahlaseni (created_at desc) where vyrizeno = false;

alter table public.nahlaseni enable row level security;

-- Nahlásit smí kdokoli, i nepřihlášený — podvod často odhalí ten,
-- kdo si účet nezaložil.
drop policy if exists "nahlasit smi kdokoli" on public.nahlaseni;
create policy "nahlasit smi kdokoli"
  on public.nahlaseni for insert with check (autor is null or autor = auth.uid());

drop policy if exists "nahlaseni cte spravce" on public.nahlaseni;
create policy "nahlaseni cte spravce"
  on public.nahlaseni for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.spravce)
  );

drop policy if exists "nahlaseni vyrizuje spravce" on public.nahlaseni;
create policy "nahlaseni vyrizuje spravce"
  on public.nahlaseni for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.spravce)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.spravce)
  );

-- ---------------------------------------------------------
-- Při třech nezávislých hlášeních se obsah sám skryje.
--
-- Není to rozsudek, jen pojistka: než se k tomu správce dostane,
-- nemá podvod viset ve výpisu. Vrátit zpět jde jedním kliknutím.
-- ---------------------------------------------------------
create or replace function public.nahlaseni_po_zapisu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pocet integer;
  MEZ   constant integer := 3;
begin
  select count(distinct coalesce(autor::text, id::text)) into pocet
    from public.nahlaseni
   where typ = new.typ and cil = new.cil and vyrizeno = false;

  if pocet >= MEZ then
    if new.typ = 'inzerat' then
      update public.inzeraty set zverejnen = false where id = new.cil;
    elsif new.typ = 'hodnoceni' then
      update public.hodnoceni set skryte = true where id = new.cil;
    elsif new.typ = 'profil' then
      update public.profiles set zverejnen = false where id = new.cil;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists nahlaseni_po_vlozeni on public.nahlaseni;
create trigger nahlaseni_po_vlozeni
  after insert on public.nahlaseni
  for each row execute function public.nahlaseni_po_zapisu();

-- ---------------------------------------------------------
-- Přehled pro správce: hlášení i s tím, čeho se týkají.
-- ---------------------------------------------------------
drop view if exists public.fronta_nahlaseni;
create view public.fronta_nahlaseni as
select
  n.id,
  n.typ,
  n.cil,
  n.duvod,
  n.poznamka,
  n.vyrizeno,
  n.vysledek,
  n.created_at,
  (n.autor is not null)                                     as od_prihlaseneho,
  case n.typ
    when 'inzerat'   then (select i.nazev from public.inzeraty i where i.id = n.cil)
    when 'hodnoceni' then (select left(h.text, 120) from public.hodnoceni h where h.id = n.cil)
    when 'profil'    then (select coalesce(nullif(trim(p.company_name), ''), p.full_name)
                             from public.profiles p where p.id = n.cil)
  end                                                       as cil_popis,
  case n.typ
    when 'inzerat'   then (select i.zverejnen from public.inzeraty i where i.id = n.cil)
    when 'hodnoceni' then (select not h.skryte from public.hodnoceni h where h.id = n.cil)
    when 'profil'    then (select p.zverejnen from public.profiles p where p.id = n.cil)
  end                                                       as cil_viditelny
from public.nahlaseni n;

grant select on public.fronta_nahlaseni to authenticated;

-- Pohled běží s právy vlastníka, takže si přístup hlídá sám:
-- bez příznaku správce nevrátí nic.
create or replace function public.fronta_pro_spravce()
returns setof public.fronta_nahlaseni
language sql
security definer
stable
set search_path = public
as $$
  select * from public.fronta_nahlaseni
   where public.jsem_spravce()
   order by vyrizeno, created_at desc;
$$;

revoke all on function public.fronta_pro_spravce() from public;
grant execute on function public.fronta_pro_spravce() to authenticated;

-- ---------------------------------------------------------
-- Rozhodnutí správce: skrýt, nebo vrátit zpět.
-- ---------------------------------------------------------
create or replace function public.vyridit_nahlaseni(p_id uuid, p_skryt boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n public.nahlaseni%rowtype;
begin
  if not public.jsem_spravce() then
    raise exception 'Jen pro správce.' using errcode = 'insufficient_privilege';
  end if;

  select * into n from public.nahlaseni where id = p_id;
  if not found then
    raise exception 'Hlášení nenalezeno.';
  end if;

  if n.typ = 'inzerat' then
    update public.inzeraty set zverejnen = not p_skryt where id = n.cil;
  elsif n.typ = 'hodnoceni' then
    update public.hodnoceni set skryte = p_skryt where id = n.cil;
  elsif n.typ = 'profil' then
    update public.profiles set zverejnen = not p_skryt where id = n.cil;
  end if;

  update public.nahlaseni
     set vyrizeno = true,
         vysledek = case when p_skryt then 'skryto' else 'ponechano' end
   where typ = n.typ and cil = n.cil and vyrizeno = false;
end;
$$;

revoke all on function public.vyridit_nahlaseni(uuid, boolean) from public;
grant execute on function public.vyridit_nahlaseni(uuid, boolean) to authenticated;
