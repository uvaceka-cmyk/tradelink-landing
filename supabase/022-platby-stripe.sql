-- =========================================================
-- TradeLink — platby přes Stripe
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 021-predplatne-a-udrzba.sql.
--
-- Proč to je:
--
-- `predplatne_do` se dosud vyplňovalo ručně. Provozovatel není stroj
-- a u dvacáté firmy by na to zapomněl. Datum proto nastavuje sama
-- platební brána: Stripe pošle po zaplacení zprávu na /api/stripe/webhook
-- a ta funkce datum posune.
--
-- Co tady NENÍ a být nesmí: klíče ke Stripu. Ty žijí v Cloudflare
-- (Workers & Pages → tradelink-landing → Settings → Variables and Secrets)
-- jako STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET a SUPABASE_SERVICE_KEY.
-- =========================================================

alter table public.profiles
  add column if not exists stripe_zakaznik   text,
  add column if not exists predplatne_stav   text,
  add column if not exists predplatne_od     timestamptz;

comment on column public.profiles.stripe_zakaznik is
  'Identifikátor zákazníka ve Stripu (cus_…). Podle něj se páruje platba s účtem.';
comment on column public.profiles.predplatne_stav is
  'Poslední známý stav ze Stripu: active, past_due, canceled. Jen pro přehled — o zobrazování rozhoduje predplatne_do.';

-- Jeden zákazník Stripu patří jednomu účtu.
create unique index if not exists profiles_stripe_zakaznik
  on public.profiles (stripe_zakaznik) where stripe_zakaznik is not null;

-- ---------------------------------------------------------
-- Zápis po zaplacení.
--
-- Volá ji jen webhook, a to servisním klíčem — proto je odebraná všem
-- ostatním. Kdyby ji uměl zavolat kdokoli, koupil by si předplatné
-- jedním požadavkem zdarma.
--
-- Datum se nastavuje natvrdo podle Stripu, ne přičítáním měsíce:
-- Stripe ví o odkladech, vratkách i změnách tarifu líp než my.
-- ---------------------------------------------------------
create or replace function public.zapsat_platbu(
  p_zakaznik text,
  p_email    text,
  p_do       timestamptz,
  p_stav     text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  -- Nejdřív podle zákazníka Stripu, pak podle e-mailu (první platba).
  select id into v_id from public.profiles where stripe_zakaznik = p_zakaznik;

  if v_id is null and p_email is not null then
    select id into v_id from public.profiles where lower(email) = lower(p_email);
  end if;

  if v_id is null then
    return false;
  end if;

  update public.profiles
     set stripe_zakaznik = coalesce(p_zakaznik, stripe_zakaznik),
         predplatne_do   = p_do,
         predplatne_stav = p_stav,
         predplatne_od   = coalesce(predplatne_od, now())
   where id = v_id;

  return true;
end;
$$;

revoke execute on function public.zapsat_platbu(text, text, timestamptz, text) from anon, authenticated;
