-- =========================================================
-- TradeLink — zesílení ověřování podpisu z /api/ares
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 003-podpis-ares.sql.
--
-- Co se mění:
--   * porovnání podpisu je odolné proti měření času (double HMAC)
--   * podpis se přijímá i velkými písmeny, porovnává se v malých
--   * platnost musí být v rozumném okně, ne libovolně daleko
--   * jakákoli neočekávaná chyba znamená NEOVĚŘENO, ne průchod
--   * chybějící klíč znamená NEOVĚŘENO
--
-- Klíč se v tomto souboru nevyskytuje a nikdy vyskytovat nebude.
-- =========================================================

-- Nejzazší platnost podpisu. /api/ares vydává hodinu, tady je
-- strop se zálohou — podpis s absurdně vzdálenou platností
-- (pokus o věčně platný token) neprojde.
create or replace function private.overit_ares_token(
  p_token text,
  p_ico   text,
  p_nazev text
)
returns boolean
language plpgsql
security definer
set search_path = private, extensions, public
as $$
declare
  v_secret   text;
  v_plati_do bigint;
  v_podpis   text;
  v_ocekavan text;
  v_nonce    bytea;
  v_now      bigint := floor(extract(epoch from now()))::bigint;
begin
  -- vstup musí mít přesný tvar; nic jiného se ani nezkoumá
  if p_token is null or p_ico is null or p_nazev is null then
    return false;
  end if;
  if p_token !~ '^[0-9]{1,12}\.[0-9a-fA-F]{64}$' then
    return false;
  end if;

  v_plati_do := split_part(p_token, '.', 1)::bigint;
  v_podpis   := lower(split_part(p_token, '.', 2));

  -- prošlý podpis neuznáváme
  if v_plati_do <= v_now then
    return false;
  end if;
  -- ani podpis platný nepřiměřeně dlouho (strop 2 hodiny)
  if v_plati_do > v_now + 7200 then
    return false;
  end if;

  select hodnota into v_secret from private.app_secrets where klic = 'ares_secret';
  if v_secret is null or length(v_secret) < 32 then
    return false;   -- bez klíče se neověřuje, tedy neprochází
  end if;

  v_ocekavan := lower(encode(
    extensions.hmac(
      convert_to(p_ico || ':' || p_nazev || ':' || v_plati_do, 'UTF8'),
      convert_to(v_secret, 'UTF8'),
      'sha256'
    ),
    'hex'
  ));

  -- Porovnání přes druhý HMAC s jednorázovým klíčem. Doba porovnání
  -- pak neprozradí, kolik znaků podpisu útočník uhodl.
  v_nonce := extensions.gen_random_bytes(32);

  return extensions.hmac(convert_to(v_podpis, 'UTF8'), v_nonce, 'sha256')
       = extensions.hmac(convert_to(v_ocekavan, 'UTF8'), v_nonce, 'sha256');

exception
  when others then
    -- cokoli nečekaného = neověřeno; nikdy neprojde omylem
    return false;
end;
$$;

comment on function private.overit_ares_token(text, text, text) is
  'Ověří podpis z /api/ares. Selhání jakéhokoli druhu vrací false (fail closed).';

-- Jistota, že se ke klíči nedostane nikdo přes veřejné API.
revoke all on schema private from anon, authenticated, public;
revoke all on all tables in schema private from anon, authenticated, public;
revoke all on all functions in schema private from anon, authenticated, public;
