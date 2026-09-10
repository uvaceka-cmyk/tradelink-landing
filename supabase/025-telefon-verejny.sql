-- =========================================================
-- TradeLink — ať si každý sám řekne, jestli je jeho telefon veřejný
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 024-prava-k-funkcim.sql.
--
-- Proč to je:
--
-- Dosud rozhodoval typ účtu: telefon firmy viděl přihlášený uživatel,
-- telefon člověka nikdo. To je za uživatele rozhodnuto — a špatně na obě
-- strany. Živnostník bez firemního účtu se nemá jak nechat zavolat,
-- a firma, která telefon zveřejnit nechce, ho zveřejněný má.
--
-- Nově si to volí každý sám u telefonu ve svém profilu.
--
-- Výchozí stav se drží při zemi: **u lidí schovaný, u firem zobrazený.**
-- Firma telefon uvádí, aby jí někdo zavolal; člověk ho uvádí, aby ho
-- měla platforma. Kdo to chce jinak, přepne si to.
-- =========================================================

alter table public.profiles
  add column if not exists telefon_verejny boolean;

comment on column public.profiles.telefon_verejny is
  'Smí telefon vidět přihlášený návštěvník? Prázdné = podle typu účtu (firma ano, člověk ne).';

-- Dosavadní chování se tím nemění: existující účty si zachovají to,
-- co pro ně platilo doteď, dokud si samy nepřepnou.
update public.profiles
   set telefon_verejny = (account_type = 'firma')
 where telefon_verejny is null;

-- ---------------------------------------------------------
-- Kontakt vydává funkce, ne veřejný pohled — pořád jen přihlášeným.
-- Nově se řídí volbou uživatele místo typu účtu.
-- ---------------------------------------------------------
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
    select
      case when coalesce(p.telefon_verejny, p.account_type = 'firma')
           then p.telefon end,
      p.web
      from public.profiles p
     where p.id = p_id
       and p.zverejnen = true;
end;
$$;

revoke execute on function public.kontakt_firmy(uuid) from public, anon;
grant execute on function public.kontakt_firmy(uuid) to authenticated;

-- ---------------------------------------------------------
-- Aby stránka věděla, jestli má vůbec nabízet „přihlaste se a uvidíte
-- kontakt". Číslo samotné z pohledu nevydáváme — jen to, že existuje.
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
  p.created_at,
  h.pocet                                                      as hodnoceni_pocet,
  h.prumer                                                     as hodnoceni_prumer,
  (
    (p.web is not null and trim(p.web) <> '')
    or (
      p.telefon is not null and trim(p.telefon) <> ''
      and coalesce(p.telefon_verejny, p.account_type = 'firma')
    )
  )                                                            as ma_kontakt
from public.profiles p
left join (
  select firma, count(*) as pocet, round(avg(hvezdicky)::numeric, 1) as prumer
    from public.hodnoceni
   where skryte = false
   group by firma
) h on h.firma = p.id
where p.zverejnen = true
  and (
    p.account_type <> 'firma'
    or now() < coalesce(public.pristup_do(p), '-infinity'::timestamptz) + interval '7 days'
  );

grant select on public.verejne_profily to anon, authenticated;

comment on view public.verejne_profily is
  'Veřejná podoba profilu. Bez e-mailu, telefonu a webu — ty vydá kontakt_firmy() přihlášenému. ma_kontakt říká jen to, že nějaký kontakt existuje.';
