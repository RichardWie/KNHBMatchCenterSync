# KNHB Match Center → Google Agenda

Een Google Apps Script dat de wedstrijden van één of meer hockeyteams van een club uit het [KNHB Match Center](https://www.knhb.nl/match-center) haalt en automatisch bijhoudt in Google Agenda, per team in een eigen agenda (of samen in één) die je met het hele gezin of team kunt delen.

- Per wedstrijd een agenda-item, met tegenstander, locatie, veld en (na afloop) de uitslag.
- **Meerdere teams van dezelfde club** in één script, elk met een eigen agenda, eigen teamlabel in de titels en desgewenst eigen instellingen en meldingen.
- Een **los item voor de warming-up** en, als de wedstrijd niet op een thuislocatie is, een **los item voor de reistijd** (berekend met Google Maps vanaf het clubadres of je eigen adres). Optioneel ook de terugreis.
- **Zaal-3luik of toernooi**: speelt een team meerdere wedstrijden kort na elkaar op dezelfde locatie, dan komen reistijd en warming-up alleen bij de eerste wedstrijd en de terugreis na de laatste.
- **Aanvangstijd nog onbekend?** Dan staat de wedstrijd als hele-dag-item in de agenda. Zodra de tijd bekend is, wordt het item omgezet en krijg je een mail.
- **Afgelast?** Het item wordt grijs met "AFGELAST" in de titel; warming-up en reistijd verdwijnen en je krijgt een mail.
- Een bericht bij wijzigingen via **e-mail** (rechtstreeks in je inbox), **Telegram**, **WhatsApp**, **ntfy** (pushmelding) of een **webhook** (Discord, Slack, Google Chat). Per kanaal kies je welke soorten meldingen je wilt.
- Herinneringen (pop-ups) op de agenda-items aan of uit.
- Alles is in te stellen in een eigen bestand **`Config.gs`** (makkelijk te delen en blijft staan bij updates) of via **Scripteigenschappen**; aan `Code.gs` hoef je niets te veranderen.

> [!WARNING]
> **Onofficieel.** Dit project gebruikt de API achter de Match Center-webapp (`app.hockeyweerelt.nl`). Die API is niet publiek gedocumenteerd en kan zonder aankondiging veranderen, waardoor het script kan stoppen met werken. Het project is niet gelieerd aan de KNHB of Hockeyweerelt. Synchroniseer met mate; de standaard is eens per 6 uur.

---

## Inhoud

- [Installatie](#installatie)
- [Instellingen](#instellingen)
- [Titels aanpassen](#titels-aanpassen)
- [Meldingen](#meldingen)
- [Herinneringen](#herinneringen)
- [Meerdere teams](#meerdere-teams)
- [Wisselen van club, team of agenda](#wisselen-van-club-team-of-agenda)
- [Hulpfuncties](#hulpfuncties)
- [Problemen oplossen](#problemen-oplossen)
- [Installeren met clasp](#installeren-met-clasp-optioneel)

---

## Installatie

Je hebt alleen een Google-account nodig.

### 1. Project aanmaken

1. Ga naar [script.google.com](https://script.google.com) en klik op **Nieuw project**.
2. Geef het project een naam, bijvoorbeeld *Hockey agenda*.
3. Vervang de inhoud van `Code.gs` door de inhoud van [`src/Code.gs`](src/Code.gs).
4. Klik links naast **Bestanden** op **+** → **Script**, noem het `Config` en vervang de inhoud door [`src/Config.gs`](src/Config.gs).

### 2. Manifest instellen

1. Klik links op het tandwiel (**Projectinstellingen**).
2. Vink **"appsscript.json"-manifestbestand weergeven in editor** aan.
3. Open `appsscript.json` in de editor en vervang de inhoud door [`src/appsscript.json`](src/appsscript.json). Sla op.

Dit zet de tijdzone op `Europe/Amsterdam` en noemt precies welke rechten het script nodig heeft.

### 3. Club invullen en toestemming geven

1. Zoek je club op in het Match Center. De clubcode is de code van letters en cijfers in de URL van de clubpagina (bijvoorbeeld `HH11AN5`). Vul die in `Config.gs` in bij `CLUB_CODE` en sla op.
2. Kies bovenin de functie **`checkPermissions`** en klik op **Uitvoeren**.
3. Google vraagt om toestemming. Omdat het je eigen script is, zie je de melding *"Google heeft deze app niet geverifieerd"*. Klik op **Geavanceerd** → **Ga naar Hockey agenda (onveilig)** → **Toestaan**.

   Het script vraagt alleen de rechten uit `appsscript.json`: je agenda beheren, externe verzoeken (Match Center, Telegram en dergelijke), e-mail versturen, triggers beheren, je e-mailadres zien en berichten **in** je mailbox zetten (`gmail.insert`). Het script kan je mail niet lezen of verwijderen.
4. In het logboek moet bij elk recht `OK` staan.

### 4. Team kiezen

1. Voer de functie **`listClubTeams`** uit. In het **Uitvoeringslogboek** staat per team een regel zoals:

   ```
   TEAM_ID=1975  recent_poule=12345  Jongens O11-1  [field]
   ```

2. Vul het nummer in `Config.gs` in bij `TEAM_ID` en sla op. Meerdere teams: zie [Meerdere teams](#meerdere-teams); onder de teamlijst zet `listClubTeams` een kant-en-klaar `TEAMS`-blok in het logboek.
3. Optioneel: pas andere instellingen aan in `Config.gs` (haal de `//` weg) en stel een of meer [meldingskanalen](#meldingen) in.
4. Voer **`showConfig`** uit om te controleren wat er gebruikt wordt.

`TEAM_LABEL`, `CALENDAR_NAME` en `TRAVEL_ORIGIN` worden bij de eerste run per team automatisch ingevuld als je ze leeg laat.

### 5. Eerste synchronisatie

1. Voer **`syncHockey`** uit.
2. In Google Agenda verschijnt een nieuwe agenda, standaard *Hockey &lt;clubnaam&gt;*, met de wedstrijden.
3. De eerste run stuurt nog geen meldingen, anders krijg je alle wedstrijden als "nieuw".

### 6. Automatisch laten draaien

Voer **`installTrigger`** uit. Het script draait daarna automatisch elke `SYNC_INTERVAL_HOURS` uur (standaard 6). Met `removeTrigger` zet je dat weer uit.

### 7. Agenda delen

Open in Google Agenda de instellingen van de nieuwe agenda → **Delen met specifieke personen** en voeg gezinsleden of teamgenoten toe met het recht *Alle gegevens van afspraken bekijken*.

---

## Instellingen

### Waar zet je instellingen?

Er zijn twee plekken. Je mag ze combineren.

**1. Het bestand `Config.gs` (aanbevolen).**
Een apart bestand in je project met alle instellingen, elk met een korte uitleg. Een regel met `//` ervoor doet niets: dan geldt de standaardwaarde die erachter staat. Haal de `//` weg en pas de waarde aan om een instelling te gebruiken. Voordelen:

- geen limiet op het aantal instellingen;
- het blijft staan als je `Code.gs` bijwerkt naar een nieuwe versie;
- je kunt het delen met andere ouders of teams; zij vullen alleen hun eigen `CLUB_CODE` en `TEAM_ID` in.

Waarden mogen als tekst (`'inbox'`), getal (`30`), ja/nee (`true`) of lijst (`[90, 1440]`).

**2. Scripteigenschappen** (Projectinstellingen → Scripteigenschappen).
Handig voor **geheimen** die je niet in een gedeeld bestand wilt hebben (`TELEGRAM_BOT_TOKEN`, `WHATSAPP_RECIPIENTS`, `NTFY_TOPIC`, `NTFY_TOKEN`, `WEBHOOK_URL`) en om snel iets te overschrijven zonder de code te openen.

- **Wijzigen**: klik op **Scripteigenschappen bewerken**, pas de waarde aan en klik op **Scripteigenschappen opslaan**.
- **Toevoegen**: klik in de bewerkmodus op **Scripteigenschap toevoegen** en typ de naam precies zoals in de tabellen hieronder.
- **Verwijderen**: prullenbak, of maak de waarde leeg.

De editor toont maximaal **50** scripteigenschappen; daarboven kun je niets meer bewerken. Gebruik ze dus spaarzaam. `tidyConfig` ruimt alles op wat leeg is of hetzelfde als `Config.gs` of de standaard.

**Voorrang**: scripteigenschap → `Config.gs` → automatisch ingevuld → standaard. Wat hoger staat, wint.

> [!IMPORTANT]
> **Na het aanpassen van `Config.gs`: draai `updateConfig`.** Die controleert het bestand (onbekende namen, ongeldige waarden) en verwijdert scripteigenschappen die een waarde uit `Config.gs` zouden overschrijven. In het logboek staat welke dat waren en wat hun oude waarde was. Daarna geldt wat in `Config.gs` staat. Zonder `updateConfig` wordt `Config.gs` ook gelezen, maar dan kan een oude scripteigenschap ervoor gaan; `showConfig` waarschuwt daarvoor.

> [!TIP]
> **Al ingesteld via scripteigenschappen?** Voer **`exportConfig`** uit. Die schrijft een compleet `Config.gs` met je huidige instellingen naar het logboek (geheimen laat hij weg). Kopieer dat naar `Config.gs`, sla op en draai `updateConfig`.

Pas `Code.gs` zelf niet aan: `DEFAULTS` daarin bevat alleen de standaardwaarden en wordt bij een update overschreven.

### Controleren met showConfig

Draai na elke wijziging **`showConfig`**. Per instelling zie je:

- de waarde die het script **echt gebruikt**;
- waar die vandaan komt: `[scripteigenschap]`, `[Config.gs]`, `[automatisch]` of `[standaard]`;
- `(ingevuld: "…")` als je iets hebt ingevuld dat niet als geldige waarde werd herkend;
- `(code: …)` als de waarde afwijkt van de standaard;
- per e-mailadres of de melding in je inbox komt of gewoon wordt verstuurd.

Bovenaan staan regels die beginnen met `LET OP:` als er iets mis is: een onbekende of verkeerd gespelde instelling (met een suggestie), een ongeldige waarde, een vreemd e-mailadres of een scripteigenschap die `Config.gs` overschrijft. Kleine slordigheden worden zelf opgelost: een spatie of kleine letters in de naam en aanhalingstekens rond de waarde.

Ja/nee-velden accepteren `true`/`false` (ook `ja`/`nee`, `aan`/`uit`).

### Verplicht

| Instelling | Standaard | Uitleg |
|---|---|---|
| `CLUB_CODE` | | Clubcode uit het Match Center. |
| `TEAM_ID` | | Team-ID; vind je met `listClubTeams`. Meerdere teams zonder eigen instellingen: komma-gescheiden, `1975, 2001`. |
| `TEAMS` | *(leeg)* | Meerdere teams, elk met eigen instellingen. Zie [Meerdere teams](#meerdere-teams). |

### Team en competitie

| Instelling | Standaard | Uitleg |
|---|---|---|
| `POULE_ID` | *(leeg)* | Leeg = alle poules van het team (najaar, voorjaar, beker). Vul een ID in om je tot één poule te beperken. |
| `TEAM_LABEL` | *(automatisch)* | Korte teamnaam voor in de titels, bijvoorbeeld `JO11-1`. |
| `INCLUDE_PLAYED` | `true` | Ook al gespeelde wedstrijden importeren. |

### Agenda

| Instelling | Standaard | Uitleg |
|---|---|---|
| `CALENDAR_NAME` | *(automatisch)* | Naam van de agenda. Bestaat die nog niet, dan wordt hij aangemaakt. Mag `{club}`, `{label}` (teamlabel) en `{team}` (volledige teamnaam) bevatten, bijv. `Hockey {label}`. Automatisch: *Hockey &lt;club&gt;* bij één team, *Hockey &lt;club&gt; &lt;label&gt;* bij meerdere. |
| `TIMEZONE` | `Europe/Amsterdam` | Tijdzone voor tijden en hele-dag-items. Houd gelijk aan `appsscript.json`. |
| `MATCH_MINUTES` | `80` | Duur van een veldwedstrijd (4×17,5 min spelen + pauzes ≈ 80). |
| `MATCH_MINUTES_INDOOR` | `50` | Duur van een zaalwedstrijd. Zaalwedstrijden worden herkend aan de poule of het veldtype; controleer met `dumpTeamMatches` (kolom `zaal=`). Klopt dat niet, zet dan `MATCH_MINUTES` per team in `TEAMS`. |
| `UNKNOWN_TIME_ALLDAY` | `true` | Wedstrijd met onbekende aanvangstijd als hele-dag-item. Bij `false` staat hij om 00:00. |

### Warming-up

| Instelling | Standaard | Uitleg |
|---|---|---|
| `WARMUP_MODE` | `separate` | `separate` = los item vóór de wedstrijd · `include` = wedstrijditem begint eerder · `off` = geen warming-up. |
| `WARMUP_MINUTES` | `45` | Hoe lang vóór de aanvang je aanwezig moet zijn. |

### Reistijd

| Instelling | Standaard | Uitleg |
|---|---|---|
| `TRAVEL_MODE` | `separate` | `separate` = los item · `include` = het eerste item (warming-up of wedstrijd) begint eerder · `off` = geen reistijd. |
| `TRAVEL_WHEN` | `location` | Wanneer er reistijd bij komt: `location` = als de wedstrijd niet op een thuislocatie is (ook bij een "thuiswedstrijd" elders, zoals in de zaal) · `away` = alleen bij uitwedstrijden (oude werking) · `always` = altijd. |
| `HOME_LOCATIONS` | *(leeg)* | Extra thuislocaties, bijvoorbeeld je eigen sporthal: `Sporthal Oost; De Veldhuis`. Gescheiden door `;`. Een deel van de naam of het adres is genoeg. |
| `HOME_MAX_MINUTES` | `3` | Een locatie binnen zoveel minuten rijden van de club telt ook als thuis. `0` = uit. |
| `TRAVEL_ORIGIN` | *(automatisch)* | Vertrekadres. Automatisch het adres van je club. Vul je eigen adres in als je van huis vertrekt. Draai daarna `resetTravelCache`. |
| `TRAVEL_BUFFER_MINUTES` | `0` | Extra marge bovenop de rijtijd (parkeren, verzamelen). |
| `TRAVEL_ROUND_MINUTES` | `5` | Rijtijd naar boven afronden op een veelvoud hiervan. `0` of `1` = niet afronden. |
| `RETURN_TRAVEL` | `false` | Ook een item voor de terugreis. |
| `RETURN_DELAY_MINUTES` | `30` | Hoe lang na het einde van de (laatste) wedstrijd de terugreis begint. |

De rijtijd komt uit Google Maps (gemiddelde rijtijd, geen live verkeer) en wordt per route bewaard, zodat Maps maar één keer per locatie wordt aangeroepen.

**Wat telt als thuislocatie?** Met `TRAVEL_WHEN = location` kijkt het script naar de locatie in het agenda-item, niet naar wie de thuisploeg is. Een locatie is thuis als:

1. hij overeenkomt met een naam of adres uit `HOME_LOCATIONS`; of
2. het adres of de postcode gelijk is aan die van je club; of
3. hij binnen `HOME_MAX_MINUTES` rijden van je club ligt.

In alle andere gevallen komt er reistijd bij. Met `dumpTeamMatches` zie je per wedstrijd wat het script besluit (kolom `thuislocatie=`). Krijgt een wedstrijd op je eigen sporthal toch reistijd, zet die sporthal dan in `HOME_LOCATIONS`.

### Meerdere wedstrijden achter elkaar (zaal-3luik, toernooi)

| Instelling | Standaard | Uitleg |
|---|---|---|
| `CLUSTER_GAP_MINUTES` | `120` | Wedstrijden van één team op dezelfde dag en dezelfde locatie, met hoogstens zoveel minuten tussen het einde van de ene en het begin van de volgende, vormen één blok. `0` = uit. |
| `CLUSTER_WARMUP` | `first` | `first` = warming-up alleen voor de eerste wedstrijd van het blok · `each` = voor elke wedstrijd. |

Voor een blok geldt:

- **reistijd** alleen vóór de eerste wedstrijd, en alleen als de locatie niet thuis is;
- **warming-up** alleen vóór de eerste wedstrijd (tenzij `CLUSTER_WARMUP = each`);
- **terugreis** alleen na de laatste wedstrijd;
- **herinnering** (met `REMINDER_TARGET = first`) alleen bij het eerste item van het blok;
- in de omschrijving van elke wedstrijd en van de reistijd staan alle wedstrijden van het blok.

Wordt de eerste wedstrijd afgelast, dan schuiven reistijd en warming-up automatisch door naar de volgende. Bij een toernooi met een lange pauze kun je `CLUSTER_GAP_MINUTES` hoger zetten (bijv. `240`), eventueel alleen voor dat team in `TEAMS`.

### Titels

| Instelling | Standaard |
|---|---|
| `TITLE_MATCH` | `{prefix}{cancelled}{home} - {away}{score}{tbd}` |
| `TITLE_WARMUP` | `{prefix}Warming-up {home} - {away}` |
| `TITLE_TRAVEL` | `{prefix}Reistijd naar {opponent}` |
| `TITLE_RETURN` | `{prefix}Terugreis van {opponent}` |
| `CANCELLED_TEXT` | `AFGELAST` |
| `TBD_TEXT` | `tijd n.n.b.` |

Zie [Titels aanpassen](#titels-aanpassen).

### Kleuren

| Instelling | Standaard | Uitleg |
|---|---|---|
| `COLOR_MATCH` | *(leeg)* | Kleur van het wedstrijditem. Leeg = kleur van de agenda. |
| `COLOR_WARMUP` | *(leeg)* | Kleur van de warming-up. |
| `COLOR_TRAVEL` | *(leeg)* | Kleur van heen- en terugreis. |
| `COLOR_CANCELLED` | `GRAY` | Kleur van afgelaste wedstrijden. |

Kleuren mogen als nummer `1`–`11` of als naam: `LAVENDER`, `SAGE`, `GRAPE`, `FLAMINGO`, `BANANA`, `TANGERINE`, `PEACOCK`, `GRAPHITE`, `BLUEBERRY`, `BASIL`, `TOMATO`, of in het Nederlands `PAARS`, `GEEL`, `ORANJE`, `GRIJS`, `BLAUW`, `GROEN`, `ROOD`.

### Herinneringen

| Instelling | Standaard | Uitleg |
|---|---|---|
| `REMINDERS` | `true` | `true` = eigen herinneringen · `false` = géén herinneringen (ook niet de standaardmeldingen van de agenda) · `default` = standaardmeldingen van de agenda. |
| `REMINDER_MINUTES` | `90` | Minuten vooraf. Meerdere mag: `90,1440` (anderhalf uur en een dag vooraf). |
| `REMINDER_TARGET` | `first` | `first` = alleen het eerste item (reistijd of warming-up) · `match` = alleen het wedstrijditem · `all` = elk item. |

### Meldingen

| Instelling | Standaard | Uitleg |
|---|---|---|
| `NOTIFY_TYPES` | `new,time,moved,cancelled,restored,location,changed,removed` | Welke meldingen je wilt, voor alle kanalen. Zie [Meldingen](#meldingen). |
| `NOTIFY_EMOJI` | `true` | Emoji vóór elke regel (❌ afgelast, 🕒 tijd bekend, 📅 verplaatst, …). |
| `NOTIFY_EMAIL` | *(leeg)* | E-mailadres(sen), komma-gescheiden. |
| `EMAIL_DELIVERY` | `auto` | `auto` = je eigen adres krijgt het bericht rechtstreeks in de inbox, andere adressen een gewone mail · `inbox` = idem · `send` = altijd gewoon versturen. |
| `TELEGRAM_BOT_TOKEN` | *(leeg)* | Token van je Telegram-bot. |
| `TELEGRAM_CHAT_ID` | *(leeg)* | Chat-ID('s), komma-gescheiden. Vind je met `telegramChatIds`. |
| `WHATSAPP_RECIPIENTS` | *(leeg)* | `telefoonnummer:apikey` van CallMeBot, komma-gescheiden. |
| `NTFY_TOPIC` | *(leeg)* | Naam van je ntfy-topic. |
| `NTFY_SERVER` | `https://ntfy.sh` | Alleen wijzigen bij een eigen ntfy-server. |
| `NTFY_TOKEN` | *(leeg)* | Toegangstoken, alleen voor een beveiligde server. |
| `WEBHOOK_URL` | *(leeg)* | Webhook van Discord, Slack, Google Chat of een eigen endpoint. |
| `EMAIL_TYPES`, `TELEGRAM_TYPES`, `WHATSAPP_TYPES`, `NTFY_TYPES`, `WEBHOOK_TYPES` | *(leeg)* | Afwijkende soorten per kanaal. Leeg = `NOTIFY_TYPES`. |

`showConfig` toont tokens, API-keys, het ntfy-topic en de webhook-URL verkort, zodat je het logboek kunt delen.

### Gedrag

| Instelling | Standaard | Uitleg |
|---|---|---|
| `PURGE_PREVIOUS_TEAM` | `true` | Bij een teamwissel de *toekomstige* items van het vorige team verwijderen. Verleden blijft altijd staan. |
| `CANCEL_KEYWORDS` | `afgelast,niet gespeeld,uitgesteld,gestaakt,cancelled,canceled,postponed` | Woorden in status of opmerking waaraan een afgelasting wordt herkend. |
| `SYNC_INTERVAL_HOURS` | `6` | Interval voor `installTrigger`: `1`, `2`, `4`, `6`, `8`, `12` of `24`. |

### Geavanceerd

| Instelling | Standaard | Uitleg |
|---|---|---|
| `API_BASE` | `https://app.hockeyweerelt.nl` | Adres van de Match Center-API. |
| `API_VERSION` | `7` | Versie die in de `X-HAPI-Version`-header wordt meegestuurd. |
| `DEVICE_UUID` | *(automatisch)* | Apparaat-ID waarmee het script zich bij de API aanmeldt. |

---

## Titels aanpassen

In de titelinstellingen kun je deze tokens gebruiken:

| Token | Voorbeeld | Betekenis |
|---|---|---|
| `{prefix}` | `JO11-1 \| ` | Teamlabel met scheidingsteken, of leeg als er geen label is. |
| `{label}` | `JO11-1` | Alleen het teamlabel. |
| `{home}` / `{away}` | `HC Test JO11-1` | Thuis- en uitploeg. |
| `{opponent}` | `Opp B JO11-2` | De tegenstander. |
| `{homeaway}` | `uit` | `thuis` of `uit`. |
| `{facility}` | `Sportpark Noord` | Naam van het sportpark. |
| `{kickoff}` | `10:30` | Aanvangstijd. |
| `{travel}` | `35` | Reistijd in minuten. |
| `{score}` | ` (3-2)` | Uitslag met haakjes, of leeg. |
| `{result}` | `3-2` | Uitslag zonder haakjes, of leeg. |
| `{cancelled}` | `AFGELAST: ` | `CANCELLED_TEXT` + dubbele punt bij een afgelasting, anders leeg. |
| `{tbd}` | ` (tijd n.n.b.)` | `TBD_TEXT` tussen haakjes als de tijd onbekend is, anders leeg. |

Voorbeelden:

- Zonder teamlabel: `TITLE_MATCH` = `{cancelled}{home} - {away}{score}{tbd}`
- Kort: `TITLE_MATCH` = `{prefix}{homeaway} vs {opponent}{score}` → `JO11-1 | uit vs Opp B`
- `TITLE_TRAVEL` = `🚗 {opponent} ({travel} min)`

---

## Meldingen

Het script meldt wijzigingen via één of meer kanalen. Een kanaal staat aan zodra de instellingen ervan zijn ingevuld. Met **`testNotify`** stuur je een testbericht naar alle ingestelde kanalen; in het logboek zie je per kanaal of het gelukt is.

### Welke meldingen

Kies in `NOTIFY_TYPES` (komma-gescheiden, of `all`):

| Type | Wanneer |
|---|---|
| `cancelled` | Een wedstrijd is afgelast. |
| `time` | De aanvangstijd (of datum) van een wedstrijd is bekend geworden. |
| `moved` | Een wedstrijd is naar een andere dag of tijd verplaatst. |
| `restored` | Een afgelaste wedstrijd staat weer gepland. |
| `location` | De locatie of het veld is gewijzigd. |
| `new` | Een nieuwe wedstrijd is toegevoegd. |
| `changed` | Iets anders in de titel is gewijzigd (bijv. een teamnaam). |
| `removed` | Een toekomstige wedstrijd staat niet meer in het Match Center. |
| `result` | Er is een uitslag bekend. Staat standaard uit. |

Per kanaal kun je afwijken. Een veelgebruikte combinatie: alles naar je eigen mail, alleen afgelastingen en tijden naar de oudergroep op Telegram:

```
NOTIFY_TYPES   = all
TELEGRAM_TYPES = cancelled,time,moved
```

Verder geldt:

- Je krijgt per run en per kanaal één bericht met alle wijzigingen. Afgelastingen en bekend geworden tijden staan bovenaan.
- Wijzigingen aan wedstrijden in het verleden worden niet gemeld, behalve `result`.
- Wijzigingen die door je eigen instellingen komen (andere warming-up, reistijd, titels of teamlabel) worden niet gemeld.
- Lukt één kanaal niet, dan gaan de andere gewoon door. De fout staat in het logboek.

### E-mail

Vul `NOTIFY_EMAIL` in. Gmail zet mail die je aan jezelf stuurt vaak alleen in **Verzonden**. Daarom zet het script een bericht voor je eigen adres rechtstreeks als **ongelezen bericht in je inbox**, in plaats van het te versturen. Dat werkt ook met varianten van je adres, zoals `naam+hockey@gmail.com`. Andere adressen krijgen een gewone mail.

Dit gebruikt de Gmail-dienst uit `appsscript.json`. Lukt het niet, dan valt het script terug op gewoon versturen en staat de reden in het logboek. Wil je het oude gedrag, zet dan `EMAIL_DELIVERY = send`.

> [!TIP]
> Wil je een melding op je telefoon? Maak in Gmail een filter op het onderwerp `Hockey` met *Altijd markeren als belangrijk*, en zet in de Gmail-app meldingen op *Alleen belangrijke*. Een echte pushmelding krijg je het betrouwbaarst met Telegram of ntfy.

### Telegram (aanbevolen voor pushmeldingen)

Gratis, betrouwbaar, en werkt ook in een groepsapp met andere ouders.

1. Open in Telegram een chat met **@BotFather** en stuur `/newbot`. Kies een naam en een gebruikersnaam (die moet eindigen op `bot`).
2. BotFather geeft een token zoals `123456789:AAH...`. Zet die in `TELEGRAM_BOT_TOKEN`.
3. Stuur je nieuwe bot een willekeurig bericht. Voor een groep: voeg de bot toe aan de groep en stuur daar `/start`.
4. Voer **`telegramChatIds`** uit. In het logboek staat per chat een regel zoals `TELEGRAM_CHAT_ID=-100123456789 (group) JO11 ouders`.
5. Zet het nummer in `TELEGRAM_CHAT_ID`. Meerdere chats mag, komma-gescheiden: `555123,-100123456789`.
6. Draai `testNotify`.

Groeps-ID's beginnen met een minteken; neem dat mee.

### WhatsApp

WhatsApp heeft geen gratis, officiële manier om vanuit een script berichten te sturen. De officiële WhatsApp Business API vraagt een Meta-bedrijfsaccount, een apart telefoonnummer en vooraf goedgekeurde berichtsjablonen. Daarom gebruikt het script **[CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/)**: een gratis dienst van derden waarmee je WhatsApp-berichten **naar jezelf** kunt sturen.

1. Volg de instructies op de CallMeBot-pagina: voeg hun nummer toe aan je contacten en stuur de activatiezin via WhatsApp. Je krijgt een API-key terug.
2. Zet in `WHATSAPP_RECIPIENTS`: `+31612345678:123456` (je nummer met landcode, dubbele punt, API-key).
3. Iemand anders laten meelezen? Die moet zelf ook een API-key aanvragen; voeg die toe met een komma: `+31612345678:123456,+31687654321:654321`.

Beperkingen: geen groepen, het bericht loopt via de server van CallMeBot, en de dienst kan traag zijn of tijdelijk niet werken. Voor een oudergroep is Telegram de betere keuze.

### ntfy (pushmelding zonder account)

[ntfy](https://ntfy.sh) stuurt pushmeldingen naar een app op je telefoon, zonder account.

1. Installeer de ntfy-app (Android of iOS).
2. Bedenk een lange, onvoorspelbare topicnaam, bijvoorbeeld `hockey-jo11-k7f3q9x2`. Iedereen die de naam kent kan meelezen; behandel hem als een wachtwoord.
3. Abonneer je in de app op dat topic en zet de naam in `NTFY_TOPIC`.

Afgelastingen, tijden en verplaatsingen krijgen een hogere prioriteit.

### Webhook (Discord, Slack, Google Chat)

Zet de webhook-URL van een kanaal in `WEBHOOK_URL`. Het script herkent Discord-, Slack- en Google Chat-adressen en stuurt het juiste formaat. Bij elk ander adres gaat er een JSON-bericht naartoe met `title`, `text`, `lines`, `urgent`, `calendar` en `link`, bijvoorbeeld voor Home Assistant, Zapier of Make.

---

## Herinneringen

Google Agenda zet op nieuwe items automatisch de standaardmeldingen van de agenda. Het script regelt dit per item:

- `REMINDERS = true`: alleen de tijden uit `REMINDER_MINUTES`, op het item uit `REMINDER_TARGET`. Met `first` krijg je de melding op het eerste item van de dag: de reistijd bij uitwedstrijden, anders de warming-up.
- `REMINDERS = false`: alle herinneringen worden van de items gehaald.
- `REMINDERS = default`: de standaardmeldingen van de agenda.

Afgelaste wedstrijden, wedstrijden zonder tijd en wedstrijden in het verleden krijgen nooit een herinnering. Wijzig je deze instelling, dan worden toekomstige items bij de volgende run aangepast.

> [!NOTE]
> Herinneringen gelden voor jouw eigen weergave van de agenda. Mensen met wie je de agenda deelt, stellen hun meldingen zelf in via de instellingen van de agenda in hun eigen Google Agenda.

---

## Meerdere teams

Eén script kan alle teams van één club bijhouden, bijvoorbeeld van al je kinderen. Elk team krijgt:

- zijn **eigen agenda** (standaard *Hockey &lt;club&gt; &lt;label&gt;*), tenzij je teams bewust dezelfde agenda geeft;
- zijn **eigen teamlabel** in de titels (`JO11-1 | …`), automatisch uit het Match Center of zelf ingesteld;
- desgewenst **eigen instellingen**: warming-up, reistijd, herinneringen, titels, kleuren en meldingen (bijv. elk team naar een andere Telegram-groep).

### Zonder eigen instellingen

Zet de team-ID's komma-gescheiden in `TEAM_ID`:

```js
TEAM_ID: '1975, 2001',
```

### Met eigen instellingen per team

Gebruik `TEAMS` in `Config.gs`. Alles wat je per team niet noemt, komt uit de rest van `Config.gs` (of uit Scripteigenschappen of de standaard):

```js
CLUB_CODE: 'HH11AN5',
NOTIFY_EMAIL: 'jij@gmail.com',             // geldt voor alle teams...
TEAMS: [
  { TEAM_ID: 1975, CALENDAR_NAME: 'Hockey Daan' },
  { TEAM_ID: 2001, CALENDAR_NAME: 'Hockey Eva', WARMUP_MINUTES: 30,
    NOTIFY_EMAIL: 'jij@gmail.com, partner@gmail.com',   // ...behalve hier
    TELEGRAM_CHAT_ID: '-100123456789' },               // oudergroep van dit team
],
```

`listClubTeams` zet onder de teamlijst een `TEAMS`-blok in het logboek dat je kunt kopiëren. Korte namen mogen ook: `ID`, `LABEL`, `CALENDAR` en `POULE`.

Per team in te stellen: alles behalve `CLUB_CODE`, `TIMEZONE`, `SYNC_INTERVAL_HOURS`, `TELEGRAM_BOT_TOKEN`, `NTFY_SERVER`, `NTFY_TOKEN` en de geavanceerde instellingen. `showConfig` meldt het als je iets per team zet wat niet kan, of een naam verkeerd spelt.

Werk je liever met Scripteigenschappen? `TEAMS` kan daar ook, als JSON op één regel: `[{"TEAM_ID":1975,"CALENDAR_NAME":"Hockey Daan"},{"TEAM_ID":2001}]`.

### Goed om te weten

- **Eén agenda voor alle teams** kan ook: geef ze dezelfde `CALENDAR_NAME`, bijvoorbeeld door `CALENDAR_NAME: 'Hockey {club}'` buiten `TEAMS` te zetten. Het teamlabel in de titel laat zien wiens wedstrijd het is.
- **Twee eigen teams tegen elkaar** (een onderlinge clubwedstrijd) komt bij beide teams in de agenda, elk met het eigen label en de eigen warming-up.
- **Meldingen** gaan per team: elk bericht noemt het team in het onderwerp (*Hockey JO11-1: afgelast*). Hebben teams dezelfde ontvanger, dan krijgt die per team een bericht.
- **Een team toevoegen** levert geen stortvloed aan "nieuw"-meldingen op: de eerste synchronisatie van een team is stil.
- `showConfig` toont per team het label, de agenda, eigen instellingen, meldingskanalen en de laatste synchronisatie.

---

## Wisselen van club, team of agenda

Pas `CLUB_CODE`, `TEAM_ID`/`TEAMS`, `POULE_ID` of `CALENDAR_NAME` aan; de volgende run regelt de rest.

- **Het verleden blijft onaangeroerd.** Items die al voorbij zijn worden nooit verwijderd, verschoven of hernoemd, ook niet als ze bij een vorig team, seizoen of andere agenda horen. Alleen een uitslag die later binnenkomt wordt nog aan het item toegevoegd.
- **Een team uit de lijst gehaald?** Dan worden de toekomstige items van dat team uit zijn agenda verwijderd (uit te zetten met `PURGE_PREVIOUS_TEAM = false`).
- **Andere agenda voor een team?** De toekomstige items verhuizen naar de nieuwe agenda; gespeelde wedstrijden blijven in de oude agenda staan en worden niet gekopieerd. Dit levert geen meldingen op.
- Bij een **andere club** worden automatisch ingevulde agendanamen en vertrekadressen opnieuw bepaald. Wil je in dezelfde agenda blijven, vul `CALENDAR_NAME` dan zelf in.

---

## Hulpfuncties

Kies de functie bovenin de editor en klik op **Uitvoeren**. De uitvoer staat in het **Uitvoeringslogboek**.

| Functie | Wat het doet |
|---|---|
| `syncHockey` | Synchroniseert de agenda. Deze functie draait via de trigger. |
| `showConfig` | Toont de instellingen die nu in gebruik zijn, waar ze vandaan komen en wat er mis is. |
| `updateConfig` | Na het aanpassen van `Config.gs`: controleert het bestand en verwijdert scripteigenschappen die het zouden overschrijven. |
| `exportConfig` | Schrijft een compleet `Config.gs` met je huidige instellingen naar het logboek (zonder geheimen). |
| `tidyConfig` | Verwijdert scripteigenschappen die leeg zijn of gelijk aan `Config.gs`/standaard. |
| `seedConfig` | Alleen zonder `Config.gs`: zet de tien meestgebruikte instellingen in Scripteigenschappen. |
| `checkPermissions` | Toont welke rechten het script heeft en welke ontbreken, en vraagt zo nodig opnieuw om toestemming. |
| `listClubTeams` | Toont alle teams van `CLUB_CODE` met hun `TEAM_ID`, plus een `TEAMS`-blok om te kopiëren. |
| `installTrigger` | Maakt (of vervangt) de automatische trigger. |
| `removeTrigger` | Verwijdert de automatische trigger. |
| `testNotify` | Stuurt een testbericht naar alle ingestelde meldingskanalen, per team (dezelfde ontvanger maar één keer). |
| `testEmail` | Stuurt alleen een testmail. |
| `telegramChatIds` | Toont de chats van je Telegram-bot met hun `TELEGRAM_CHAT_ID`. |
| `dumpTeamMatches` | Per team één regel per wedstrijd: datum, status, of het script hem als afgelast of gespeeld ziet. |
| `dumpOneMatch` | De volledige ruwe gegevens van één wedstrijd. |
| `resetTravelCache` | Vergeet de opgeslagen reistijden (na het wijzigen van `TRAVEL_ORIGIN`). |
| `resetDevice` | Meldt het script opnieuw aan bij de API (bij aanhoudende HTTP-fouten). |
| `removeFutureSyncedEvents` | Verwijdert alle toekomstige items van alle ingestelde teams. Het verleden blijft staan. |
| `removeAllSyncedEvents` | Verwijdert **alle** door het script gemaakte items uit de agenda's van alle teams, ook het verleden. |

---


## Problemen oplossen

**Geen mail bij een afgelasting.**
Voer `dumpTeamMatches` uit terwijl de afgelaste wedstrijd nog in het Match Center staat en kijk naar `status=` en `afgelast=`. Staat `afgelast=false`, kijk dan met `dumpOneMatch` welk veld of welke tekst de afgelasting aangeeft en voeg dat woord toe aan `CANCEL_KEYWORDS`. Verdwijnt een afgelaste wedstrijd helemaal uit het Match Center, dan krijg je een `removed`-melding.

**Geen melding bij een bekend geworden tijd.**
Controleer met `dumpTeamMatches` of de wedstrijd vóórdat de tijd bekend was als `tijd bekend=false` werd gezien. Controleer ook of `time` in `NOTIFY_TYPES` (of in `<KANAAL>_TYPES`) staat en of `testNotify` aankomt.

**Scripteigenschappen niet te bewerken, of je ziet er maar 50.**
Er staan te veel scripteigenschappen. Voer `showConfig` of `tidyConfig` uit (via **Uitvoeren** in de editor; dat werkt ook als de lijst alleen-lezen is). De lijst wordt dan opgeruimd tot de instellingen die je echt hebt gewijzigd. Vernieuw daarna de pagina Projectinstellingen.

**Een gewijzigde instelling wordt niet opgepikt.**
Voer `showConfig` uit en kijk naar de regels met `LET OP:` en naar de bron achter de instelling. Staat er `[standaard]`, dan wordt je instelling niet gevonden: controleer de naam, en in `Config.gs` of de `//` ervoor weg is. Staat er `[scripteigenschap]` terwijl je `Config.gs` hebt aangepast, draai dan `updateConfig`. Staat er `(ingevuld: "…")`, dan is de waarde niet geldig.

**`In inbox zetten mislukt` met *"Je hebt geen rechten om gmail.users.messages.insert te bellen"*.**
Het script heeft het recht `gmail.insert` niet; de mail is daarom gewoon verstuurd (en staat dan alleen in Verzonden). Oplossing:

1. Voer **`checkPermissions`** uit. Staat er `ONTBREEKT` bij `gmail.insert`, ga dan verder.
2. Projectinstellingen → vink **"appsscript.json"-manifestbestand weergeven in editor** aan.
3. Open `appsscript.json` en controleer of het blok `"oauthScopes"` de regel `"https://www.googleapis.com/auth/gmail.insert"` bevat en of onder `"enabledAdvancedServices"` de Gmail-dienst staat. Het makkelijkst: vervang de hele inhoud door [`src/appsscript.json`](src/appsscript.json). Sla op.
4. Voer `checkPermissions` opnieuw uit. Google vraagt nu om toestemming voor het nieuwe recht; klik op **Toestaan**. Daarna moet overal `OK` staan.
5. Verschijnt er geen toestemmingsscherm en blijft `gmail.insert` ontbreken? Ga naar [myaccount.google.com/permissions](https://myaccount.google.com/permissions), zoek je project (bijv. *Hockey agenda*), kies **Toegang verwijderen** en voer `checkPermissions` nog een keer uit.

**Mail staat alleen in Verzonden (zonder foutmelding).**
Controleer of `EMAIL_DELIVERY` op `auto` of `inbox` staat en of `NOTIFY_EMAIL` je eigen Google-adres is; `showConfig` toont per adres wat er gebeurt.

**Telegram: `chat not found` of `Forbidden`.**
De bot mag alleen berichten sturen naar chats waar hij eerst een bericht in heeft gezien. Stuur de bot (of de groep) een bericht en draai `telegramChatIds` opnieuw. Voor groepen moet het ID inclusief minteken worden ingevuld.

**Reistijd bij een wedstrijd op je eigen locatie (of juist niet bij een uitlocatie).**
Draai `dumpTeamMatches` en kijk naar `thuislocatie=`. Staat er `nee` bij je eigen sporthal of veld, zet de naam of het adres dan in `HOME_LOCATIONS`. Wil je de oude werking (alleen reistijd bij uitwedstrijden), zet dan `TRAVEL_WHEN = away`.

**De reistijd ontbreekt.**
De reistijd wordt alleen berekend voor wedstrijden met een bekende tijd en een adres, die niet op een thuislocatie zijn. In het logboek staat `Reistijd: geen route` als Google Maps het adres niet vond. Controleer `TRAVEL_ORIGIN`.

**`HTTP 401` of `HTTP 403` in het logboek.**
Voer `resetDevice` uit en daarna `syncHockey`. Blijft het, dan is de API mogelijk veranderd; controleer of er een nieuwere versie van dit script is of probeer een hogere `API_VERSION`.

**`Team ... niet gevonden bij club`.**
Controleer `CLUB_CODE` en draai `listClubTeams` voor de juiste `TEAM_ID`. Buiten het seizoen staan teams soms nog niet in het Match Center.

**Hele-dag-items staan op de verkeerde dag.**
Zorg dat `timeZone` in `appsscript.json` en `TIMEZONE` allebei `Europe/Amsterdam` zijn.

**Quota.**
Google beperkt het aantal Maps-aanvragen, mails en scriptminuten per dag. Met de reistijdcache en een interval van een paar uur blijf je daar ruim onder.

---

## Installeren met clasp (optioneel)

Voor wie liever vanuit de terminal werkt, met [clasp](https://github.com/google/clasp):

```bash
npm install -g @google/clasp
clasp login
git clone https://github.com/<gebruiker>/<repo>.git
cd <repo>
clasp create --type standalone --title "Hockey agenda" --rootDir src
git checkout -- src/appsscript.json   # clasp kan het manifest overschrijven
clasp push
clasp open
```

Ga daarna verder bij [stap 3](#3-instellingen-aanmaken). `.clasp.json` staat in `.gitignore`, omdat het je eigen script-ID bevat.

---

## Disclaimer

Dit is een hobbyproject zonder garantie. Het script leest alleen openbare wedstrijdgegevens en schrijft alleen naar je eigen Google Agenda. Je instellingen en de apparaat-aanmelding blijven in de eigenschappen van je eigen project.
