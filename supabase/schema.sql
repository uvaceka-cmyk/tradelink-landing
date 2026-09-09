-- =========================================================
-- TradeLink — databázové schéma pro účty
--
-- Kam to patří: Supabase → projekt → SQL Editor → New query →
-- vložit celý soubor → Run. Spustit jen jednou.
--
-- Supabase si uživatele a hesla drží sám v tabulce auth.users,
-- do které se nesahá. Tady si vedeme veřejnější profil, na který
-- se dá později navázat inzeráty, poptávky a firmy.
-- =========================================================

create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  email         text,
  account_type  text not null default 'osoba' check (account_type in ('osoba','firma')),
  entry_role    text check (entry_role in (
                  'hledam-zamestnance','hledam-praci','hledam-zakazky','chci-zadat-zakazku')),
  full_name     text,
  company_name  text,
  ico           text,
  trial_ends_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on column public.profiles.entry_role is
  'Kterou ze čtyř cest si člověk vybral na recepci.';
comment on column public.profiles.trial_ends_at is
  'Konec tříměsíční zkušební doby. U osobních účtů zůstává prázdné — ti neplatí nikdy.';

-- ---------------------------------------------------------
-- Přístupová pravidla: každý vidí a mění jen svůj profil.
-- Bez RLS by anon klíč z prohlížeče otevřel celou tabulku všem.
-- ---------------------------------------------------------
alter table public.profiles enable row level security;

drop policy if exists "profil je vlastní" on public.profiles;
create policy "profil je vlastní"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profil lze upravit jen svůj" on public.profiles;
create policy "profil lze upravit jen svůj"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ---------------------------------------------------------
-- Po registraci se profil založí sám z údajů z formuláře.
-- ---------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acc text := coalesce(new.raw_user_meta_data ->> 'account_type', 'osoba');
begin
  insert into public.profiles (
    id, email, account_type, entry_role, full_name, company_name, ico, trial_ends_at
  )
  values (
    new.id,
    new.email,
    acc,
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'company_name',
    new.raw_user_meta_data ->> 'ico',
    case when acc = 'firma' then now() + interval '3 months' end
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------
-- Údržba updated_at
-- ---------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();
