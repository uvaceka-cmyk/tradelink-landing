-- =========================================================
-- TradeLink — co po nás chce právo
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 012-budouci-spravci.sql.
--
-- Dvě věci, které dosud chyběly:
--
-- 1) Odůvodnění zásahu do obsahu (nařízení DSA)
--    Když poskytovatel omezí nebo odstraní obsah uživatele, musí
--    mu sdělit důvod. Dosud se inzerát prostě skryl a autor se
--    nedozvěděl nic.
--
-- 2) Zrušení účtu na vlastní žádost (GDPR, právo na výmaz)
--    Dosud šlo požádat jen e-mailem. Nově si to člověk udělá sám
--    a odejdou s ním i jeho inzeráty, odpovědi a hodnocení.
-- =========================================================

alter table public.inzeraty
  add column if not exists skryto_duvod text,
  add column if not exists skryto_at    timestamptz;

alter table public.hodnoceni
  add column if not exists skryto_duvod text,
  add column if not exists skryto_at    timestamptz;

comment on column public.inzeraty.skryto_duvod is
  'Proč správce inzerát skryl. Autor to musí vidět — vyžaduje DSA.';

-- ---------------------------------------------------------
-- Rozhodnutí správce nově zaznamená i důvod
-- ---------------------------------------------------------
create or replace function public.vyridit_nahlaseni(p_id uuid, p_skryt boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  n       public.nahlaseni%rowtype;
  v_duvod text;
begin
  if not public.jsem_spravce() then
    raise exception 'Jen pro správce.' using errcode = 'insufficient_privilege';
  end if;

  select * into n from public.nahlaseni where id = p_id;
  if not found then
    raise exception 'Hlášení nenalezeno.';
  end if;

  -- srozumitelný důvod pro autora obsahu
  v_duvod := case n.duvod
    when 'podvod'              then 'Obsah vypadal jako podvodný.'
    when 'neexistujici-firma'  then 'Firma za inzerátem se nepodařila ověřit.'
    when 'urazlivy-obsah'      then 'Obsah byl urážlivý.'
    when 'nesouvisi-s-oborem'  then 'Obsah nesouvisel se zvoleným oborem.'
    when 'diskriminace'        then 'Podmínky byly diskriminační.'
    when 'spam'                then 'Šlo o nevyžádané sdělení nebo reklamu.'
    else 'Obsah porušoval podmínky užití.'
  end;

  if n.typ = 'inzerat' then
    update public.inzeraty
       set zverejnen   = not p_skryt,
           skryto_duvod = case when p_skryt then v_duvod end,
           skryto_at    = case when p_skryt then now() end
     where id = n.cil;

  elsif n.typ = 'hodnoceni' then
    update public.hodnoceni
       set skryte       = p_skryt,
           skryto_duvod = case when p_skryt then v_duvod end,
           skryto_at    = case when p_skryt then now() end
     where id = n.cil;

  elsif n.typ = 'profil' then
    update public.profiles set zverejnen = not p_skryt where id = n.cil;
  end if;

  update public.nahlaseni
     set vyrizeno = true,
         vysledek = case when p_skryt then 'skryto' else 'ponechano' end
   where typ = n.typ and cil = n.cil and vyrizeno = false;
end;
$$;

-- Automatické skrytí po třech hlášeních taky uvede důvod.
create or replace function public.nahlaseni_po_zapisu()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  pocet integer;
  MEZ   constant integer := 3;
  ZPRAVA constant text :=
    'Obsah byl dočasně skrytý poté, co ho několik lidí nezávisle nahlásilo. Prověříme ho.';
begin
  select count(distinct coalesce(autor::text, id::text)) into pocet
    from public.nahlaseni
   where typ = new.typ and cil = new.cil and vyrizeno = false;

  if pocet >= MEZ then
    if new.typ = 'inzerat' then
      update public.inzeraty
         set zverejnen = false, skryto_duvod = ZPRAVA, skryto_at = now()
       where id = new.cil;
    elsif new.typ = 'hodnoceni' then
      update public.hodnoceni
         set skryte = true, skryto_duvod = ZPRAVA, skryto_at = now()
       where id = new.cil;
    elsif new.typ = 'profil' then
      update public.profiles set zverejnen = false where id = new.cil;
    end if;
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------
-- Zrušení účtu na vlastní žádost
--
-- Maže se účet přihlášeného, nikoho jiného — funkce si bere id
-- z přihlášení, nikoli z parametru, takže cizí účet zrušit nejde.
-- Profil a všechno navázané odejde díky vazbám s ním.
-- ---------------------------------------------------------
create or replace function public.zrusit_muj_ucet()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  ja uuid := auth.uid();
begin
  if ja is null then
    raise exception 'Nejste přihlášeni.' using errcode = 'insufficient_privilege';
  end if;

  delete from public.profiles where id = ja;
  delete from auth.users where id = ja;
end;
$$;

revoke all on function public.zrusit_muj_ucet() from public;
grant execute on function public.zrusit_muj_ucet() to authenticated;

comment on function public.zrusit_muj_ucet() is
  'Právo na výmaz podle GDPR. Ruší účet přihlášeného včetně profilu, inzerátů, odpovědí a hodnocení.';
