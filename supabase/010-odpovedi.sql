-- =========================================================
-- TradeLink — odpovědi na inzerát
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 009-zpetna-vazba.sql.
--
-- Tohle je krok, který dosud chyběl: uvidět inzerát a nemoct se
-- ozvat znamená, že se propojení nedokončí. Odpověď vidí jen
-- zadavatel inzerátu a její autor, nikdo jiný.
-- =========================================================

create table if not exists public.odpovedi (
  id         uuid primary key default gen_random_uuid(),
  inzerat    uuid not null references public.inzeraty(id) on delete cascade,
  autor      uuid not null references public.profiles(id) on delete cascade,
  zprava     text not null check (char_length(trim(zprava)) between 20 and 2000),
  kontakt    text check (kontakt is null or char_length(kontakt) <= 200),
  precteno   boolean not null default false,
  created_at timestamptz not null default now()
);

-- Jedna odpověď na inzerát od jednoho účtu. Kdo chce doplnit,
-- ozve se už napřímo — tohle není chat, ale první oslovení.
create unique index if not exists odpovedi_jedna_na_inzerat
  on public.odpovedi (inzerat, autor);

create index if not exists odpovedi_podle_inzeratu on public.odpovedi (inzerat);

alter table public.odpovedi enable row level security;

-- Čte autor odpovědi a zadavatel inzerátu.
drop policy if exists "odpovedi cte autor a zadavatel" on public.odpovedi;
create policy "odpovedi cte autor a zadavatel"
  on public.odpovedi for select using (
    auth.uid() = autor
    or exists (select 1 from public.inzeraty i where i.id = inzerat and i.autor = auth.uid())
  );

drop policy if exists "odpovedi pise prihlaseny" on public.odpovedi;
create policy "odpovedi pise prihlaseny"
  on public.odpovedi for insert with check (auth.uid() = autor);

-- Zadavatel si odpověď označí za přečtenou.
drop policy if exists "odpovedi znaci zadavatel" on public.odpovedi;
create policy "odpovedi znaci zadavatel"
  on public.odpovedi for update using (
    exists (select 1 from public.inzeraty i where i.id = inzerat and i.autor = auth.uid())
  ) with check (
    exists (select 1 from public.inzeraty i where i.id = inzerat and i.autor = auth.uid())
  );

drop policy if exists "odpovedi maze autor" on public.odpovedi;
create policy "odpovedi maze autor"
  on public.odpovedi for delete using (auth.uid() = autor);

-- ---------------------------------------------------------
-- Kontroly u zápisu
-- ---------------------------------------------------------
create or replace function public.odpoved_kontrola()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  i         public.inzeraty%rowtype;
  potvrzeny timestamptz;
  za_den    integer;
begin
  select * into i from public.inzeraty where id = new.inzerat;
  if not found then
    raise exception 'Takový inzerát neexistuje.' using errcode = 'check_violation';
  end if;
  if i.autor = new.autor then
    raise exception 'Na vlastní inzerát odpovídat nelze.' using errcode = 'check_violation';
  end if;
  if not i.zverejnen then
    raise exception 'Na skrytý inzerát odpovídat nelze.' using errcode = 'check_violation';
  end if;
  if i.plati_do is not null and i.plati_do < current_date then
    raise exception 'Platnost inzerátu už vypršela.' using errcode = 'check_violation';
  end if;

  select email_confirmed_at into potvrzeny from auth.users where id = new.autor;
  if potvrzeny is null then
    raise exception 'Odpovídat může jen účet s potvrzeným e-mailem.' using errcode = 'check_violation';
  end if;

  -- Strop na počet odpovědí za den, aby účet nešel použít k rozesílání.
  select count(*) into za_den
    from public.odpovedi
   where autor = new.autor and created_at > now() - interval '1 day';

  if za_den >= 30 then
    raise exception 'Denní limit odpovědí je vyčerpaný. Zkuste to zítra.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

drop trigger if exists odpoved_pred_zapisem on public.odpovedi;
create trigger odpoved_pred_zapisem
  before insert on public.odpovedi
  for each row execute function public.odpoved_kontrola();

-- ---------------------------------------------------------
-- Kolik odpovědí má který inzerát — pro přehled zadavatele.
-- ---------------------------------------------------------
create or replace function public.pocty_odpovedi()
returns table (inzerat uuid, pocet bigint, neprectenych bigint)
language sql
security definer
stable
set search_path = public
as $$
  select o.inzerat, count(*), count(*) filter (where not o.precteno)
    from public.odpovedi o
    join public.inzeraty i on i.id = o.inzerat
   where i.autor = auth.uid()
   group by o.inzerat;
$$;

revoke all on function public.pocty_odpovedi() from public;
grant execute on function public.pocty_odpovedi() to authenticated;
