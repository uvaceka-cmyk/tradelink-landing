-- =========================================================
-- TradeLink — zkušební doba pro firmy: dva měsíce
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 016-bezpecne-odkazy.sql.
--
-- Proč to je:
--
-- Web ve `faq.html` slibuje firmám dva měsíce zdarma, ale trigger
-- zakládající profil dosud plnil `trial_ends_at` třemi měsíci
-- (naposledy v 012-budouci-spravci.sql). Dokud se neúčtuje, dostávaly
-- firmy víc, než web slibuje — až se začne účtovat, byl by to rozpor
-- mezi tím, co je napsané, a tím, co dělá databáze.
--
-- Mění se jedno jediné místo: `interval '3 months'` → `interval '2 months'`.
-- Zbytek funkce je doslova stejný jako v 012 (jednorázové schránky,
-- povinné a ověřené IČO u firem, práva správce).
--
-- Účtů, které už vznikly, se to nedotýká — kdo dostal tři měsíce,
-- o ně nepřijde. Zkracovat zkušební dobu zpětně by bylo nefér a u nikoho,
-- kdo se rozhodoval podle webu, i právně sporné.
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, private
as $$
declare
  acc       text := coalesce(new.raw_user_meta_data ->> 'account_type', 'osoba');
  v_ico     text := nullif(trim(new.raw_user_meta_data ->> 'ico'), '');
  v_nazev   text := nullif(trim(new.raw_user_meta_data ->> 'ares_nazev'), '');
  v_token   text := new.raw_user_meta_data ->> 'ares_token';
  v_domena  text := lower(split_part(coalesce(new.email, ''), '@', 2));
  v_overeno boolean := false;
  v_spravce boolean := false;
begin
  if exists (select 1 from private.blokovane_domeny where domena = v_domena) then
    raise exception 'Jednorázové e-mailové schránky nepřijímáme. Použijte prosím svůj běžný e-mail.'
      using errcode = 'check_violation';
  end if;

  if acc = 'firma' then
    if v_ico is null or v_nazev is null then
      raise exception 'Firemní účet vyžaduje ověřené IČO.'
        using errcode = 'check_violation';
    end if;

    v_overeno := private.overit_ares_token(v_token, v_ico, v_nazev);

    if not v_overeno then
      raise exception 'Ověření firmy v registru ARES neproběhlo nebo mu vypršela platnost.'
        using errcode = 'check_violation';
    end if;
  end if;

  select exists (
    select 1 from private.budouci_spravci b where lower(b.email) = lower(new.email)
  ) into v_spravce;

  insert into public.profiles (
    id, email, account_type, entry_role, full_name,
    company_name, ico, ares_nazev, ares_sidlo, ares_overeno_at, trial_ends_at, spravce
  )
  values (
    new.id,
    new.email,
    acc,
    new.raw_user_meta_data ->> 'role',
    new.raw_user_meta_data ->> 'full_name',
    case when v_overeno then v_nazev end,
    v_ico,
    case when v_overeno then v_nazev end,
    case when v_overeno then new.raw_user_meta_data ->> 'ares_sidlo' end,
    case when v_overeno then now() end,
    case when acc = 'firma' then now() + interval '2 months' end,
    v_spravce
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

comment on column public.profiles.trial_ends_at is
  'Konec zkušební doby firmy: dva měsíce od registrace (od 10. 9. 2026; dřív tři). Na webu se nezobrazuje, ceny jsou jen ve faq.html.';
