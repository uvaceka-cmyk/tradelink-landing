/* =========================================================
   /api/statistiky — čísla na homepage
   =========================================================
   Karty na homepage měly čísla napevno v HTML (124 pracovníků,
   38 poptávek, 21 firem). Na webu, který staví na ověřenosti, je
   vymyšlené číslo drobná lež — a první, na čem člověk přistihne,
   že se mu tu lže.

   Tahle funkce je proto počítá ze skutečných dat. Odpověď se drží
   v mezipaměti půl hodiny: čísla se nemění po vteřinách a nemá smysl
   sahat kvůli nim do databáze při každém načtení homepage.

   Vrací i `zadna: true`, když je všechno na nule — homepage podle
   toho karty schová. Nula vedle nuly vypadá hůř než nic.
   ========================================================= */

const SUPABASE_URL = 'https://hgjajfkaotflkmyrryak.supabase.co';
const SUPABASE_KEY = 'sb_publishable_uAKMzAdb_30eR7VJd39v5Q_bi8wwyY0';

const HLAVICKY = {
  apikey: SUPABASE_KEY,
  Authorization: 'Bearer ' + SUPABASE_KEY
};

/* PostgREST umí vrátit počet v hlavičce Content-Range, takže se
   nemusí tahat řádky, které stejně nikoho nezajímají. */
async function pocet(dotaz) {
  try {
    const res = await fetch(SUPABASE_URL + '/rest/v1/' + dotaz + '&select=id&limit=1', {
      headers: Object.assign({ Prefer: 'count=exact' }, HLAVICKY)
    });
    if (!res.ok) return 0;
    const rozsah = res.headers.get('content-range') || '';
    const celkem = Number(rozsah.split('/')[1]);
    return Number.isFinite(celkem) ? celkem : 0;
  } catch (e) {
    return 0;
  }
}

async function firmyKtereNabiraji() {
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/verejne_inzeraty?typ=eq.prace&select=autor_id&limit=1000',
      { headers: HLAVICKY }
    );
    if (!res.ok) return 0;
    const data = await res.json();
    return new Set(data.map(i => i.autor_id)).size;
  } catch (e) {
    return 0;
  }
}

async function posledniInzerat() {
  try {
    const res = await fetch(
      SUPABASE_URL + '/rest/v1/verejne_inzeraty?select=created_at&order=created_at.desc&limit=1',
      { headers: HLAVICKY }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.length ? data[0].created_at : null;
  } catch (e) {
    return null;
  }
}

export async function onRequestGet() {
  const [lide, poptavky, firmy, posledni] = await Promise.all([
    pocet('verejne_profily?account_type=eq.osoba'),
    pocet('verejne_inzeraty?typ=eq.zakazka'),
    firmyKtereNabiraji(),
    posledniInzerat()
  ]);

  const telo = {
    lide,
    poptavky,
    firmy,
    posledni,
    zadna: lide === 0 && poptavky === 0 && firmy === 0
  };

  return new Response(JSON.stringify(telo), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      /* Půl hodiny. Kdo nechá homepage otevřenou dýl, dotáhne si
         čerstvá čísla sám — homepage.js se ptá ve stejném rytmu. */
      'Cache-Control': 'public, max-age=1800'
    }
  });
}
