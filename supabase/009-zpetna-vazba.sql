-- =========================================================
-- TradeLink — zpětná vazba na platformu
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 008-hodnoceni.sql.
--
-- Tohle není hodnocení firem (to je tabulka hodnoceni), ale
-- hodnocení samotného TradeLinku a návrhy na úpravy.
--
-- Psát smí i nepřihlášený — kdo se zasekne při registraci, se
-- nepřihlásí, a právě jeho zpětná vazba je nejcennější.
-- Číst smí jen správce.
-- =========================================================

-- Příznak správce. Nastavuje se ručně v databázi:
--   update public.profiles set spravce = true where email = 'vas@email.cz';
alter table public.profiles
  add column if not exists spravce boolean not null default false;

comment on column public.profiles.spravce is
  'Smí číst zpětnou vazbu a později spravovat nahlášený obsah. Nastavuje se ručně.';

create table if not exists public.zpetna_vazba (
  id         uuid primary key default gen_random_uuid(),
  autor      uuid references public.profiles(id) on delete set null,
  typ        text not null check (typ in ('hodnoceni', 'navrh', 'chyba')),
  hvezdicky  smallint check (hvezdicky is null or hvezdicky between 1 and 5),
  text       text not null check (char_length(trim(text)) between 10 and 4000),
  stranka    text check (stranka is null or char_length(stranka) <= 200),
  kontakt    text check (kontakt is null or char_length(kontakt) <= 200),
  vyrizeno   boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists zpetna_vazba_nevyrizena
  on public.zpetna_vazba (created_at desc) where vyrizeno = false;

alter table public.zpetna_vazba enable row level security;

-- Psát smí kdokoli, i nepřihlášený.
drop policy if exists "zpetna vazba pise kdokoli" on public.zpetna_vazba;
create policy "zpetna vazba pise kdokoli"
  on public.zpetna_vazba for insert with check (
    autor is null or autor = auth.uid()
  );

-- Číst a vyřizovat smí jen správce.
drop policy if exists "zpetnou vazbu cte spravce" on public.zpetna_vazba;
create policy "zpetnou vazbu cte spravce"
  on public.zpetna_vazba for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.spravce)
  );

drop policy if exists "zpetnou vazbu vyrizuje spravce" on public.zpetna_vazba;
create policy "zpetnou vazbu vyrizuje spravce"
  on public.zpetna_vazba for update using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.spravce)
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.spravce)
  );

-- ---------------------------------------------------------
-- Aby šla stránka správy schovat, potřebuje web vědět,
-- jestli je přihlášený správce. Vrací jen ano/ne.
-- ---------------------------------------------------------
create or replace function public.jsem_spravce()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select spravce from public.profiles where id = auth.uid()), false);
$$;

revoke all on function public.jsem_spravce() from public;
grant execute on function public.jsem_spravce() to anon, authenticated;
