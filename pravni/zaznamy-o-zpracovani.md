# Záznamy o činnostech zpracování

Podle čl. 30 GDPR. Dokument se nikam neodesílá, ale Úřad pro ochranu osobních
údajů si ho může vyžádat. Aktualizujte ho, kdykoli přibude nový druh zpracování.

**Správce:** [DOPLNIT: jméno / název, IČO, sídlo]
**Kontakt:** [DOPLNIT: e-mail]
**Pověřenec:** nejmenován — zákon to v našem případě neukládá
**Poslední aktualizace:** [DOPLNIT: datum]

---

## 1. Uživatelské účty

| | |
|---|---|
| **Účel** | vedení účtu, přihlašování, obnova hesla |
| **Právní základ** | plnění smlouvy (čl. 6 odst. 1 písm. b) |
| **Subjekty údajů** | registrovaní uživatelé — lidé i kontaktní osoby firem |
| **Kategorie údajů** | e-mail, otisk hesla, jméno a příjmení, typ účtu, zvolená cesta z recepce |
| **Zpracovatelé** | Supabase (databáze a účty, EU – Frankfurt), Cloudflare (provoz webu) |
| **Doba uložení** | po dobu existence účtu; po zrušení se maže neprodleně |
| **Předání mimo EU** | data v EU; obě společnosti sídlí v USA, kryto standardními smluvními doložkami |

## 2. Ověření firmy podle IČO

| | |
|---|---|
| **Účel** | zabránit vzniku falešných firemních účtů |
| **Právní základ** | oprávněný zájem (čl. 6 odst. 1 písm. f) — ochrana uživatelů před podvodem |
| **Subjekty údajů** | firemní účty; u živnostníků jde o osobní údaje |
| **Kategorie údajů** | IČO, obchodní jméno a sídlo převzaté z registru ARES, čas ověření |
| **Zdroj** | veřejný registr ARES (Ministerstvo financí ČR) |
| **Doba uložení** | po dobu existence účtu |

## 3. Profily, inzeráty a poptávky

| | |
|---|---|
| **Účel** | zobrazení nabídky ostatním uživatelům |
| **Právní základ** | plnění smlouvy; zveřejnění nastává až úkonem uživatele |
| **Kategorie údajů** | popis činnosti, odvětví, lokalita, u firem web a telefon, texty inzerátů |
| **Příjemci** | veřejnost — obsah je po zveřejnění přístupný komukoli |
| **Doba uložení** | dokud uživatel obsah nesmaže nebo nezruší účet |

## 4. Odpovědi na inzeráty

| | |
|---|---|
| **Účel** | umožnit oslovení zadavatele |
| **Právní základ** | plnění smlouvy |
| **Kategorie údajů** | text zprávy, nepovinný kontakt, vazba na profil odesílatele |
| **Příjemci** | zadavatel inzerátu; nikdo jiný odpověď nevidí |
| **Doba uložení** | dokud existuje inzerát nebo účet odesílatele |

## 5. Hodnocení firem

| | |
|---|---|
| **Účel** | informovat ostatní o zkušenosti s firmou |
| **Právní základ** | oprávněný zájem na informovanosti uživatelů |
| **Kategorie údajů** | známka, text, vazba na autora; jméno autora se zobrazí jen má-li zveřejněný profil |
| **Doba uložení** | dokud autor hodnocení nesmaže nebo nezruší účet |

## 6. Nahlašování obsahu a kontrola

| | |
|---|---|
| **Účel** | odstranit podvodný nebo protiprávní obsah |
| **Právní základ** | oprávněný zájem; u některého obsahu právní povinnost |
| **Kategorie údajů** | důvod hlášení, poznámka, případně účet oznamovatele |
| **Doba uložení** | dva roky od vyřízení — kvůli doložitelnosti postupu |

## 7. Zpětná vazba na platformu

| | |
|---|---|
| **Účel** | zlepšování služby |
| **Právní základ** | oprávněný zájem |
| **Kategorie údajů** | text zprávy, nepovinný e-mail, stránka, ze které přišla |
| **Doba uložení** | do vyřízení, nejdéle dva roky |

## 8. Provozní záznamy

| | |
|---|---|
| **Účel** | zabezpečení, odhalování útoků, ladění chyb |
| **Právní základ** | oprávněný zájem |
| **Kategorie údajů** | IP adresa, čas požadavku, typ prohlížeče |
| **Zpracovatelé** | Supabase, Cloudflare — vedou je ve vlastní režii |
| **Doba uložení** | podle nastavení poskytovatelů, řádově týdny |

---

## Technická a organizační opatření

- veškerý provoz šifrovaně přes HTTPS
- hesla jen jako nevratný otisk, správce je nezná
- přístup k datům omezený pravidly na úrovni databáze — každý účet vidí a mění
  pouze své záznamy; ověřeno zkouškou z cizího účtu
- veřejné pohledy do databáze záměrně neobsahují e-maily
- klíč k podpisu ověření z ARES uložen mimo veřejné schéma i mimo repozitář
- jednorázové e-mailové schránky se při registraci odmítají
- data uložena v Evropské unii (Frankfurt nad Mohanem)
