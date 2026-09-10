# Soupis z průchodu webem

Systematická kontrola živého webu, 10. 9. 2026 (noc). Píšeme sem oba —
Claude i uživatel. Co se opraví, přesune se do „Vyřešeno" i s datem.

Značky: 🔴 vážné · 🟠 chyba, která zamrzí · 🟡 drobnost nebo otázka

---

## Otevřené

### 🟠 1. Vnitřní odkazy jdou přes přesměrování
Skoro všechny odkazy v HTML míří na `.html` (`recepce.html`, `faq.html`, …),
ale Cloudflare Pages je trvale přesměrovává na adresy bez přípony. Ověřeno:
15 různých odkazů vrací 308. Nic se nerozbije, ale každé kliknutí i každé
projití vyhledávačem stojí skok navíc.

**Návrh:** přepsat odkazy na `/recepce`, `/faq` atd. Chce to projít všechny
stránky naráz — a domluvit se s kamarádem, ať to nekoliduje.

### 🟡 2. Profil člověka žije na adrese `/firma/<id>`
Adresa i titulek prohlížečové verze říkají „firma", i když jde o člověka.
Funguje to, ale ve výsledcích hledání to působí zmateně.

**Návrh:** přidat `/profil/<id>` jako druhou cestu k témuž, nebo aspoň
sjednotit titulek. Vyžaduje i změnu odkazů a mapy webu.

### 🟡 3. `/lobby` je indexovatelná a je v mapě webu
Je to nepoužívaná legacy stránka, na kterou z webu nic nevede. Ve výsledcích
hledání by byla slepá ulička.

**Návrh:** dát jí `noindex` a vyřadit z mapy webu. Soubor nechat (uživatel
si to výslovně přál).

### 🟡 4. `/obory` má `noindex` — je to záměr?
Stránka s výběrem odvětví se neindexuje. Obsah dotahuje JavaScript, takže by
pro vyhledávač byla stejně skoro prázdná — ale je to místo, kde by mohly
vznikat stránky typu „elektrikáři Praha".

**Otázka na uživatele:** nechat, nebo do budoucna udělat serverem vykreslené
stránky pro kombinaci obor + kraj?

### 🟡 5. Ukázková data pořád na webu
`Ukázková stavební s.r.o.`, inzerát `Elektrikář na rekonstrukce bytů`
a poptávka `Nové rozvody v bytě 3+1`. Díky nim svítí čísla na homepage.
Smazat příkazem `delete from auth.users where email like '%@tradelink.test';`

---

## Vyřešeno

### 🔴 Telefon člověka se ukázal každému přihlášenému (10. 9.)
Migrace `019` přesunula kontakt z veřejného pohledu do funkce
`kontakt_firmy()`, ale ta nerozlišovala typ účtu. Dřív platilo, že telefon
je vidět **jen u firem** — u lidí ho tím pádem nově viděl každý přihlášený.
Opraveno: funkce vydá telefon jen u firemního účtu.

### 🟠 Profil člověka nabízel hodnocení (10. 9.)
Na profilu osoby se ukazovala celá sekce hodnocení včetně formuláře, ale
databáze hodnocení člověka odmítá („Hodnotit lze jen firmu"). Kdo by to
zkusil, dostal by chybu. Sekce i skóre se teď u lidí neukážou —
v prohlížečové i v serverem vykreslené verzi.

### 🔴 Přihlášenému se nevykreslila žádná stránka (10. 9.)
`supabase.rpc()` nemá `.catch()`; volání ho shazovalo uvnitř `paintNav`.
Opraveno druhým parametrem `.then()`.

### 🟠 Počítadlo zobrazení stálo na nule (10. 9.)
Dotaz Supabase se odesílá až při čekání na výsledek. Bez `.then()` se
nezavolal vůbec. Opraveno; zobrazení se počítá i na `/nabidka/<id>`.

---

## Co bylo prověřeno a je v pořádku

- **Všech 22 veřejných adres** vrací správný stav; soukromé stránky mají
  `noindex`, neexistující adresa vrací 404 s vlastní stránkou.
- **Žádný vnitřní odkaz nevede na chybu** (41 kontrolovaných).
- **Nepřihlášený vidí inzeráty** v přehledu, na detailu i přes obory;
  nikde ho to nenutí k registraci.
- **Filtry** `/nabidky?typ=prace` a `?typ=zakazka` vracejí správné položky,
  nesmyslná hodnota se ignoruje.
- **Formulář poptávky** validuje délky a vybírá ze všech šesti odvětví.
- **Mobil (390 px)**: homepage, nabídky, poptávka, FAQ, recepce ani
  registrace nepřetékají do stran.
- **Odpověď na inzerát** projde a **zadavateli dorazí e-mail** (ověřeno
  skutečnou zprávou).
- **Kontakt na firmu** je pro nepřihlášené skrytý i na serverem vykreslené
  stránce, tedy i při vypnutém JavaScriptu.
- **Karty na homepage** ukazují skutečná čísla a vedou na odpovídající výpis.
