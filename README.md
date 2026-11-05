# KNHB Match Center → Google Agenda

Een Google Apps Script dat de wedstrijden van één hockeyteam uit het [KNHB Match Center](https://www.knhb.nl/match-center) haalt en automatisch bijhoudt in een Google Agenda die je met het hele gezin of team kunt delen.

- Per wedstrijd een agenda-item, met tegenstander, locatie, veld en (na afloop) de uitslag.
- Een **los item voor de warming-up** en, bij uitwedstrijden, een **los item voor de reistijd** (berekend met Google Maps vanaf het clubadres of je eigen adres). Optioneel ook de terugreis.
- **Aanvangstijd nog onbekend?** Dan staat de wedstrijd als hele-dag-item in de agenda. Zodra de tijd bekend is, wordt het item omgezet en krijg je een mail.
- **Afgelast?** Het item wordt grijs met "AFGELAST" in de titel; warming-up en reistijd verdwijnen en je krijgt een mail.
- Een bericht bij wijzigingen via **e-mail** (rechtstreeks in je inbox), **Telegram**, **WhatsApp**, **ntfy** (pushmelding) of een **webhook** (Discord, Slack, Google Chat). Per kanaal kies je welke soorten meldingen je wilt.
- Herinneringen (pop-ups) op de agenda-items aan of uit.
- Alles is in te stellen via **Scripteigenschappen**; je hoeft de code niet aan te passen.

> [!WARNING]
> **Onofficieel.** Dit project gebruikt de API achter de Match Center-webapp (`app.hockeyweerelt.nl`). Die API is niet publiek gedocumenteerd en kan zonder aankondiging veranderen, waardoor het script kan stoppen met werken. Het project is niet gelieerd aan de KNHB of Hockeyweerelt. Synchroniseer met mate; de standaard is eens per 6 uur.

---

## Inhoud

- [Installatie](#installatie)
- [Instellingen](#instellingen)
- [Titels aanpassen](#titels-aanpassen)
- [Meldingen](#meldingen)
- [Herinneringen](#herinneringen)
- [Wisselen van club, team of poule](#wisselen-van-club-team-of-poule)
- [Meerdere teams](#meerdere-teams)
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

### 2. Manifest instellen

1. Klik links op het tandwiel (**Projectinstellingen**).
2. Vink **"appsscript.json"-manifestbestand weergeven in editor** aan.
3. Open `appsscript.json` in de editor en vervang de inhoud door [`src/appsscript.json`](src/appsscript.json).

Dit zet de tijdzone op `Europe/Amsterdam`, wat nodig is om hele-dag-items op de juiste dag te krijgen.

### 3. Instellingen aanmaken

1. Kies bovenin de functie **`seedConfig`** en klik op **Uitvoeren**.
2. Google vraagt om toestemming. Omdat het je eigen script is, zie je de melding *"Google heeft deze app niet geverifieerd"*. Klik op **Geavanceerd** → **Ga naar Hockey agenda (onveilig)** → **Toestaan**.

   Het script vraagt alleen de rechten uit `appsscript.json`: je agenda beheren, externe verzoeken (Match Center, Telegram en dergelijke), e-mail versturen, triggers beheren, je e-mailadres zien en berichten **in** je mailbox zetten (`gmail.insert`). Het script kan je mail niet lezen of verwijderen.
3. Alle instellingen staan nu onder **Projectinstellingen → Scripteigenschappen**.

### 4. Club en team invullen

1. **`CLUB_CODE`**: zoek je club op in het Match Center. De clubcode is de code van letters en cijfers in de URL van de clubpagina (bijvoorbeeld `HH11AN5`). Vul die in bij `CLUB_CODE`.
2. **`TEAM_ID`**: voer de functie **`listClubTeams`** uit. In het **Uitvoeringslogboek** staat per team een regel zoals:

   ```
   TEAM_ID=1975  recent_poule=12345  Jongens O11-1  [field]
   ```

   Vul het juiste nummer in bij `TEAM_ID`.
3. Optioneel: stel een of meer [meldingskanalen](#meldingen) in.

De rest mag leeg blijven. Bij de eerste run worden `TEAM_LABEL`, `CALENDAR_NAME` en `TRAVEL_ORIGIN` automatisch ingevuld.

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

Alle instellingen staan onder **Projectinstellingen → Scripteigenschappen**. Een leeg veld betekent: gebruik de standaardwaarde (of vul automatisch in). Wijzigingen gelden vanaf de volgende run. Met **`showConfig`** zie je wat er op dit moment in gebruik is.

Ja/nee-velden accepteren `true`/`false` (ook `ja`/`nee`, `aan`/`uit`).

### Verplicht

| Instelling | Standaard | Uitleg |
|---|---|---|
| `CLUB_CODE` | | Clubcode uit het Match Center. |
| `TEAM_ID` | | Team-ID; vind je met `listClubTeams`. |

### Team en competitie

| Instelling | Standaard | Uitleg |
|---|---|---|
| `POULE_ID` | *(leeg)* | Leeg = alle poules van het team (najaar, voorjaar, beker). Vul een ID in om je tot één poule te beperken. |
| `TEAM_LABEL` | *(automatisch)* | Korte teamnaam voor in de titels, bijvoorbeeld `JO11-1`. |
| `INCLUDE_PLAYED` | `true` | Ook al gespeelde wedstrijden importeren. |

### Agenda

| Instelling | Standaard | Uitleg |
|---|---|---|
| `CALENDAR_NAME` | *(automatisch)* | Naam van de agenda. Bestaat die nog niet, dan wordt hij aangemaakt. Automatisch: *Hockey &lt;clubnaam&gt;*. |
| `TIMEZONE` | `Europe/Amsterdam` | Tijdzone voor tijden en hele-dag-items. Houd gelijk aan `appsscript.json`. |
| `MATCH_MINUTES` | `80` | Duur van het wedstrijditem (4×17,5 min spelen + pauzes ≈ 80). |
| `UNKNOWN_TIME_ALLDAY` | `true` | Wedstrijd met onbekende aanvangstijd als hele-dag-item. Bij `false` staat hij om 00:00. |

### Warming-up

| Instelling | Standaard | Uitleg |
|---|---|---|
| `WARMUP_MODE` | `separate` | `separate` = los item vóór de wedstrijd · `include` = wedstrijditem begint eerder · `off` = geen warming-up. |
| `WARMUP_MINUTES` | `45` | Hoe lang vóór de aanvang je aanwezig moet zijn. |

### Reistijd (alleen uitwedstrijden)

| Instelling | Standaard | Uitleg |
|---|---|---|
| `TRAVEL_MODE` | `separate` | `separate` = los item · `include` = het eerste item (warming-up of wedstrijd) begint eerder · `off` = geen reistijd. |
| `TRAVEL_ORIGIN` | *(automatisch)* | Vertrekadres. Automatisch het adres van je club. Vul je eigen adres in als je van huis vertrekt. Draai daarna `resetTravelCache`. |
| `TRAVEL_BUFFER_MINUTES` | `0` | Extra marge bovenop de rijtijd (parkeren, verzamelen). |
| `TRAVEL_ROUND_MINUTES` | `5` | Rijtijd naar boven afronden op een veelvoud hiervan. `0` of `1` = niet afronden. |
| `RETURN_TRAVEL` | `false` | Ook een item voor de terugreis. |
| `RETURN_DELAY_MINUTES` | `30` | Hoe lang na het einde van de wedstrijd de terugreis begint. |

De rijtijd komt uit Google Maps (gemiddelde rijtijd, geen live verkeer) en wordt per route bewaard, zodat Maps maar één keer per tegenstander wordt aangeroepen.

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

## Wisselen van club, team of poule

Pas `CLUB_CODE`, `TEAM_ID` of `POULE_ID` aan; de volgende run regelt de rest.

- **Het verleden blijft onaangeroerd.** Items die al voorbij zijn worden nooit verwijderd, verschoven of hernoemd, ook niet als ze bij een vorig team of seizoen horen. Alleen een uitslag die later binnenkomt wordt nog aan het item toegevoegd.
- **Toekomstige items van het vorige team** worden verwijderd (uit te zetten met `PURGE_PREVIOUS_TEAM = false`).
- Was `TEAM_LABEL` automatisch ingevuld, dan wordt het opnieuw bepaald voor het nieuwe team.
- Bij een **andere club** worden een automatisch ingevulde `CALENDAR_NAME` en `TRAVEL_ORIGIN` opnieuw bepaald. Er komt dan dus een nieuwe agenda *Hockey &lt;nieuwe club&gt;*; de oude agenda met de historie blijft bestaan. Wil je in dezelfde agenda blijven, vul `CALENDAR_NAME` dan zelf in.

---

## Meerdere teams

Elk scriptproject volgt één team. Voor meerdere teams (bijvoorbeeld twee kinderen) maak je per team een kopie van het project (**Overzicht → Kopie maken**), elk met een eigen `TEAM_ID` en trigger.

De kopieën mogen dezelfde agenda gebruiken: elk script beheert alleen de items met zijn eigen `TEAM_ID`. Geef ze wel verschillende `TEAM_LABEL`s, zodat je in de agenda ziet welk item bij wie hoort.

---

## Hulpfuncties

Kies de functie bovenin de editor en klik op **Uitvoeren**. De uitvoer staat in het **Uitvoeringslogboek**.

| Functie | Wat het doet |
|---|---|
| `syncHockey` | Synchroniseert de agenda. Deze functie draait via de trigger. |
| `seedConfig` | Zet ontbrekende instellingen in Scripteigenschappen en toont ze. |
| `showConfig` | Toont de instellingen die nu in gebruik zijn. |
| `listClubTeams` | Toont alle teams van `CLUB_CODE` met hun `TEAM_ID`. |
| `installTrigger` | Maakt (of vervangt) de automatische trigger. |
| `removeTrigger` | Verwijdert de automatische trigger. |
| `testNotify` | Stuurt een testbericht naar alle ingestelde meldingskanalen. |
| `testEmail` | Stuurt alleen een testmail. |
| `telegramChatIds` | Toont de chats van je Telegram-bot met hun `TELEGRAM_CHAT_ID`. |
| `dumpTeamMatches` | Eén regel per wedstrijd: datum, status, of het script hem als afgelast of gespeeld ziet. |
| `dumpOneMatch` | De volledige ruwe gegevens van één wedstrijd. |
| `resetTravelCache` | Vergeet de opgeslagen reistijden (na het wijzigen van `TRAVEL_ORIGIN`). |
| `resetDevice` | Meldt het script opnieuw aan bij de API (bij aanhoudende HTTP-fouten). |
| `removeFutureSyncedEvents` | Verwijdert alle toekomstige items van dit team. Het verleden blijft staan. |
| `removeAllSyncedEvents` | Verwijdert **alle** door het script gemaakte items van **alle** teams, ook het verleden. |

---

## Problemen oplossen

**Geen mail bij een afgelasting.**
Voer `dumpTeamMatches` uit terwijl de afgelaste wedstrijd nog in het Match Center staat en kijk naar `status=` en `afgelast=`. Staat `afgelast=false`, kijk dan met `dumpOneMatch` welk veld of welke tekst de afgelasting aangeeft en voeg dat woord toe aan `CANCEL_KEYWORDS`. Verdwijnt een afgelaste wedstrijd helemaal uit het Match Center, dan krijg je een `removed`-melding.

**Geen melding bij een bekend geworden tijd.**
Controleer met `dumpTeamMatches` of de wedstrijd vóórdat de tijd bekend was als `tijd bekend=false` werd gezien. Controleer ook of `time` in `NOTIFY_TYPES` (of in `<KANAAL>_TYPES`) staat en of `testNotify` aankomt.

**Mail staat alleen in Verzonden.**
Controleer of `EMAIL_DELIVERY` op `auto` staat en of het logboek `In inbox gezet` toont. Staat er `In inbox zetten mislukt`, controleer dan of `appsscript.json` de Gmail-dienst en de scope `gmail.insert` bevat, en voer één functie handmatig uit om de nieuwe rechten te geven.

**Telegram: `chat not found` of `Forbidden`.**
De bot mag alleen berichten sturen naar chats waar hij eerst een bericht in heeft gezien. Stuur de bot (of de groep) een bericht en draai `telegramChatIds` opnieuw. Voor groepen moet het ID inclusief minteken worden ingevuld.

**De reistijd ontbreekt.**
De reistijd wordt alleen berekend voor uitwedstrijden met een bekende tijd en een adres van de tegenstander. In het logboek staat `Reistijd: geen route` als Google Maps het adres niet vond. Controleer `TRAVEL_ORIGIN`.

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

Dit is een hobbyproject zonder garantie. Het script leest alleen openbare wedstrijdgegevens en schrijft alleen naar je eigen Google Agenda. Je instellingen en de apparaat-aanmelding blijven in de Scripteigenschappen van je eigen project.
