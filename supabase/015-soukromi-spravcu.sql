-- =========================================================
-- TradeLink — soukromí správců
--
-- Kam to patří: Supabase → SQL Editor → New query → Run.
-- Navazuje na 014-uklid-dat.sql.
--
-- Proč to je:
--
-- Repozitář je veřejný. V `012-budouci-spravci.sql` byla natvrdo
-- napsaná soukromá e-mailová adresa provozovatele — kdokoli si ji
-- mohl přečíst na GitHubu. Provoz platformy má běžet přes firemní
-- adresu `info@tradelink.cz`, ne přes soukromou schránku.
--
-- Tenhle soubor proto ze seznamu budoucích správců soukromé adresy
-- odebírá. Účty, které správcem už jsou, se nemění — práva se berou
-- jen tomu, kdo se ještě nezaregistroval.
--
-- POZOR: odstranění z tohohle souboru ani z databáze nesmaže adresu
-- z historie gitu. Tam zůstává v commitu, který ji přidal.
-- =========================================================

-- Firemní adresa musí v seznamu být — na ni si provozovatel účet zakládá.
insert into private.budouci_spravci (email) values
  ('info@tradelink.cz')
on conflict (email) do nothing;

-- Všechno ostatní ze seznamu pryč: čekající práva správce má mít
-- jen firemní adresa.
delete from private.budouci_spravci
 where lower(email) <> 'info@tradelink.cz';

comment on table private.budouci_spravci is
  'Adresy, které se po registraci samy stanou správcem. Patří sem jen firemní adresy — soubor je ve veřejném repozitáři.';
