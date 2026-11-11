/**
 * Config.gs: instellingen voor de hockey-agenda (KNHB Match Center -> Google Agenda).
 *
 * - Regels met // ervoor doen niets: dan geldt de standaardwaarde die erachter staat.
 *   Haal de // weg en pas de waarde aan om een instelling te gebruiken.
 * - Dit bestand blijft staan als je Code.gs bijwerkt naar een nieuwe versie.
 * - Scripteigenschappen (Projectinstellingen) winnen van dit bestand. Draai na het
 *   aanpassen updateConfig: die controleert het bestand en ruimt scripteigenschappen op
 *   die een waarde uit dit bestand zouden overschrijven. showConfig toont het resultaat.
 * - Ga je dit bestand delen? Zet geheimen (bot-token, API-keys, ntfy-topic, webhook)
 *   dan in Scripteigenschappen in plaats van hier.
 */
var SETTINGS = {

  // --- Verplicht --------------------------------------------------
  CLUB_CODE: '',                                   // clubcode uit de Match Center-URL, bijv. HH11AN5
  TEAM_ID: '',                                     // draai listClubTeams; meerdere teams met komma, of gebruik TEAMS

  // --- Meerdere teams van deze club ------------------------------
  // Eén team: vul hierboven TEAM_ID in. Meerdere teams zonder eigen instellingen kan ook daar:
  // TEAM_ID: '1975, 2001'. Wil je per team iets anders (eigen agenda, label, warming-up,
  // meldingen), gebruik dan TEAMS. Alles wat je per team niet noemt, komt uit de rest van dit
  // bestand. Niet per team: CLUB_CODE, TIMEZONE, SYNC_INTERVAL_HOURS, TELEGRAM_BOT_TOKEN,
  // NTFY_SERVER, NTFY_TOKEN en de geavanceerde instellingen. listClubTeams geeft alle team-ID's.
  // TEAMS: [
  //   { TEAM_ID: 1975, CALENDAR_NAME: 'Hockey Daan' },
  //   { TEAM_ID: 2001, CALENDAR_NAME: 'Hockey Eva', WARMUP_MINUTES: 30, TELEGRAM_CHAT_ID: '-100123' },
  // ],

  // --- Team en competitie -----------------------------------------
  // POULE_ID: '',                                 // leeg = alle poules van het team
  // TEAM_LABEL: '',                               // leeg = korte teamnaam (automatisch)
  // INCLUDE_PLAYED: true,                         // ook gespeelde wedstrijden importeren

  // --- Agenda -----------------------------------------------------
  // CALENDAR_NAME: '',                            // leeg = automatisch; mag {club}, {label} en {team} bevatten
  // TIMEZONE: 'Europe/Amsterdam',
  // MATCH_MINUTES: 80,                            // duur van het wedstrijditem
  // UNKNOWN_TIME_ALLDAY: true,                    // tijd n.n.b. -> hele-dag-item

  // --- Warming-up -------------------------------------------------
  // WARMUP_MODE: 'separate',                      // separate | include | off
  // WARMUP_MINUTES: 45,                           // zoveel minuten voor aanvang aanwezig

  // --- Reistijd (uitwedstrijden) ----------------------------------
  // TRAVEL_MODE: 'separate',                      // separate | include | off
  // TRAVEL_ORIGIN: '',                            // vertrekadres; leeg = clubadres (automatisch)
  // TRAVEL_BUFFER_MINUTES: 0,                     // extra marge op de rijtijd
  // TRAVEL_ROUND_MINUTES: 5,                      // rijtijd naar boven afronden op een veelvoud hiervan
  // RETURN_TRAVEL: false,                         // ook een item voor de terugreis
  // RETURN_DELAY_MINUTES: 30,                     // terugreis begint zo lang na de wedstrijd

  // --- Titels (tokens: zie README) --------------------------------
  // TITLE_MATCH: '{prefix}{cancelled}{home} - {away}{score}{tbd}',
  // TITLE_WARMUP: '{prefix}Warming-up {home} - {away}',
  // TITLE_TRAVEL: '{prefix}Reistijd naar {opponent}',
  // TITLE_RETURN: '{prefix}Terugreis van {opponent}',
  // CANCELLED_TEXT: 'AFGELAST',
  // TBD_TEXT: 'tijd n.n.b.',

  // --- Kleuren (leeg = kleur van de agenda; naam of 1-11) ---------
  // COLOR_MATCH: '',
  // COLOR_WARMUP: '',
  // COLOR_TRAVEL: '',
  // COLOR_CANCELLED: 'GRAY',

  // --- Herinneringen op agenda-items ------------------------------
  // REMINDERS: true,                              // true | false | default
  // REMINDER_MINUTES: 90,                         // minuten vooraf; meerdere met komma, bijv. 90,1440
  // REMINDER_TARGET: 'first',                     // first | match | all

  // --- Meldingen --------------------------------------------------
  // NOTIFY_TYPES: 'new,time,moved,cancelled,restored,location,changed,removed', // cancelled,time,moved,restored,location,new,changed,removed,result of all
  // NOTIFY_EMOJI: true,                           // emoji voor elke regel
  // NOTIFY_EMAIL: '',                             // een of meer adressen, komma-gescheiden
  // EMAIL_DELIVERY: 'auto',                       // auto | inbox | send
  // EMAIL_TYPES: '',                              // leeg = NOTIFY_TYPES

  // --- Telegram ---------------------------------------------------
  // TELEGRAM_BOT_TOKEN: '',                       // van @BotFather
  // TELEGRAM_CHAT_ID: '',                         // draai telegramChatIds; meerdere met komma
  // TELEGRAM_TYPES: '',                           // leeg = NOTIFY_TYPES

  // --- WhatsApp (via CallMeBot) -----------------------------------
  // WHATSAPP_RECIPIENTS: '',                      // +31612345678:apikey, meerdere met komma
  // WHATSAPP_TYPES: '',                           // leeg = NOTIFY_TYPES

  // --- ntfy -------------------------------------------------------
  // NTFY_TOPIC: '',                               // lange, onvoorspelbare naam
  // NTFY_SERVER: 'https://ntfy.sh',
  // NTFY_TOKEN: '',                               // alleen voor een beveiligde server
  // NTFY_TYPES: '',                               // leeg = NOTIFY_TYPES

  // --- Webhook (Discord, Slack, Google Chat, eigen endpoint) ------
  // WEBHOOK_URL: '',
  // WEBHOOK_TYPES: '',                            // leeg = NOTIFY_TYPES

  // --- Gedrag -----------------------------------------------------
  // PURGE_PREVIOUS_TEAM: true,                    // bij teamwissel de toekomstige items van het vorige team verwijderen
  // CANCEL_KEYWORDS: 'afgelast,niet gespeeld,uitgesteld,gestaakt,cancelled,canceled,postponed', // woorden die een afgelasting aangeven
  // SYNC_INTERVAL_HOURS: 6,                       // 1, 2, 4, 6, 8, 12 of 24 (voor installTrigger)

  // --- Geavanceerd ------------------------------------------------
  // API_BASE: 'https://app.hockeyweerelt.nl',
  // API_VERSION: 7,
  // DEVICE_UUID: '',                              // leeg = automatisch
};
