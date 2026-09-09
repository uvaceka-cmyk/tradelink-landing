# Co vyřídit, než TradeLink pustíte veřejně

Seznam vychází z toho, co pro TradeLink platí jako pro **provozovatele platformy
s uživatelským obsahem** v České republice. Není to právní posudek — před ostrým
spuštěním by to měl vidět právník, zvlášť podmínky užití.

---

## 1. Doplnit údaje o provozovateli

V `site/podminky.html` a `site/soukromi.html` je **osm žlutě orámovaných míst**
(`class="todo"`): jméno nebo název provozovatele, IČO, sídlo, kontaktní e-mail
a datum účinnosti.

Bez nich web spustit nelze — správce osobních údajů musí být jmenovaný a údaje
o podnikateli musí být na webu uvedené.

## 2. Uzavřít smlouvy o zpracování osobních údajů

Data uživatelů zpracovávají za vás dvě firmy. S oběma musíte mít **smlouvu
o zpracování** (čl. 28 GDPR) — obě ji nabízejí jako standardní dokument
k odsouhlasení v nastavení účtu:

- **Supabase** — databáze a účty (Supabase → Organization → Legal / DPA)
- **Cloudflare** — provoz webu (Cloudflare → Manage Account → Configurations)

Bez nich zpracováváte údaje přes zpracovatele bez právního základu.

## 3. Založit záznamy o činnostech zpracování

Viz `pravni/zaznamy-o-zpracovani.md` — je připravený, stačí doplnit údaje
o provozovateli a datum. Nikam se neposílá, ale úřad si o něj může říct.

## 4. Zvážit, kdo bude vyřizovat žádosti

Žádost o výmaz, přístup k údajům nebo námitku musíte vyřídit **do měsíce**.
U dvou lidí to zvládnete, ale někdo to musí mít na starost a hlídat schránku
uvedenou v zásadách.

## 5. Připravit se na bezpečnostní incident

Únik osobních údajů se hlásí **Úřadu pro ochranu osobních údajů do 72 hodin**.
Mějte předem jasno, kdo to udělá a odkud vezme podklady (Supabase → Logs).

---

## Co už je hotové

| Povinnost | Kde |
|---|---|
| Zásady ochrany osobních údajů | `site/soukromi.html` |
| Podmínky užití | `site/podminky.html` |
| Souhlas se zpracováním při registraci | `site/registrace.html` |
| Informace o cookies (žádné analytické nepoužíváme) | `site/soukromi.html`, bod 7 |
| Sdělení, že hodnocení neověřujeme | `site/firma.html`, `podminky.html` bod 5 |
| Mechanismus nahlašování obsahu | `site/inzerat.html`, fronta na `site/sprava.html` |
| Odůvodnění, když obsah skryjeme | ukáže se autorovi v `site/moje-inzeraty.html` |
| Kontaktní místo pro uživatele i úřady | `podminky.html` bod 6 |
| Zrušení účtu a výmaz údajů svépomocí | `site/ucet.html` |

---

## Na co si dát pozor při dalším vývoji

**Nepřekročte hranici zprostředkování zaměstnání.** Dokud jen zveřejňujete nabídky,
povolení od MPSV nepotřebujete — zákon o zaměstnanosti z něj vyjímá zveřejňování
nabídek elektronickými médii, pokud neprobíhá přímá zprostředkovatelská činnost.
Jakmile byste ale začali vybírat uchazeče, doporučovat je zaměstnavatelům nebo je
spojovat napřímo, je to už zprostředkování a **bez povolení jde o přestupek**.

**Hodnocení firem jsou právně citlivá.** Zákon o ochraně spotřebitele po novele
vyžaduje uvést, zda a jak ověřujete, že recenze pochází od skutečného zákazníka.
My uvádíme pravdu — neověřujeme to. Kdybyste někdy napsali opak, hrozí pokuta až
4 % ročního obratu. Až budete mít v systému záznam o proběhlé spolupráci, dá se
zavést odznak „ověřená zkušenost" — do té doby ne.

**Placené účty přinesou další povinnosti.** Jakmile začnete firmám účtovat:
obchodní podmínky pro placenou službu, informace o ceně před objednáním, doklady,
DPH podle obratu a u spotřebitelů právo odstoupit do 14 dnů.

**Obchodní sdělení jen se souhlasem.** Newsletter ani nabídky nesmíte rozesílat
bez souhlasu příjemce; zákon o službách informační společnosti to zakazuje
a pokutuje.
