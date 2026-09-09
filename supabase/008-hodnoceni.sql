-- =========================================================
-- TradeLink — hodnocení firem
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 007-inzeraty.sql.
--
-- Hodnotit lze jen firmu, jen jednou za účet a jen z ověřeného
-- účtu. Hodnocení sebe sama neprojde.
--
-- Poctivě: platforma zatím neví, jestli spolu ti dva opravdu
-- obchodovali. Dokud přes TradeLink neprochází poptávka a její
-- přijetí, je hodnocení tvrzením jedné strany. Kontroly níž tomu
-- kladou meze, neodstraňují to.
-- =========================================================

create table if not exists public.hodnoceni (
  id         uuid primary key default gen_random_uuid(),
  firma      uuid not null references public.profiles(id) on delete cascade,
  autor      uuid not null references public.profiles(id) on delete cascade,
  hvezdicky  smallint not null check (hvezdicky between 1 and 5),
  text       text check (text is null or char_length(trim(text)) between 20 and 2000),
  skryte     boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jeden účet hodnotí jednu firmu jednou. Chce-li názor změnit, upraví ho.
create unique index if not exists hodnoceni_jedno_na_firmu
  on public.hodnoceni (firma, autor);

create index if not exists hodnoceni_podle_firmy
  on public.hodnoceni (firma) where skryte = false;

alter table public.hodnoceni enable row level security;

drop policy if exists "hodnoceni ctu sva" on public.hodnoceni;
create policy "hodnoceni ctu sva"
  on public.hodnoceni for select using (auth.uid() = autor);

drop policy if exists "hodnoceni zakladam sva" on public.hodnoceni;
create policy "hodnoceni zakladam sva"
  on public.hodnoceni for insert with check (auth.uid() = autor);

drop policy if exists "hodnoceni upravuji sva" on public.hodnoceni;
create policy "hodnoceni upravuji sva"
  on public.hodnoceni for update using (auth.uid() = autor) with check (auth.uid() = autor);

drop policy if exists "hodnoceni mazu sva" on public.hodnoceni;
create policy "hodnoceni mazu sva"
  on public.hodnoceni for delete using (auth.uid() = autor);

-- ---------------------------------------------------------
-- Kontroly u zápisu
-- ---------------------------------------------------------
create or replace function public.hodnoceni_kontrola()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cil       public.profiles%rowtype;
  potvrzeny timestamptz;
begin
  if new.autor = new.firma then
    raise exception 'Vlastní firmu hodnotit nelze.' using errcode = 'check_violation';
  end if;

  select * into cil from public.profiles where id = new.firma;
  if not found or cil.account_type <> 'firma' then
    raise exception 'Hodnotit lze jen firmu.' using errcode = 'check_violation';
  end if;

  -- Hodnotí jen účet s potvrzeným e-mailem — jinak by stačilo
  -- zakládat účty na neexistující adresy a psát si hvězdičky.
  select email_confirmed_at into potvrzeny from auth.users where id = new.autor;
  if potvrzeny is null then
    raise exception 'Hodnotit může jen účet s potvrzeným e-mailem.' using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists hodnoceni_pred_zapisem on public.hodnoceni;
create trigger hodnoceni_pred_zapisem
  before insert or update on public.hodnoceni
  for each row execute function public.hodnoceni_kontrola();

-- ---------------------------------------------------------
-- Veřejná podoba hodnocení.
--
-- Jméno hodnotícího ukazujeme jen tehdy, když má zveřejněný profil.
-- Kdo profil zveřejněný nemá, vystupuje jako „ověřený uživatel" —
-- hodnocení tak nevytáhne na světlo někoho, kdo být vidět nechtěl.
-- ---------------------------------------------------------
drop view if exists public.verejna_hodnoceni;
create view public.verejna_hodnoceni as
select
  h.id,
  h.firma,
  h.hvezdicky,
  h.text,
  h.created_at,
  case
    when a.zverejnen then coalesce(nullif(trim(a.company_name), ''), a.full_name)
    else null
  end                                        as autor_jmeno,
  a.account_type                             as autor_typ,
  a.zverejnen                                as autor_verejny
from public.hodnoceni h
join public.profiles a on a.id = h.autor
where h.skryte = false;

grant select on public.verejna_hodnoceni to anon, authenticated;

-- ---------------------------------------------------------
-- Průměr a počet hodnocení rovnou u profilu, ať výpis nemusí
-- dopočítávat sám.
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
  p.created_at,
  h.pocet                                                      as hodnoceni_pocet,
  h.prumer                                                     as hodnoceni_prumer
from public.profiles p
left join (
  select firma, count(*) as pocet, round(avg(hvezdicky)::numeric, 1) as prumer
    from public.hodnoceni
   where skryte = false
   group by firma
) h on h.firma = p.id
where p.zverejnen = true;

grant select on public.verejne_profily to anon, authenticated;

comment on view public.verejna_hodnoceni is
  'Veřejná hodnocení firem. Jméno autora jen u zveřejněných profilů.';
