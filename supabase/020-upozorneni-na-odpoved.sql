-- =========================================================
-- TradeLink — e-mail zadavateli, když někdo odpoví
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 019-zobrazeni-a-kontakt.sql.
--
-- Proč to je:
--
-- Odpovědi se zadavateli ukazovaly jen po přihlášení. Kdo se nepřihlásil,
-- o odpovědi se nedozvěděl — a člověk, který ji napsal, mezitím našel
-- práci jinde. Pro web, který má lidi propojovat, je to ta nejdražší
-- chybějící věc.
--
-- Posílá se přes Resend, kterým už chodí ostatní pošta z domény.
-- Volá se přímo z databáze rozšířením pg_net, takže není potřeba
-- nasazovat žádnou funkci navíc.
--
-- KLÍČ K RESENDU SE DO REPOZITÁŘE NEZAPISUJE. Vloží se jednou ručně:
--   insert into private.app_secrets (klic, hodnota)
--   values ('resend_api_key', 're_...')
--   on conflict (klic) do update set hodnota = excluded.hodnota;
-- =========================================================

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------
-- Kdo si upozornění nepřeje, vypne si je.
-- ---------------------------------------------------------
alter table public.profiles
  add column if not exists upozorneni boolean not null default true;

comment on column public.profiles.upozorneni is
  'Posílat e-mail, když na můj inzerát někdo odpoví. Vypnutelné v účtu.';

-- ---------------------------------------------------------
-- Odeslání e-mailu.
--
-- Běží v privátním schématu a s právy vlastníka — klíč k Resendu
-- se tak nedostane nikomu, kdo si sáhne na veřejné API.
--
-- Odesílá se bez čekání na odpověď: kdyby Resend zlobil, nesmí kvůli
-- tomu spadnout zápis odpovědi. Odpověď je důležitější než e-mail o ní.
-- ---------------------------------------------------------
create or replace function private.poslat_email(
  p_komu    text,
  p_predmet text,
  p_html    text
)
returns void
language plpgsql
security definer
set search_path = private, extensions, public
as $$
declare
  v_klic text;
begin
  select hodnota into v_klic from private.app_secrets where klic = 'resend_api_key';

  if v_klic is null or v_klic = '' then
    raise warning 'Resend: chybí klíč v private.app_secrets, e-mail se neodeslal.';
    return;
  end if;

  perform extensions.net.http_post(
    url     := 'https://api.resend.com/emails',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || v_klic,
                 'Content-Type', 'application/json'
               ),
    body    := jsonb_build_object(
                 'from', 'TradeLink <info@tradelink.cz>',
                 'to', jsonb_build_array(p_komu),
                 'subject', p_predmet,
                 'html', p_html
               )
  );
end;
$$;

revoke execute on function private.poslat_email(text, text, text) from anon, authenticated;

-- ---------------------------------------------------------
-- Spouštěč: nová odpověď → e-mail zadavateli.
--
-- Do e-mailu jde jen název inzerátu a začátek zprávy. Kontakt ani
-- profil odpovídajícího se neposílají — kdo chce víc, přihlásí se.
-- ---------------------------------------------------------
create or replace function public.upozornit_na_odpoved()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  v_nazev  text;
  v_komu   text;
  v_chce   boolean;
  v_uryvek text;
begin
  select i.nazev, p.email, p.upozorneni
    into v_nazev, v_komu, v_chce
    from public.inzeraty i
    join public.profiles p on p.id = i.autor
   where i.id = new.inzerat;

  if v_komu is null or coalesce(v_chce, true) = false then
    return new;
  end if;

  v_uryvek := left(regexp_replace(coalesce(new.zprava, ''), '\s+', ' ', 'g'), 300);

  perform private.poslat_email(
    v_komu,
    'Nová odpověď na váš inzerát — TradeLink',
    '<h2>Někdo odpověděl na váš inzerát</h2>' ||
    '<p><strong>' || replace(replace(coalesce(v_nazev, 'Váš inzerát'), '&', '&amp;'), '<', '&lt;') || '</strong></p>' ||
    '<p style="white-space:pre-wrap">' || replace(replace(v_uryvek, '&', '&amp;'), '<', '&lt;') || '…</p>' ||
    '<p><a href="https://tradelink.cz/moje-inzeraty">Přečíst celou odpověď</a></p>' ||
    '<p>Upozornění si vypnete ve svém účtu.</p>' ||
    '<p>TradeLink · <a href="https://tradelink.cz">tradelink.cz</a></p>'
  );

  return new;
exception when others then
  -- E-mail nesmí shodit uložení odpovědi.
  raise warning 'Upozornění na odpověď se neodeslalo: %', sqlerrm;
  return new;
end;
$$;

drop trigger if exists odpoved_po_zapisu on public.odpovedi;
create trigger odpoved_po_zapisu
  after insert on public.odpovedi
  for each row execute function public.upozornit_na_odpoved();
