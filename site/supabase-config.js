/* =========================================================
   Připojení k Supabase.

   Obě hodnoty jsou veřejné — anon klíč je určený do prohlížeče
   a sám o sobě nic neodemyká; data chrání pravidla RLS
   nastavená v databázi (viz supabase/schema.sql).

   NIKDY sem nedávej service_role klíč. Ten patří jen na server.

   Kde je vzít: Supabase → projekt → Project Settings → API
   ========================================================= */
window.TRADELINK_SUPABASE = {
  url: '',
  anonKey: ''
};
