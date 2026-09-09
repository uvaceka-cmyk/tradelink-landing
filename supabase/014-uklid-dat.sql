-- =========================================================
-- TradeLink — automatický úklid dat
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 013-pravni-povinnosti.sql.
--
-- V zásadách ochrany údajů slibujeme, že nedokončené registrace
-- mažeme do 30 dní a hlášení uchováváme dva roky. Nic to ale
-- nedělalo — slib bez plnění je horší než žádný slib.
--
-- Tahle migrace to zařizuje. Běží denně, pokud je k dispozici
-- pg_cron; jinak se funkce dá spustit ručně:
--   select public.uklid_dat();
-- =========================================================

create or replace function public.uklid_dat()
returns table (co text, smazano bigint)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  n bigint;
begin
  -- Nedokončené registrace: e-mail nepotvrzený déle než 30 dní.
  -- Takový účet nikdy nezačal existovat, držet ho nemá důvod.
  delete from auth.users
   where email_confirmed_at is null
     and created_at < now() - interval '30 days';
  get diagnostics n = row_count;
  co := 'nedokončené registrace'; smazano := n; return next;

  -- Vyřízená hlášení starší dvou let. Do té doby je držíme,
  -- aby šlo doložit, jak jsme rozhodli.
  delete from public.nahlaseni
   where vyrizeno = true
     and created_at < now() - interval '2 years';
  get diagnostics n = row_count;
  co := 'stará hlášení'; smazano := n; return next;

  -- Vyřízená zpětná vazba starší dvou let.
  delete from public.zpetna_vazba
   where vyrizeno = true
     and created_at < now() - interval '2 years';
  get diagnostics n = row_count;
  co := 'stará zpětná vazba'; smazano := n; return next;

  return;
end;
$$;

revoke all on function public.uklid_dat() from public, anon, authenticated;

comment on function public.uklid_dat() is
  'Maže data po uplynutí doby uvedené v zásadách ochrany osobních údajů.';

-- ---------------------------------------------------------
-- Denní spuštění. Když rozšíření pg_cron není k dispozici,
-- migrace kvůli tomu neselže — jen se úklid bude spouštět ručně.
-- ---------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;

  perform cron.unschedule('tradelink-uklid')
    where exists (select 1 from cron.job where jobname = 'tradelink-uklid');

  perform cron.schedule(
    'tradelink-uklid',
    '30 3 * * *',                    -- každý den ve 3:30
    $prikaz$ select public.uklid_dat(); $prikaz$
  );

  raise notice 'Úklid naplánován na 3:30 každý den.';
exception
  when others then
    raise notice 'pg_cron není k dispozici (%). Úklid spouštějte ručně: select public.uklid_dat();', sqlerrm;
end $$;
