/* =========================================================
   TradeLink — číselník odvětví a podoborů

   Jediný zdroj pravdy. Používá ho výběr oboru (app.js)
   i formulář profilu. Rozšiřuje se tady, ne jinde.

   id se ukládá do databáze, takže ho u existujícího odvětví
   neměňte — rozešlo by se to s uloženými profily.
   ========================================================= */
window.TRADELINK_OBORY = [
  {
    id: 'stavebnictvi', name: 'Stavebnictví',
    desc: 'Stavby, řemesla, rekonstrukce',
    subs: ['Zednictví a obklady', 'Elektroinstalace', 'Instalatérství a topení', 'Truhlářství a interiéry', 'Střechy a izolace', 'Zemní a výkopové práce', 'Malířství a podlahy']
  },
  {
    id: 'vyroba', name: 'Výroba',
    desc: 'Strojírenství, montáž, kvalita',
    subs: ['Strojírenská výroba', 'Svařování', 'CNC obrábění', 'Montážní práce', 'Kontrola kvality', 'Údržba strojů']
  },
  {
    id: 'logistika', name: 'Logistika',
    desc: 'Doprava, sklady, spedice',
    subs: ['Řidiči nákladních vozidel', 'Skladové provozy', 'Vychystávání a expedice', 'Spedice a doprava', 'Kurýrní a rozvozové služby']
  },
  {
    id: 'gastro', name: 'Gastro a hotelnictví',
    desc: 'Kuchyně, obsluha, ubytování',
    subs: ['Kuchyně', 'Obsluha a servis', 'Bar a kavárna', 'Housekeeping a úklid', 'Hotelová recepce', 'Catering a akce']
  },
  {
    id: 'administrativa', name: 'Administrativa, obchod a služby',
    desc: 'Kancelář, prodej, podpora',
    subs: ['Účetnictví a mzdy', 'HR a nábor', 'Asistence a back office', 'Obchod a prodej', 'Zákaznická podpora', 'Marketing a komunikace']
  },
  {
    id: 'it', name: 'IT a technologie',
    desc: 'Vývoj, data, infrastruktura',
    subs: ['Vývoj softwaru', 'Správa sítí a IT podpora', 'Data a analytika', 'Kybernetická bezpečnost', 'Design a UX', 'Projektové řízení']
  }
];
