/**
 * KNHB Match Center -> Google Calendar
 *
 * Imports the matches of one hockey team from the KNHB Match Center
 * (app.hockeyweerelt.nl) into a Google Calendar and keeps them up to date:
 * separate warm-up and travel items, kickoff times that become known,
 * cancellations, and an e-mail when something changes.
 *
 * Unofficial: this talks to the (undocumented) API behind the Match Center
 * web app. It can break when that API changes.
 *
 * All settings live in Script Properties (Project Settings -> Script
 * properties). Run seedConfig once to create them. See README.md.
 */

var VERSION = '6.1.0';

/* ================================================================== *
 * DEFAULTS  (do not edit here: override them in Script Properties)
 * ================================================================== */

var DEFAULTS = {
  // --- Required ------------------------------------------------------
  CLUB_CODE:             '',          // club code, e.g. from the Match Center URL
  TEAM_ID:               '',          // run listClubTeams to find it

  // --- Team & competition --------------------------------------------
  POULE_ID:              '',          // blank = all poules of the team
  TEAM_LABEL:            '',          // blank = team's short name
  INCLUDE_PLAYED:        'true',      // also import matches already played

  // --- Calendar ------------------------------------------------------
  CALENDAR_NAME:         '',          // blank = "Hockey <club>"
  TIMEZONE:              'Europe/Amsterdam',
  MATCH_MINUTES:         '80',        // length of the match item
  UNKNOWN_TIME_ALLDAY:   'true',      // kickoff "n.n.b." -> all-day item

  // --- Warm-up -------------------------------------------------------
  WARMUP_MODE:           'separate',  // separate | include | off
  WARMUP_MINUTES:        '45',

  // --- Travel (away games) -------------------------------------------
  TRAVEL_MODE:           'separate',  // separate | include | off
  TRAVEL_ORIGIN:         '',          // blank = club address
  TRAVEL_BUFFER_MINUTES: '0',         // extra margin on top of the driving time
  TRAVEL_ROUND_MINUTES:  '5',         // round travel time up to a multiple of this
  RETURN_TRAVEL:         'false',     // also add a return-trip item
  RETURN_DELAY_MINUTES:  '30',        // return trip starts this long after the match

  // --- Titles (see README for the {tokens}) --------------------------
  TITLE_MATCH:           '{prefix}{cancelled}{home} - {away}{score}{tbd}',
  TITLE_WARMUP:          '{prefix}Warming-up {home} - {away}',
  TITLE_TRAVEL:          '{prefix}Reistijd naar {opponent}',
  TITLE_RETURN:          '{prefix}Terugreis van {opponent}',
  CANCELLED_TEXT:        'AFGELAST',
  TBD_TEXT:              'tijd n.n.b.',

  // --- Colours (blank = calendar colour; name or 1-11) --------------
  COLOR_MATCH:           '',
  COLOR_WARMUP:          '',
  COLOR_TRAVEL:          '',
  COLOR_CANCELLED:       'GRAY',

  // --- Reminders on calendar items -----------------------------------
  REMINDERS:             'true',      // true | false | default (calendar's own)
  REMINDER_MINUTES:      '90',        // one or more, comma-separated
  REMINDER_TARGET:       'first',     // first | match | all

  // --- Notifications on changes (see README: "Meldingen") ------------
  NOTIFY_TYPES:          'new,time,moved,cancelled,restored,location,changed,removed',
  NOTIFY_EMOJI:          'true',      // emoji in front of each line

  NOTIFY_EMAIL:          '',          // one or more addresses, comma-separated
  EMAIL_DELIVERY:        'auto',      // auto | inbox | send  (auto: own address -> straight into inbox)
  EMAIL_TYPES:           '',          // blank = NOTIFY_TYPES

  TELEGRAM_BOT_TOKEN:    '',          // from @BotFather
  TELEGRAM_CHAT_ID:      '',          // one or more, comma-separated (run telegramChatIds)
  TELEGRAM_TYPES:        '',

  WHATSAPP_RECIPIENTS:   '',          // CallMeBot: +31612345678:apikey, comma-separated
  WHATSAPP_TYPES:        '',

  NTFY_TOPIC:            '',          // ntfy.sh push app
  NTFY_SERVER:           'https://ntfy.sh',
  NTFY_TOKEN:            '',          // only for a protected/self-hosted server
  NTFY_TYPES:            '',

  WEBHOOK_URL:           '',          // Discord, Slack, Google Chat or any JSON endpoint
  WEBHOOK_TYPES:         '',

  // --- Behaviour ----------------------------------------------------
  PURGE_PREVIOUS_TEAM:   'true',      // on team switch: drop the old team's FUTURE items
  CANCEL_KEYWORDS:       'afgelast,niet gespeeld,uitgesteld,gestaakt,cancelled,canceled,postponed',
  SYNC_INTERVAL_HOURS:   '6',         // used by installTrigger: 1,2,4,6,8,12,24

  // --- Advanced -----------------------------------------------------
  API_BASE:              'https://app.hockeyweerelt.nl',
  API_VERSION:           '7',
  DEVICE_UUID:           '',          // blank = auto-register a device
};

var CONFIG_KEYS = Object.keys(DEFAULTS);
var LEGACY_KEYS = { EMAIL_ON_CHANGE: 'NOTIFY_EMAIL', CLUB_ADDRESS: 'TRAVEL_ORIGIN' };

var NOTIFY_ORDER  = ['cancelled', 'time', 'moved', 'restored', 'location', 'new', 'changed', 'removed', 'result'];
var NOTIFY_LABELS = {
  'cancelled': 'afgelast', 'time': 'tijd bekend', 'moved': 'verplaatst', 'restored': 'weer ingepland',
  'location': 'locatie gewijzigd', 'new': 'nieuw', 'changed': 'gewijzigd', 'removed': 'verwijderd',
  'result': 'uitslag',
};

var NOTIFY_EMOJIS = {
  'cancelled': '\u274C', 'time': '\uD83D\uDD52', 'moved': '\uD83D\uDCC5', 'restored': '\u2705',
  'location': '\uD83D\uDCCD', 'new': '\uD83C\uDD95', 'changed': '\u270F\uFE0F', 'removed': '\uD83D\uDDD1\uFE0F',
  'result': '\uD83C\uDFD1',
};
var CHANNELS = ['EMAIL', 'TELEGRAM', 'WHATSAPP', 'NTFY', 'WEBHOOK'];
var SECRET_KEYS = ['TELEGRAM_BOT_TOKEN', 'WHATSAPP_RECIPIENTS', 'NTFY_TOPIC', 'NTFY_TOKEN', 'WEBHOOK_URL'];

var COLORS = {
  LAVENDER: '1', PALE_BLUE: '1', SAGE: '2', PALE_GREEN: '2', GRAPE: '3', MAUVE: '3', PAARS: '3',
  FLAMINGO: '4', PALE_RED: '4', BANANA: '5', YELLOW: '5', GEEL: '5', TANGERINE: '6', ORANGE: '6',
  ORANJE: '6', PEACOCK: '7', CYAN: '7', GRAPHITE: '8', GRAY: '8', GREY: '8', GRIJS: '8',
  BLUEBERRY: '9', BLUE: '9', BLAUW: '9', BASIL: '10', GREEN: '10', GROEN: '10',
  TOMATO: '11', RED: '11', ROOD: '11',
};

var TAG = 'knhbMatchId', TAG_KIND = 'knhbKind', TAG_POULE = 'knhbPoule', TAG_TEAM = 'knhbTeam',
    TAG_SCORED = 'knhbScored', TAG_KICKOFF = 'knhbKickoff', TAG_TIME = 'knhbTimeKnown',
    TAG_CANCEL = 'knhbCancelled', TAG_REM = 'knhbRem';
var KIND = { MATCH: 'match', WARMUP: 'warmup', TRAVEL: 'travel', RETURN: 'return' };
var SUB_KINDS = [KIND.WARMUP, KIND.TRAVEL, KIND.RETURN];

var MIN = 60000, DAY = 864e5;
var CONFIG = {}, RAW = {};
var PROP = PropertiesService.getScriptProperties();
var _clubCache = null;   // per-execution memo


/* ================================================================== *
 * CONFIG
 * ================================================================== */

function loadConfig_() {
  var p = PROP.getProperties();
  migrateLegacy_(p);

  function raw(k) {
    var v = p[k];
    return (v !== undefined && v !== null && String(v).trim() !== '') ? String(v).trim() : String(DEFAULTS[k]);
  }
  function int(k) { var n = parseInt(raw(k), 10); return isNaN(n) ? (parseInt(DEFAULTS[k], 10) || 0) : n; }
  function bool(k) { return isTrue_(raw(k)); }
  function oneOf(k, opts) { var v = raw(k).toLowerCase(); return opts.indexOf(v) >= 0 ? v : String(DEFAULTS[k]); }
  function list(k) { return raw(k).split(/[,;]/).map(function (s) { return s.trim(); }).filter(String); }

  for (var i = 0; i < CONFIG_KEYS.length; i++) {
    var k = CONFIG_KEYS[i];
    RAW[k] = raw(k);
    CONFIG[k] = RAW[k];
  }

  CONFIG.INCLUDE_PLAYED        = bool('INCLUDE_PLAYED');
  CONFIG.UNKNOWN_TIME_ALLDAY   = bool('UNKNOWN_TIME_ALLDAY');
  CONFIG.RETURN_TRAVEL         = bool('RETURN_TRAVEL');
  CONFIG.PURGE_PREVIOUS_TEAM   = bool('PURGE_PREVIOUS_TEAM');

  CONFIG.MATCH_MINUTES         = int('MATCH_MINUTES');
  CONFIG.WARMUP_MINUTES        = int('WARMUP_MINUTES');
  CONFIG.TRAVEL_BUFFER_MINUTES = int('TRAVEL_BUFFER_MINUTES');
  CONFIG.TRAVEL_ROUND_MINUTES  = int('TRAVEL_ROUND_MINUTES');
  CONFIG.RETURN_DELAY_MINUTES  = int('RETURN_DELAY_MINUTES');
  CONFIG.SYNC_INTERVAL_HOURS   = int('SYNC_INTERVAL_HOURS');

  CONFIG.WARMUP_MODE     = oneOf('WARMUP_MODE', ['separate', 'include', 'off']);
  CONFIG.TRAVEL_MODE     = oneOf('TRAVEL_MODE', ['separate', 'include', 'off']);
  CONFIG.REMINDER_TARGET = oneOf('REMINDER_TARGET', ['first', 'match', 'all']);

  var rem = raw('REMINDERS').toLowerCase();
  CONFIG.REMINDERS = /^(default|standaard)$/.test(rem) ? 'default' : (isTrue_(rem) ? 'on' : 'off');
  CONFIG.REMINDER_MINUTES = list('REMINDER_MINUTES')
    .map(function (s) { return parseInt(s, 10); })
    .filter(function (n) { return n > 0 && n <= 40320; });
  if (CONFIG.REMINDERS === 'on' && !CONFIG.REMINDER_MINUTES.length) CONFIG.REMINDERS = 'off';

  CONFIG.NOTIFY = parseTypes_(raw('NOTIFY_TYPES'));
  CONFIG.CH_TYPES = {};
  CHANNELS.forEach(function (c) {
    var v = raw(c + '_TYPES');
    CONFIG.CH_TYPES[c] = v ? parseTypes_(v) : CONFIG.NOTIFY;
  });
  CONFIG.NOTIFY_EMOJI   = bool('NOTIFY_EMOJI');
  CONFIG.EMAIL_DELIVERY = oneOf('EMAIL_DELIVERY', ['auto', 'inbox', 'send']);
  CONFIG.NTFY_SERVER    = raw('NTFY_SERVER').replace(/\/+$/, '');

  CONFIG.CANCEL_KEYWORDS = list('CANCEL_KEYWORDS').map(function (s) { return s.toLowerCase(); });
  CONFIG.API_BASE = raw('API_BASE').replace(/\/+$/, '');
}

/** "new,time" -> {new:true,time:true}; also "all"/"alles" and "none"/"geen". */
function parseTypes_(str) {
  var set = {};
  String(str || '').split(/[,;]/).forEach(function (t) {
    t = t.trim().toLowerCase();
    if (!t || t === 'none' || t === 'geen') return;
    if (t === 'all' || t === 'alles') NOTIFY_ORDER.forEach(function (x) { set[x] = true; });
    else set[t] = true;
  });
  return set;
}

function isTrue_(v) { return /^(true|1|yes|ja|aan|on)$/i.test(String(v).trim()); }

/** Move settings from v5 key names to their v6 names (runs automatically). */
function migrateLegacy_(p) {
  var moved = [];
  for (var oldK in LEGACY_KEYS) {
    if (p[oldK] === undefined) continue;
    var newK = LEGACY_KEYS[oldK];
    if (p[newK] === undefined || p[newK] === '') { PROP.setProperty(newK, p[oldK]); p[newK] = p[oldK]; }
    PROP.deleteProperty(oldK); delete p[oldK];
    moved.push(oldK + ' -> ' + newK);
  }
  if (p.ADD_TRAVEL !== undefined) {
    if (p.TRAVEL_MODE === undefined || p.TRAVEL_MODE === '') {
      var v = String(p.ADD_TRAVEL) === 'false' ? 'off' : 'separate';
      PROP.setProperty('TRAVEL_MODE', v); p.TRAVEL_MODE = v;
    }
    PROP.deleteProperty('ADD_TRAVEL'); delete p.ADD_TRAVEL;
    moved.push('ADD_TRAVEL -> TRAVEL_MODE');
  }
  if (p.travelCache !== undefined) { PROP.deleteProperty('travelCache'); delete p.travelCache; }
  if (moved.length) Logger.log('Oude instellingen omgezet: ' + moved.join(', '));
}

function requireConfig_() {
  if (!CONFIG.TEAM_ID || (!CONFIG.CLUB_CODE && !CONFIG.POULE_ID)) {
    throw new Error('TEAM_ID en CLUB_CODE zijn nog niet ingevuld. Draai seedConfig en vul ze in bij ' +
                    'Projectinstellingen -> Scripteigenschappen (zie README).');
  }
}

function blankProp_(k) { var v = PROP.getProperty(k); return v === null || String(v).trim() === ''; }

/** Write any not-yet-present config keys into Script Properties, then show them. */
function seedConfig() {
  var existing = PROP.getProperties();
  migrateLegacy_(existing);
  var wrote = [];
  for (var i = 0; i < CONFIG_KEYS.length; i++) {
    var k = CONFIG_KEYS[i];
    if (existing[k] === undefined) { PROP.setProperty(k, DEFAULTS[k]); wrote.push(k); }
  }
  Logger.log(wrote.length ? 'Toegevoegd aan Scripteigenschappen: ' + wrote.join(', ')
                          : 'Alle instellingen staan al in Scripteigenschappen.');
  Logger.log('Vul minimaal CLUB_CODE en TEAM_ID in. Lege velden worden waar mogelijk automatisch ingevuld.');
  showConfig();
}

/** Print the settings currently in effect. */
function showConfig() {
  loadConfig_();
  var lines = ['KNHB Match Center -> Google Agenda v' + VERSION, 'Actieve instellingen:'];
  for (var i = 0; i < CONFIG_KEYS.length; i++) {
    var k = CONFIG_KEYS[i];
    var v = RAW[k];
    if (v !== '' && SECRET_KEYS.indexOf(k) >= 0) v = v.slice(0, 4) + '\u2026 (verborgen)';
    lines.push('  ' + k + ' = ' + (v === '' ? '(leeg -> standaard/automatisch)' : v));
  }
  var pc = PROP.getProperty('pouleCache');
  if (pc) lines.push('  (gesynchroniseerde poules = ' + pc + ')');
  var last = PROP.getProperty('lastSync');
  if (last) lines.push('  (laatste synchronisatie = ' + last + ')');
  Logger.log(lines.join('\n'));
}

/** Fill blank TEAM_LABEL / CALENDAR_NAME / TRAVEL_ORIGIN from live data and persist. */
function enrichConfig_(team) {
  autofill_('TEAM_LABEL', 'autoLabel', String((team && (team.short_name || team.name)) || '').trim());
  if (blankProp_('CALENDAR_NAME')) autofill_('CALENDAR_NAME', 'autoCalendar', deriveClubCalendarName_());
  if (blankProp_('TRAVEL_ORIGIN')) autofill_('TRAVEL_ORIGIN', 'autoOrigin', deriveClubAddress_());
}

function autofill_(key, flag, value) {
  if (!blankProp_(key) || !value) return;
  PROP.setProperty(key, value);
  PROP.setProperty(flag, '1');        // remember it was automatic, so a switch can refresh it
  CONFIG[key] = value; RAW[key] = value;
  Logger.log('Automatisch ingevuld: ' + key + ' = ' + value);
}

function resetAuto_(key, flag) {
  if (PROP.getProperty(flag) !== '1') return;
  PROP.deleteProperty(key); PROP.deleteProperty(flag);
  CONFIG[key] = ''; RAW[key] = '';
}

function deriveClubCalendarName_() {
  var c = getClub_(), d = c && c.data;
  if (!d) return '';
  var nm = d.friendly_name || d.name || '';
  return nm ? ('Hockey ' + nm) : '';
}

function deriveClubAddress_() {
  var c = getClub_(), d = c && c.data;
  if (!d) return '';
  return [d.name, d.address, d.zipcode, d.city].filter(function (x) { return x; }).join(', ');
}


/* ================================================================== *
 * MAIN
 * ================================================================== */

/** Entry point for the time-driven trigger. */
function syncHockey() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) { Logger.log('Er loopt al een synchronisatie; deze run wordt overgeslagen.'); return; }
  try { runSync_(); } finally { lock.releaseLock(); }
}

function runSync_() {
  loadConfig_();
  requireConfig_();
  ensureDevice_();

  // Detect a switch of team or club. History (anything in the past) is never touched.
  var prevTeam = PROP.getProperty('syncTeam');
  var prevClub = PROP.getProperty('syncClub');
  var teamChanged = !!prevTeam && prevTeam !== CONFIG.TEAM_ID;
  var clubChanged = !!prevClub && !!CONFIG.CLUB_CODE && prevClub !== CONFIG.CLUB_CODE;
  var prevPoules = teamChanged ? [] : asArray_(readJson_('pouleCache', []));
  if (teamChanged) {
    Logger.log('Team gewijzigd (' + prevTeam + ' -> ' + CONFIG.TEAM_ID + '). Items uit het verleden blijven staan.');
    PROP.deleteProperty('pouleCache');
    resetAuto_('TEAM_LABEL', 'autoLabel');
  }
  if (clubChanged) {
    Logger.log('Club gewijzigd (' + prevClub + ' -> ' + CONFIG.CLUB_CODE + ').');
    resetAuto_('CALENDAR_NAME', 'autoCalendar');
    resetAuto_('TRAVEL_ORIGIN', 'autoOrigin');
  }

  var r = resolveTeamPoules_();
  if (!r) {
    Logger.log('Geen gegevens voor team ' + CONFIG.TEAM_ID + '. Controleer TEAM_ID/CLUB_CODE, ' +
               'of het seizoen is nog niet gepubliceerd.');
    return;
  }
  enrichConfig_(r.team);

  var activeSet = {}, knownSet = {};
  r.pouleIds.forEach(function (id) { activeSet[id] = true; knownSet[id] = true; });
  prevPoules.forEach(function (id) { knownSet[String(id)] = true; });

  var byId = collectAll_(r);

  // Build plans. Matches without a usable date are remembered, so we can report
  // "date/time known" instead of "new" once they get one.
  var undatedKey = 'undated_' + CONFIG.TEAM_ID;
  var undated = readJson_(undatedKey, {});
  var changes = [], plans = [];
  for (var id in byId) {
    var m = byId[id].match;
    var plan = buildPlan_(m);
    if (!plan) {
      if (!undated[id] && !isCancelled_(m)) {
        undated[id] = matchName_(m);
        changes.push(change_('new', 'NIEUW (datum n.n.b.)  ' + undated[id], false));
      }
      continue;
    }
    if (undated[id]) { plan.wasUndated = true; delete undated[id]; }
    plan.poule = byId[id].poule;
    plans.push(plan);
  }
  for (var u in undated) if (!byId[u]) delete undated[u];
  PROP.setProperty(undatedKey, JSON.stringify(undated));

  // Title changes caused by our own settings (templates, label) are not news.
  var titleSig = ['TEAM_LABEL', 'TITLE_MATCH', 'TITLE_WARMUP', 'TITLE_TRAVEL', 'TITLE_RETURN',
                  'CANCELLED_TEXT', 'TBD_TEXT'].map(function (k) { return RAW[k]; }).join('\u0001');
  var titleSigChanged = PROP.getProperty('titleSig') !== null && PROP.getProperty('titleSig') !== titleSig;

  var calName = CONFIG.CALENDAR_NAME || 'Hockey (KNHB)';
  var cal = getOrCreateCalendar_(calName);
  changes = changes.concat(syncEvents_(cal, plans, {
    known: knownSet,
    prevTeam: (teamChanged && CONFIG.PURGE_PREVIOUS_TEAM) ? prevTeam : null,
    quietTitles: titleSigChanged,
  }));
  PROP.setProperty('titleSig', titleSig);

  var firstRun = !PROP.getProperty('lastSync') && !prevTeam;   // v5 installs already have syncTeam
  PROP.setProperty('syncTeam', CONFIG.TEAM_ID);
  if (CONFIG.CLUB_CODE) PROP.setProperty('syncClub', CONFIG.CLUB_CODE);
  PROP.setProperty('pouleCache', JSON.stringify(r.pouleIds));
  PROP.setProperty('lastSync', new Date().toISOString());

  if (!changes.length) {
    Logger.log('Bijgewerkt. ' + plans.length + ' wedstrijd(en) voor team ' + CONFIG.TEAM_ID +
               ' in poules [' + r.pouleIds.join(', ') + '], niets gewijzigd.');
    return;
  }
  Logger.log(changes.map(function (c) { return c.text; }).join('\n'));
  if (firstRun) Logger.log('Eerste synchronisatie: geen meldingen verstuurd.');
  else notify_(changes, calName);
}


/* ================================================================== *
 * POULE RESOLUTION
 * ================================================================== */

function resolveTeamPoules_() {
  var entry = CONFIG.POULE_ID || firstCachedPoule_() || lookupPouleViaClub_();
  var data = apiGet_('/poules/' + entry + '/teams/' + CONFIG.TEAM_ID);

  if ((!data || !data.data || !data.data.team) && !CONFIG.POULE_ID && CONFIG.CLUB_CODE) {
    entry = lookupPouleViaClub_();
    data = apiGet_('/poules/' + entry + '/teams/' + CONFIG.TEAM_ID);
  }
  if (!data || !data.data || !data.data.team || !data.data.poule) return null;

  var team = data.data.team;
  var ids = {};
  ids[String(entry)] = true;
  if (!CONFIG.POULE_ID && team.poules) {
    for (var i = 0; i < team.poules.length; i++) {
      var p = team.poules[i];
      if (p && p.id) ids[String(p.id)] = true;
    }
  }
  return { entry: String(entry), entryData: data, team: team, pouleIds: Object.keys(ids) };
}

function firstCachedPoule_() {
  var a = asArray_(readJson_('pouleCache', []));
  return a.length ? String(a[0]) : null;
}

function getClub_() {
  if (_clubCache) return _clubCache;
  if (!CONFIG.CLUB_CODE) return null;
  _clubCache = apiGet_('/clubs/' + CONFIG.CLUB_CODE);
  return _clubCache;
}

function lookupPouleViaClub_() {
  var club = getClub_();
  if (!club) throw new Error('POULE_ID is leeg en er is geen CLUB_CODE om de poule op te zoeken.');
  var teams = (club.data && club.data.teams) || [];
  for (var i = 0; i < teams.length; i++) {
    if (String(teams[i].id) === CONFIG.TEAM_ID && teams[i].recent_poule_id) return String(teams[i].recent_poule_id);
  }
  throw new Error('Team ' + CONFIG.TEAM_ID + ' niet gevonden bij club ' + CONFIG.CLUB_CODE +
                  '. Draai listClubTeams om geldige TEAM_ID\'s te zien.');
}

function collectAll_(r) {
  var byId = {};
  collectTeamMatches_(byId, r.entryData, r.entry);
  for (var i = 0; i < r.pouleIds.length; i++) {
    var pid = r.pouleIds[i];
    if (pid === r.entry) continue;
    collectTeamMatches_(byId, apiGet_('/poules/' + pid + '/teams/' + CONFIG.TEAM_ID), pid);
  }
  return byId;
}

function collectTeamMatches_(byId, resp, pouleId) {
  var poule = resp && resp.data && resp.data.poule;
  var ms = (poule && poule.matches) || [];
  for (var i = 0; i < ms.length; i++) {
    var m = ms[i];
    var hid = String(m.home && m.home.id), aid = String(m.away && m.away.id);
    if (hid !== CONFIG.TEAM_ID && aid !== CONFIG.TEAM_ID) continue;
    if (!CONFIG.INCLUDE_PLAYED && isPlayed_(m)) continue;
    byId[String(m.id)] = { match: m, poule: String(pouleId) };
  }
}


/* ================================================================== *
 * RUN-BY-HAND HELPERS
 * ================================================================== */

/** Lists all teams of CLUB_CODE with their TEAM_ID. */
function listClubTeams() {
  loadConfig_();
  if (!CONFIG.CLUB_CODE) { Logger.log('Vul eerst CLUB_CODE in.'); return; }
  ensureDevice_();
  var club = getClub_();
  var teams = (club && club.data && club.data.teams) || [];
  if (!teams.length) { Logger.log('Geen teams gevonden voor club ' + CONFIG.CLUB_CODE + '.'); return; }
  for (var i = 0; i < teams.length; i++) {
    var t = teams[i];
    Logger.log('TEAM_ID=' + t.id + '  recent_poule=' + (t.recent_poule_id || '?') +
               '  ' + (t.name || t.short_name) + '  [' + (t.hockey_type || '') + ']');
  }
}

/** One line per match: handy to see how the API marks times and cancellations. */
function dumpTeamMatches() {
  loadConfig_(); requireConfig_(); ensureDevice_();
  var r = resolveTeamPoules_();
  if (!r) { Logger.log('Geen gegevens.'); return; }
  var byId = collectAll_(r);
  for (var id in byId) {
    var m = byId[id].match, pd = parseDate_(m.date);
    var tk = pd ? (!pd.dateOnly && !noTime_(pd.date)) : false;
    Logger.log([
      'id=' + id, 'poule=' + byId[id].poule, 'date=' + text(m.date),
      'tijd bekend=' + tk, 'status=' + statusText_(m), 'afgelast=' + isCancelled_(m),
      'gespeeld=' + isPlayed_(m), matchName_(m),
    ].join('  |  '));
  }
}

/** Full JSON of one match of the team. */
function dumpOneMatch() {
  loadConfig_(); requireConfig_(); ensureDevice_();
  var r = resolveTeamPoules_();
  if (!r) { Logger.log('Geen gegevens.'); return; }
  var byId = {};
  collectTeamMatches_(byId, r.entryData, r.entry);
  for (var id in byId) { Logger.log(JSON.stringify(byId[id].match, null, 2)); return; }
  Logger.log('Geen wedstrijd van team ' + CONFIG.TEAM_ID + ' gevonden.');
}

/** Create (or replace) the time-driven trigger for syncHockey. */
function installTrigger() {
  loadConfig_();
  removeTrigger();
  var h = CONFIG.SYNC_INTERVAL_HOURS;
  if (h >= 24) {
    ScriptApp.newTrigger('syncHockey').timeBased().everyDays(Math.max(1, Math.round(h / 24))).atHour(6).create();
    Logger.log('Trigger aangemaakt: syncHockey elke ' + Math.max(1, Math.round(h / 24)) + ' dag(en).');
    return;
  }
  var allowed = [1, 2, 4, 6, 8, 12], best = allowed[0];
  for (var i = 0; i < allowed.length; i++) if (Math.abs(allowed[i] - h) < Math.abs(best - h)) best = allowed[i];
  ScriptApp.newTrigger('syncHockey').timeBased().everyHours(best).create();
  Logger.log('Trigger aangemaakt: syncHockey elke ' + best + ' uur.');
}

/** Remove the syncHockey trigger(s). */
function removeTrigger() {
  var ts = ScriptApp.getProjectTriggers(), n = 0;
  for (var i = 0; i < ts.length; i++) {
    if (ts[i].getHandlerFunction() === 'syncHockey') { ScriptApp.deleteTrigger(ts[i]); n++; }
  }
  if (n) Logger.log(n + ' bestaande trigger(s) verwijderd.');
}

/** Send a test message to every configured channel (e-mail, Telegram, ...). */
function testNotify() {
  loadConfig_();
  var chans = activeChannels_();
  if (!chans.length) { Logger.log('Geen meldingskanaal ingesteld (NOTIFY_EMAIL, TELEGRAM_*, WHATSAPP_*, NTFY_*, WEBHOOK_URL).'); return; }
  var msg = buildMessage_([
    change_('time', 'TEST  ' + fmt_(new Date()) + '  Dit is een testbericht van de hockey-agenda (v' + VERSION + ')'),
  ], CONFIG.CALENDAR_NAME || 'Hockey (KNHB)');
  chans.forEach(function (ch) {
    try { ch.send(msg); Logger.log('Test verstuurd via ' + ch.name + ' (meldingen voor: ' + Object.keys(ch.types).join(', ') + ').'); }
    catch (e) { Logger.log('Test via ' + ch.name + ' MISLUKT: ' + e); }
  });
}

/** Send a test message by e-mail only. */
function testEmail() {
  loadConfig_();
  if (!CONFIG.NOTIFY_EMAIL) { Logger.log('NOTIFY_EMAIL is leeg.'); return; }
  sendEmail_(buildMessage_([change_('time', 'TEST  ' + fmt_(new Date()) + '  Testbericht hockey-agenda')],
                           CONFIG.CALENDAR_NAME || 'Hockey (KNHB)'));
  Logger.log('Testmail verwerkt. Resterend dagquotum MailApp: ' + MailApp.getRemainingDailyQuota());
}

/** Lists the chats your Telegram bot has seen, so you can fill TELEGRAM_CHAT_ID. */
function telegramChatIds() {
  loadConfig_();
  if (!CONFIG.TELEGRAM_BOT_TOKEN) { Logger.log('Vul eerst TELEGRAM_BOT_TOKEN in.'); return; }
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/getUpdates',
                              { muteHttpExceptions: true });
  var data = JSON.parse(res.getContentText());
  if (!data.ok) { Logger.log('Telegram-fout: ' + data.description); return; }
  var seen = {};
  (data.result || []).forEach(function (u) {
    var msg = u.message || u.channel_post || u.edited_message || u.my_chat_member || {};
    var chat = msg.chat;
    if (!chat || seen[chat.id]) return;
    seen[chat.id] = true;
    var name = chat.title || [chat.first_name, chat.last_name].filter(String).join(' ') || chat.username || '';
    Logger.log('TELEGRAM_CHAT_ID=' + chat.id + '  (' + chat.type + ')  ' + name);
  });
  if (!Object.keys(seen).length) {
    Logger.log('Nog geen chats gevonden. Stuur je bot eerst een bericht (of voeg hem toe aan een groep en ' +
               'stuur daar /start) en draai deze functie opnieuw.');
  }
}

/** Delete this team's synced items from now on. Past items stay. */
function removeFutureSyncedEvents() {
  loadConfig_();
  var cal = getOrCreateCalendar_(CONFIG.CALENDAR_NAME || 'Hockey (KNHB)');
  var events = cal.getEvents(new Date(), new Date(Date.now() + 730 * DAY)), n = 0;
  for (var i = 0; i < events.length; i++) {
    var e = events[i];
    if (!e.getTag(TAG)) continue;
    var t = e.getTag(TAG_TEAM);
    if (t && t !== CONFIG.TEAM_ID) continue;
    e.deleteEvent(); n++;
  }
  Logger.log(n + ' toekomstig(e) item(s) verwijderd.');
}

/** Delete ALL synced items (every team, past and future) from the calendar. */
function removeAllSyncedEvents() {
  loadConfig_();
  var cal = getOrCreateCalendar_(CONFIG.CALENDAR_NAME || 'Hockey (KNHB)');
  var events = cal.getEvents(new Date(Date.now() - 730 * DAY), new Date(Date.now() + 730 * DAY)), n = 0;
  for (var i = 0; i < events.length; i++) if (events[i].getTag(TAG)) { events[i].deleteEvent(); n++; }
  Logger.log(n + ' item(s) verwijderd.');
}

function resetDevice() {
  PROP.deleteProperty('deviceUUID');
  PROP.deleteProperty('deviceToken');
  PROP.deleteProperty('pouleCache');
  Logger.log('Apparaat + poule-cache gereset.');
}

/** Clear the cached driving times (e.g. after changing TRAVEL_ORIGIN). */
function resetTravelCache() {
  var keys = PROP.getKeys(), n = 0;
  for (var i = 0; i < keys.length; i++) if (keys[i].indexOf('tc_') === 0) { PROP.deleteProperty(keys[i]); n++; }
  PROP.deleteProperty('travelCache');
  Logger.log(n + ' reistijd(en) uit de cache verwijderd.');
}


/* ================================================================== *
 * DEVICE + SIGNED REQUESTS
 * ================================================================== */

function ensureDevice_() {
  var uuid = CONFIG.DEVICE_UUID || PROP.getProperty('deviceUUID');
  if (!uuid) { uuid = Utilities.getUuid(); PROP.setProperty('deviceUUID', uuid); }
  else if (!PROP.getProperty('deviceUUID')) { PROP.setProperty('deviceUUID', uuid); }
  if (!PROP.getProperty('deviceToken')) registerDevice_(uuid);
}

function registerDevice_(uuid) {
  var res = UrlFetchApp.fetch(CONFIG.API_BASE + '/device/register', {
    method: 'post', contentType: 'application/json', muteHttpExceptions: true,
    headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    payload: JSON.stringify({ uuid: uuid, os: 'Web' }),
  });
  var code = res.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('device/register mislukt: HTTP ' + code + ' ' + res.getContentText().slice(0, 200));
  }
  PROP.setProperty('deviceToken', JSON.parse(res.getContentText()).token);
  Logger.log('Nieuw apparaat geregistreerd.');
}

function signHeaders_(pathWithQuery) {
  var uuid = PROP.getProperty('deviceUUID');
  var token = PROP.getProperty('deviceToken') || '';

  var path = pathWithQuery, query = '';
  var qi = pathWithQuery.indexOf('?');
  if (qi >= 0) { path = pathWithQuery.slice(0, qi); query = pathWithQuery.slice(qi + 1); }

  var cleanedPath = path.replace(/[^a-zA-Z0-9\-/]+/g, '');
  var cleanedQuery = '';
  if (query) {
    var parts = query.split('&'), out = [];
    for (var i = 0; i < parts.length; i++) {
      var kv = parts[i], k = kv, v = '', eq = kv.indexOf('=');
      if (eq >= 0) { k = kv.slice(0, eq); v = kv.slice(eq + 1); }
      k = k.replace(/[^a-zA-Z0-9\-/=]+/g, '');
      v = v.replace(/[^a-zA-Z0-9\-/=]+/g, '');
      if (k.length > 0) out.push(k + '=' + v);
    }
    cleanedQuery = out.join('');
  }

  var ts = String(Math.floor(Date.now() / 1000));
  var reversedUuid = uuid.split('').reverse().join('');
  var toSign = ts + cleanedPath + cleanedQuery + reversedUuid;
  var sig = hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_1, toSign, Utilities.Charset.UTF_8));

  return {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    'X-HAPI-Authorization': token,
    'X-HAPI-Timestamp': ts,
    'X-HAPI-Signature': sig,
    'X-HAPI-Version': CONFIG.API_VERSION,
  };
}

function apiGet_(pathWithQuery, _retried) {
  var res = UrlFetchApp.fetch(CONFIG.API_BASE + pathWithQuery, {
    method: 'get', muteHttpExceptions: true, headers: signHeaders_(pathWithQuery),
  });
  var code = res.getResponseCode();
  if (code === 401 && !_retried) {
    PROP.deleteProperty('deviceToken'); ensureDevice_();
    return apiGet_(pathWithQuery, true);
  }
  if (code !== 200) {
    Logger.log('HTTP ' + code + ' voor ' + pathWithQuery + ' :: ' + res.getContentText().slice(0, 200));
    return null;
  }
  try { return JSON.parse(res.getContentText()); }
  catch (e) { Logger.log('Ongeldige JSON van ' + pathWithQuery); return null; }
}


/* ================================================================== *
 * TRAVEL TIME: origin -> opponent's ground, cached per route
 * ================================================================== */

function travelMinutes_(origin, dest) {
  if (!origin || !dest) return 0;
  var mins = cachedTravel_(origin, dest);
  if (mins <= 0) return 0;
  mins += Math.max(0, CONFIG.TRAVEL_BUFFER_MINUTES);
  var r = CONFIG.TRAVEL_ROUND_MINUTES;
  if (r > 1) mins = Math.ceil(mins / r) * r;
  return mins;
}

function cachedTravel_(origin, dest) {
  var key = 'tc_' + hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, origin + ' => ' + dest,
                                                  Utilities.Charset.UTF_8));
  var hit = PROP.getProperty(key);
  if (hit) return parseInt(hit, 10) || 0;
  var mins = computeTravel_(origin, dest);
  if (mins > 0) PROP.setProperty(key, String(mins));
  return mins;
}

function computeTravel_(origin, dest) {
  try {
    var dirs = Maps.newDirectionFinder()
      .setOrigin(origin)
      .setDestination(dest)
      .setMode(Maps.DirectionFinder.Mode.DRIVING)
      .getDirections();
    if (dirs && dirs.status === 'OK' && dirs.routes && dirs.routes.length) {
      return Math.round(dirs.routes[0].legs[0].duration.value / 60);   // seconds -> minutes
    }
    Logger.log('Reistijd: geen route (' + (dirs && dirs.status) + ') ' + origin + ' -> ' + dest);
  } catch (e) {
    Logger.log('Reistijd berekenen mislukt: ' + e);
  }
  return 0;
}

function mapsLink_(origin, dest) {
  return 'https://www.google.com/maps/dir/?api=1&origin=' + encodeURIComponent(origin) +
         '&destination=' + encodeURIComponent(dest) + '&travelmode=driving';
}


/* ================================================================== *
 * FIELD EXTRACTION
 * ================================================================== */

function text(v) { return v === null || v === undefined ? '' : String(v); }

function statusText_(m) {
  var s = m.status;
  if (s && typeof s === 'object') s = s.name || s.label || s.value || s.code || '';
  return text(s);
}

function isPlayed_(m) {
  var s = statusText_(m).toLowerCase();
  return s === 'result' || s === 'final' ||
         !!(m.score && m.score.home !== null && m.score.home !== undefined);
}

function isCancelled_(m) {
  var s = statusText_(m).toLowerCase();
  if (/^(cancell?ed|discontinued|postponed|abandoned)$/.test(s)) return true;
  if (m.cancelled === true || m.canceled === true || m.is_cancelled === true) return true;
  if (m.cancellation_minute !== null && m.cancellation_minute !== undefined) return true;
  var remarks = m.remarks;
  var blob = [s, text(m.status_text),
              typeof remarks === 'string' ? remarks : text(remarks && remarks.official)].join(' ').toLowerCase();
  for (var i = 0; i < CONFIG.CANCEL_KEYWORDS.length; i++) {
    if (CONFIG.CANCEL_KEYWORDS[i] && blob.indexOf(CONFIG.CANCEL_KEYWORDS[i]) >= 0) return true;
  }
  return false;
}

/** Returns {date, dateOnly} or null. Date-only values mean "time not known yet". */
function parseDate_(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  var s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    try { return { date: Utilities.parseDate(s + ' 00:00', CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm'), dateOnly: true }; }
    catch (e) { return null; }
  }
  s = s.replace(' ', 'T').replace(/\.\d+/, '');
  if (!/[Zz]$|[+\-]\d\d:?\d\d$/.test(s)) s += 'Z';
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : { date: d, dateOnly: false };
}

/** A match whose push-back time is still "to be announced" shows as 00:00 local time. */
function noTime_(d) { return hhmm_(d) === '00:00'; }

function locationOf_(m) {
  var loc = m.location || {}, fac = loc.facility || {}, fld = loc.field || {}, parts = [];
  if (fac.name)    parts.push(fac.name);
  if (fac.address) parts.push(fac.address);
  if (fld.name)    parts.push('veld ' + fld.name);
  return parts.join(', ');
}

/** Address of the opponent's ground, as used for the route. */
function destinationOf_(m) {
  var fac = (m.location && m.location.facility) || {};
  var addr = text(fac.address).trim(), parts = addr ? [addr] : [];
  [fac.zipcode || fac.postal_code, fac.city || fac.place].forEach(function (x) {
    x = text(x).trim();
    if (x && addr.toLowerCase().indexOf(x.toLowerCase()) < 0) parts.push(x);
  });
  if (!parts.length && fac.name) parts.push(text(fac.name));
  return parts.join(', ');
}

function scoreStr_(m) {
  if (!m.score || m.score.home === null || m.score.home === undefined) return '';
  var s = m.score.home + '-' + m.score.away;
  if (m.shootouts && (m.shootouts.home || m.shootouts.away)) s += ' (so ' + m.shootouts.home + '-' + m.shootouts.away + ')';
  return s;
}

function matchName_(m) {
  return (text(m.home && m.home.name) || '?') + ' - ' + (text(m.away && m.away.name) || '?');
}

function fill_(tpl, tokens) {
  return String(tpl)
    .replace(/\{(\w+)\}/g, function (all, k) { return tokens[k] !== undefined ? tokens[k] : all; })
    .replace(/\s{2,}/g, ' ')
    .trim();
}


/* ================================================================== *
 * PLAN: what one match should look like in the calendar
 * ================================================================== */

function buildPlan_(m) {
  var pd = parseDate_(m.date);
  if (!pd) return null;

  var kickoff   = pd.date;
  var timeKnown = !pd.dateOnly && !noTime_(kickoff);
  var cancelled = isCancelled_(m);
  var scored    = isPlayed_(m) && !cancelled;
  var isAway    = String(m.away && m.away.id) === CONFIG.TEAM_ID;
  var matchEnd  = new Date(kickoff.getTime() + CONFIG.MATCH_MINUTES * MIN);
  var past      = matchEnd.getTime() < Date.now();
  var planned   = timeKnown && !cancelled;   // a real, playable kickoff
  var upcoming  = planned && !past;          // only these get warm-up / travel items

  var home = text(m.home && m.home.name) || '?';
  var away = text(m.away && m.away.name) || '?';
  var opponent = isAway ? home : away;
  var fac = (m.location && m.location.facility) || {};
  var where = locationOf_(m);
  var origin = CONFIG.TRAVEL_ORIGIN;
  var dest = destinationOf_(m);

  var W = (planned && CONFIG.WARMUP_MODE !== 'off') ? Math.max(0, CONFIG.WARMUP_MINUTES) : 0;
  var T = (planned && isAway && (CONFIG.TRAVEL_MODE !== 'off' || CONFIG.RETURN_TRAVEL)) ? travelMinutes_(origin, dest) : 0;
  var arrive = new Date(kickoff.getTime() - W * MIN);
  var depart = new Date(arrive.getTime() - T * MIN);
  var route  = (isAway && origin && dest) ? mapsLink_(origin, dest) : '';
  var sc = scoreStr_(m);

  var tokens = {
    label: CONFIG.TEAM_LABEL,
    prefix: CONFIG.TEAM_LABEL ? CONFIG.TEAM_LABEL + ' | ' : '',
    home: home, away: away, opponent: opponent,
    facility: text(fac.name),
    result: sc, score: sc ? ' (' + sc + ')' : '',
    cancelled: cancelled ? CONFIG.CANCELLED_TEXT + ': ' : '',
    tbd: (!timeKnown && !cancelled) ? ' (' + CONFIG.TBD_TEXT + ')' : '',
    kickoff: timeKnown ? hhmm_(kickoff) : CONFIG.TBD_TEXT,
    travel: T ? String(T) : '',
    homeaway: isAway ? 'uit' : 'thuis',
  };

  // --- Match item ---
  var lines = ['Aanvang: ' + (timeKnown ? hhmm_(kickoff) : 'n.n.b.')];
  if (planned && W) lines.push('Aanwezig: ' + hhmm_(arrive) + ' (' + W + ' min voor aanvang)');
  if (planned && isAway && T) lines.push('Uitwedstrijd: vertrek rond ' + hhmm_(depart) + ', reistijd auto \u00B1' + T + ' min');
  else lines.push(isAway ? 'Uitwedstrijd' : 'Thuiswedstrijd');
  if (sc) lines.push('Uitslag: ' + sc);
  var comp = (m.home && m.home.category_group_name) || '';
  if (comp) lines.push('Categorie: ' + comp);
  var fld = m.location && m.location.field;
  if (fld && fld.name) lines.push('Veld: ' + fld.name + (fld.type ? ' (' + fld.type + ')' : ''));
  if (statusText_(m)) lines.push('Status: ' + statusText_(m));
  if (m.remarks && m.remarks.official) lines.push('Opmerking: ' + m.remarks.official);
  if (route) lines.push('Route: ' + route);
  lines.push('Bron: https://www.knhb.nl/match-center');

  var match = {
    kind: KIND.MATCH,
    title: fill_(CONFIG.TITLE_MATCH, tokens),
    start: kickoff,
    end: matchEnd,
    allDay: !timeKnown && CONFIG.UNKNOWN_TIME_ALLDAY,
    location: where,
    description: lines.join('\n'),
    color: cancelled ? CONFIG.COLOR_CANCELLED : CONFIG.COLOR_MATCH,
  };
  var blocks = [match], first = match;

  // --- Warm-up ---
  if (upcoming && W > 0) {
    if (CONFIG.WARMUP_MODE === 'separate') {
      first = {
        kind: KIND.WARMUP,
        title: fill_(CONFIG.TITLE_WARMUP, tokens),
        start: arrive, end: kickoff,
        location: where,
        description: 'Aanwezig ' + hhmm_(arrive) + ', aanvang ' + hhmm_(kickoff) + '\n' + home + ' - ' + away,
        color: CONFIG.COLOR_WARMUP,
      };
      blocks.push(first);
    } else {
      match.start = arrive;
    }
  }

  // --- Travel to the away ground ---
  if (upcoming && T > 0 && CONFIG.TRAVEL_MODE !== 'off') {
    if (CONFIG.TRAVEL_MODE === 'separate') {
      var tl = ['Vertrek rond ' + hhmm_(depart) + (origin ? ' vanaf ' + origin : ''),
                'Reistijd auto \u00B1' + T + ' min' +
                  (CONFIG.TRAVEL_BUFFER_MINUTES > 0 ? ' (incl. ' + CONFIG.TRAVEL_BUFFER_MINUTES + ' min marge)' : ''),
                'Aanwezig ' + hhmm_(arrive) + ', aanvang ' + hhmm_(kickoff),
                home + ' - ' + away];
      if (route) tl.push('Route: ' + route);
      first = {
        kind: KIND.TRAVEL,
        title: fill_(CONFIG.TITLE_TRAVEL, tokens),
        start: depart, end: arrive,
        location: dest || where,
        description: tl.join('\n'),
        color: CONFIG.COLOR_TRAVEL,
      };
      blocks.push(first);
    } else {
      first.start = depart;
    }
  }

  // --- Return trip ---
  if (upcoming && T > 0 && CONFIG.RETURN_TRAVEL) {
    var rs = new Date(matchEnd.getTime() + Math.max(0, CONFIG.RETURN_DELAY_MINUTES) * MIN);
    blocks.push({
      kind: KIND.RETURN,
      title: fill_(CONFIG.TITLE_RETURN, tokens),
      start: rs, end: new Date(rs.getTime() + T * MIN),
      location: origin,
      description: 'Terugreis na ' + home + ' - ' + away + ', reistijd auto \u00B1' + T + ' min' +
                   (origin && dest ? '\nRoute: ' + mapsLink_(dest, origin) : ''),
      color: CONFIG.COLOR_TRAVEL,
    });
  }

  // --- Reminders ---
  for (var i = 0; i < blocks.length; i++) {
    var b = blocks[i];
    var target = CONFIG.REMINDER_TARGET === 'all' ||
                 (CONFIG.REMINDER_TARGET === 'first' && b === first) ||
                 (CONFIG.REMINDER_TARGET === 'match' && b === match);
    b.reminders = (upcoming && target) ? CONFIG.REMINDERS : 'off';
  }

  return {
    id: text(m.id),
    name: home + ' - ' + away,
    kickoff: kickoff,
    kickoffIso: kickoff.toISOString(),
    timeKnown: timeKnown,
    cancelled: cancelled,
    scored: scored,
    past: past,
    location: where,
    match: match,
    blocks: blocks,
  };
}


/* ================================================================== *
 * CALENDAR SYNC
 * ================================================================== */

function getOrCreateCalendar_(name) {
  var found = CalendarApp.getCalendarsByName(name);
  if (found.length) return found[0];
  Logger.log('Agenda "' + name + '" aangemaakt.');
  return CalendarApp.createCalendar(name, { summary: 'KNHB Match Center, automatisch bijgewerkt', timeZone: CONFIG.TIMEZONE });
}

function change_(type, txt, past) { return { type: type, text: txt, past: !!past }; }

/**
 * Rules:
 *  - Items in the past are history: never deleted, never moved. They only get
 *    updated when a result comes in or the cancellation status flips.
 *  - Only items tagged with the current TEAM_ID (or untagged v4/v5 items) are
 *    considered ours. Other teams' items are left alone, except the FUTURE items
 *    of the team we just switched away from (PURGE_PREVIOUS_TEAM).
 */
function syncEvents_(cal, plans, ctx) {
  var changes = [], now = Date.now();
  var lo = now - 30 * DAY, hi = now + 400 * DAY;
  plans.forEach(function (p) {
    p.blocks.forEach(function (b) {
      lo = Math.min(lo, b.start.getTime() - DAY);
      hi = Math.max(hi, b.end.getTime() + DAY);
    });
  });

  var mine = {}, others = [];
  var events = cal.getEvents(new Date(lo), new Date(hi));
  for (var i = 0; i < events.length; i++) {
    var e = events[i], id = e.getTag(TAG);
    if (!id) continue;
    var team = e.getTag(TAG_TEAM);
    if (team && team !== CONFIG.TEAM_ID) { others.push(e); continue; }
    var key = id + '|' + (e.getTag(TAG_KIND) || KIND.MATCH);
    if (mine[key]) {
      if (e.getStartTime().getTime() > now) { Logger.log('Dubbel item verwijderd: ' + e.getTitle()); e.deleteEvent(); }
      continue;
    }
    mine[key] = e;
  }

  var seen = {};
  plans.forEach(function (p) {
    var mkey = p.id + '|' + KIND.MATCH;
    seen[mkey] = true;
    var ev = mine[mkey];
    var when = whenStr_(p);

    if (!ev) {
      createItem_(cal, p, p.match);
      if (p.wasUndated) {
        changes.push(change_('time', 'DATUM/TIJD BEKEND  ' + when + '  ' + p.match.title, p.past));
      } else {
        changes.push(change_('new', 'NIEUW  ' + when + '  ' + p.match.title + (p.location ? '  @ ' + p.location : ''), p.past));
      }
    } else {
      updateMatch_(ev, p, changes, ctx.quietTitles);
    }

    // Warm-up / travel items: only for upcoming matches; history is left alone.
    SUB_KINDS.forEach(function (kind) {
      var k = p.id + '|' + kind;
      seen[k] = true;
      if (p.past) return;
      var b = p.blocks.filter(function (x) { return x.kind === kind; })[0];
      var se = mine[k];
      if (b && !se) createItem_(cal, p, b);
      else if (b && se) updateItem_(se, p, b);
      else if (!b && se && se.getStartTime().getTime() > now) se.deleteEvent();
    });
  });

  // Our items that are no longer in the Match Center (future only).
  for (var key2 in mine) {
    if (seen[key2]) continue;
    var x = mine[key2];
    if (x.getStartTime().getTime() <= now) continue;            // history
    var poule = x.getTag(TAG_POULE);
    if (poule && !ctx.known[poule]) continue;                    // a competition we don't track
    if ((x.getTag(TAG_KIND) || KIND.MATCH) === KIND.MATCH) {
      changes.push(change_('removed', 'VERWIJDERD  ' + fmt_(x.getStartTime()) + '  ' + x.getTitle() +
                                      '  (niet meer in het Match Center)', false));
    }
    x.deleteEvent();
  }

  // Future items of the team we just switched away from.
  if (ctx.prevTeam) {
    for (var j = 0; j < others.length; j++) {
      var o = others[j];
      if (o.getTag(TAG_TEAM) !== ctx.prevTeam || o.getStartTime().getTime() <= now) continue;
      if ((o.getTag(TAG_KIND) || KIND.MATCH) === KIND.MATCH) {
        changes.push(change_('removed', 'VERWIJDERD (vorig team)  ' + fmt_(o.getStartTime()) + '  ' + o.getTitle(), false));
      }
      o.deleteEvent();
    }
  }
  return changes;
}

function createItem_(cal, p, b) {
  var opts = { location: b.location || '', description: b.description || '' };
  var ev = b.allDay ? cal.createAllDayEvent(b.title, allDayDate_(b.start), opts)
                    : cal.createEvent(b.title, b.start, b.end, opts);
  ev.setTag(TAG, p.id);
  ev.setTag(TAG_KIND, b.kind);
  ev.setTag(TAG_POULE, p.poule);
  ev.setTag(TAG_TEAM, CONFIG.TEAM_ID);
  if (b.kind === KIND.MATCH) writeState_(ev, p);
  var c = colorId_(b.color);
  if (c) ev.setColor(c);
  applyReminders_(ev, b.reminders);
  return ev;
}

/** Bring an existing item in line with the plan. Returns what changed. */
function updateItem_(ev, p, b) {
  var d = {};
  if (applyTime_(ev, b)) d.time = true;
  if (ev.getTitle() !== b.title) { ev.setTitle(b.title); d.title = true; }
  if ((ev.getLocation() || '') !== (b.location || '')) { ev.setLocation(b.location || ''); d.location = true; }
  if ((ev.getDescription() || '') !== (b.description || '')) ev.setDescription(b.description || '');
  if (ev.getTag(TAG_KIND)  !== b.kind)         ev.setTag(TAG_KIND, b.kind);
  if (ev.getTag(TAG_POULE) !== p.poule)        ev.setTag(TAG_POULE, p.poule);
  if (ev.getTag(TAG_TEAM)  !== CONFIG.TEAM_ID) ev.setTag(TAG_TEAM, CONFIG.TEAM_ID);
  var c = colorId_(b.color);
  if ((ev.getColor() || '') !== c) ev.setColor(c);
  applyReminders_(ev, b.reminders);
  return d;
}

function updateMatch_(ev, p, changes, quietTitles) {
  var prev = readState_(ev);
  var legacy = !ev.getTag(TAG_KIND);   // item made by v4/v5: migrate silently
  var b = p.match, when = whenStr_(p);

  if (p.past) {
    var resultIn = p.scored && !prev.scored;
    var cancelFlip = p.cancelled !== prev.cancelled;
    if (!resultIn && !cancelFlip) return;                       // history: leave untouched
    if (ev.getTitle() !== b.title) ev.setTitle(b.title);
    if ((ev.getDescription() || '') !== b.description) ev.setDescription(b.description);
    var c = colorId_(b.color);
    if ((ev.getColor() || '') !== c) ev.setColor(c);
    writeState_(ev, p);
    if (resultIn) changes.push(change_('result', 'UITSLAG  ' + when + '  ' + b.title, true));
    if (cancelFlip) changes.push(change_(p.cancelled ? 'cancelled' : 'restored',
                                         (p.cancelled ? 'AFGELAST  ' : 'WEER INGEPLAND  ') + when + '  ' + p.name, true));
    return;
  }

  var d = updateItem_(ev, p, b);
  writeState_(ev, p);

  var msgs = [];
  if (!prev.cancelled && p.cancelled) {
    msgs.push(change_('cancelled', 'AFGELAST  ' + when + '  ' + p.name));
  } else if (prev.cancelled && !p.cancelled) {
    msgs.push(change_('restored', 'WEER INGEPLAND  ' + when + '  ' + b.title));
  }
  if (!p.cancelled) {
    if (!prev.timeKnown && p.timeKnown) {
      var moved = prev.kickoff && ymd_(new Date(prev.kickoff)) !== ymd_(p.kickoff);
      msgs.push(change_('time', 'TIJD BEKEND  ' + when + '  ' + b.title + '  (aanvang ' + hhmm_(p.kickoff) + ')' +
                                (moved ? '  [was ' + fmtDay_(new Date(prev.kickoff)) + ']' : '')));
    } else if (prev.kickoff && prev.kickoff !== p.kickoffIso) {
      msgs.push(change_('moved', 'VERPLAATST  ' + describeKickoff_(prev) + '  ->  ' + when + '  ' + b.title));
    }
  }
  if (d.location && !legacy) msgs.push(change_('location', 'LOCATIE  ' + when + '  ' + b.title + '  ->  ' + (b.location || '(leeg)')));
  if (p.scored && !prev.scored) msgs.push(change_('result', 'UITSLAG  ' + when + '  ' + b.title));
  if (!msgs.length && d.title && !legacy && !quietTitles) msgs.push(change_('changed', 'GEWIJZIGD  ' + when + '  ' + b.title));
  Array.prototype.push.apply(changes, msgs);
}

/** Previous state of a match item: from tags, or from the title for v4/v5 items. */
function readState_(ev) {
  var title = ev.getTitle() || '';
  var tk = ev.getTag(TAG_TIME), cc = ev.getTag(TAG_CANCEL);
  return {
    timeKnown: tk ? tk === '1' : (!/tijd n\.n\.b\./i.test(title) && !ev.isAllDayEvent()),
    cancelled: cc ? cc === '1' : /AFGELAST/i.test(title),
    kickoff: ev.getTag(TAG_KICKOFF) || null,
    scored: ev.getTag(TAG_SCORED) === '1' || /\((?:so\s*)?\d+\s*-\s*\d+\)/i.test(title),
  };
}

function writeState_(ev, p) {
  var want = {};
  want[TAG_KICKOFF] = p.kickoffIso;
  want[TAG_TIME]    = p.timeKnown ? '1' : '0';
  want[TAG_CANCEL]  = p.cancelled ? '1' : '0';
  if (p.scored) want[TAG_SCORED] = '1';
  for (var k in want) if (ev.getTag(k) !== want[k]) ev.setTag(k, want[k]);
}

function applyTime_(ev, b) {
  if (b.allDay) {
    if (ev.isAllDayEvent() && ymd_(ev.getAllDayStartDate()) === ymd_(b.start)) return false;
    ev.setAllDayDate(allDayDate_(b.start));
    return true;
  }
  if (!ev.isAllDayEvent() &&
      ev.getStartTime().getTime() === b.start.getTime() &&
      ev.getEndTime().getTime() === b.end.getTime()) return false;
  ev.setTime(b.start, b.end);   // also turns an all-day item back into a timed one
  return true;
}

function applyReminders_(ev, mode) {
  var sig = mode === 'on' ? 'on:' + CONFIG.REMINDER_MINUTES.join(',') : mode;
  if (ev.getTag(TAG_REM) === sig) return;
  if (mode === 'default') {
    ev.resetRemindersToDefault();
  } else {
    ev.removeAllReminders();
    if (mode === 'on') CONFIG.REMINDER_MINUTES.forEach(function (n) { ev.addPopupReminder(n); });
  }
  ev.setTag(TAG_REM, sig);
}

function colorId_(name) {
  var v = String(name || '').trim().toUpperCase().replace(/[\s\-]+/g, '_');
  if (!v) return '';
  if (/^\d+$/.test(v)) return (+v >= 1 && +v <= 11) ? String(+v) : '';
  return COLORS[v] || '';
}


/* ================================================================== *
 * NOTIFICATIONS: e-mail, Telegram, WhatsApp (CallMeBot), ntfy, webhook
 * ================================================================== */

function notify_(changes, calName) {
  var chans = activeChannels_();
  if (!chans.length) return;
  chans.forEach(function (ch) {
    var sel = changes.filter(function (c) { return ch.types[c.type] && (!c.past || c.type === 'result'); });
    if (!sel.length) { Logger.log(ch.name + ': geen wijzigingen van de gekozen soorten.'); return; }
    try {
      ch.send(buildMessage_(sel, calName));
      Logger.log('Melding verstuurd via ' + ch.name + ' (' + sel.length + ' regel(s)).');
    } catch (e) {
      Logger.log('Melding via ' + ch.name + ' MISLUKT: ' + e);
    }
  });
}

function activeChannels_() {
  var out = [];
  if (CONFIG.NOTIFY_EMAIL) out.push({ name: 'e-mail', types: CONFIG.CH_TYPES.EMAIL, send: sendEmail_ });
  if (CONFIG.TELEGRAM_BOT_TOKEN && CONFIG.TELEGRAM_CHAT_ID) out.push({ name: 'Telegram', types: CONFIG.CH_TYPES.TELEGRAM, send: sendTelegram_ });
  if (CONFIG.WHATSAPP_RECIPIENTS) out.push({ name: 'WhatsApp', types: CONFIG.CH_TYPES.WHATSAPP, send: sendWhatsApp_ });
  if (CONFIG.NTFY_TOPIC) out.push({ name: 'ntfy', types: CONFIG.CH_TYPES.NTFY, send: sendNtfy_ });
  if (CONFIG.WEBHOOK_URL) out.push({ name: 'webhook', types: CONFIG.CH_TYPES.WEBHOOK, send: sendWebhook_ });
  return out;
}

function buildMessage_(sel, calName) {
  sel = sel.slice().sort(function (a, b) { return NOTIFY_ORDER.indexOf(a.type) - NOTIFY_ORDER.indexOf(b.type); });
  var kinds = [];
  sel.forEach(function (c) { var l = NOTIFY_LABELS[c.type] || c.type; if (kinds.indexOf(l) < 0) kinds.push(l); });
  return {
    subject: 'Hockey ' + (CONFIG.TEAM_LABEL || CONFIG.TEAM_ID) + ': ' + kinds.join(', '),
    lines: sel.map(function (c) {
      return ((CONFIG.NOTIFY_EMOJI && NOTIFY_EMOJIS[c.type]) ? NOTIFY_EMOJIS[c.type] + ' ' : '') + c.text;
    }),
    urgent: sel.some(function (c) { return c.type === 'cancelled' || c.type === 'time' || c.type === 'moved'; }),
    footer: 'Agenda: ' + calName,
    link: 'https://www.knhb.nl/match-center',
  };
}

function plainText_(msg) { return msg.lines.join('\n') + '\n\n' + msg.footer + '\n' + msg.link; }

function splitList_(v) { return String(v || '').split(/[,;]/).map(function (x) { return x.trim(); }).filter(String); }

/** Split text into pieces of at most max characters, on line boundaries. */
function chunk_(textIn, max) {
  var out = [], cur = '';
  textIn.split('\n').forEach(function (line) {
    while (line.length > max) { out.push(line.slice(0, max)); line = line.slice(max); }
    if (cur && (cur.length + 1 + line.length) > max) { out.push(cur); cur = line; }
    else cur = cur ? cur + '\n' + line : line;
  });
  if (cur) out.push(cur);
  return out;
}

function fetchOk_(name, url, opts) {
  opts = opts || {};
  opts.muteHttpExceptions = true;
  var res = UrlFetchApp.fetch(url, opts);
  var code = res.getResponseCode();
  if (code < 200 || code >= 300) throw new Error(name + ' HTTP ' + code + ': ' + res.getContentText().slice(0, 200));
  return res;
}

/* --- E-mail ------------------------------------------------------- */

/**
 * Mail to your own address is put straight into your inbox as unread
 * (Gmail API "insert"), because Gmail often files mail-to-self under Sent only.
 * Other addresses get a normal mail. Falls back to sending if insert fails.
 */
function sendEmail_(msg) {
  var me = ownAddress_(), body = plainText_(msg), toSend = [];
  splitList_(CONFIG.NOTIFY_EMAIL).forEach(function (addr) {
    var self = me && normalizeAddr_(addr) === normalizeAddr_(me);
    if (self && CONFIG.EMAIL_DELIVERY !== 'send') {
      try { insertIntoInbox_(me, msg.subject, body); Logger.log('In inbox gezet: ' + addr); return; }
      catch (e) { Logger.log('In inbox zetten mislukt (' + e + '); gewoon versturen naar ' + addr + '.'); }
    }
    toSend.push(addr);
  });
  if (toSend.length) MailApp.sendEmail(toSend.join(','), msg.subject, body);
}

function ownAddress_() {
  try { return Session.getEffectiveUser().getEmail() || ''; } catch (e) { return ''; }
}

/** Lower-case, drop "+tag", and for Gmail ignore dots: name.x+hockey@gmail.com == namex@gmail.com */
function normalizeAddr_(a) {
  var m = String(a).trim().toLowerCase().match(/^([^@]+)@(.+)$/);
  if (!m) return String(a).trim().toLowerCase();
  var local = m[1].split('+')[0], domain = m[2];
  if (domain === 'gmail.com' || domain === 'googlemail.com') { local = local.replace(/\./g, ''); domain = 'gmail.com'; }
  return local + '@' + domain;
}

function insertIntoInbox_(me, subject, body) {
  if (typeof Gmail === 'undefined') throw new Error('Gmail-dienst niet ingeschakeld (zie appsscript.json)');
  var mime = [
    'From: "Hockey agenda" <' + me + '>',
    'To: ' + me,
    'Subject: =?UTF-8?B?' + Utilities.base64Encode(subject, Utilities.Charset.UTF_8) + '?=',
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    Utilities.base64Encode(body, Utilities.Charset.UTF_8).replace(/(.{76})/g, '$1\r\n'),
  ].join('\r\n');
  Gmail.Users.Messages.insert({
    raw: Utilities.base64EncodeWebSafe(mime, Utilities.Charset.UTF_8),
    labelIds: ['INBOX', 'UNREAD'],
  }, 'me');
}

/* --- Telegram ----------------------------------------------------- */

function sendTelegram_(msg) {
  function esc(t) { return String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  var html = '<b>' + esc(msg.subject) + '</b>\n\n' + msg.lines.map(esc).join('\n') +
             '\n\n<a href="' + msg.link + '">Match Center</a>';
  var parts = chunk_(html, 3800);
  splitList_(CONFIG.TELEGRAM_CHAT_ID).forEach(function (chatId) {
    parts.forEach(function (part) {
      fetchOk_('Telegram', 'https://api.telegram.org/bot' + CONFIG.TELEGRAM_BOT_TOKEN + '/sendMessage', {
        method: 'post', contentType: 'application/json',
        payload: JSON.stringify({ chat_id: chatId, text: part, parse_mode: 'HTML', disable_web_page_preview: true }),
      });
    });
  });
}

/* --- WhatsApp via CallMeBot (to yourself only, unofficial) -------- */

function sendWhatsApp_(msg) {
  var txt = '*' + msg.subject + '*\n' + msg.lines.join('\n');
  splitList_(CONFIG.WHATSAPP_RECIPIENTS).forEach(function (entry) {
    var i = entry.lastIndexOf(':');
    if (i < 1) throw new Error('WHATSAPP_RECIPIENTS: gebruik telefoonnummer:apikey, bijv. +31612345678:123456');
    var phone = entry.slice(0, i).replace(/[\s\-]/g, ''), key = entry.slice(i + 1).trim();
    chunk_(txt, 1500).forEach(function (part) {
      var res = fetchOk_('WhatsApp', 'https://api.callmebot.com/whatsapp.php?phone=' + encodeURIComponent(phone) +
                         '&text=' + encodeURIComponent(part) + '&apikey=' + encodeURIComponent(key));
      if (/APIKey is invalid|ERROR/i.test(res.getContentText())) {
        throw new Error('CallMeBot weigert het bericht voor ' + phone + ': ' + res.getContentText().replace(/<[^>]+>/g, ' ').slice(0, 160));
      }
    });
  });
}

/* --- ntfy (push app, no account needed) --------------------------- */

function sendNtfy_(msg) {
  var headers = {};
  if (CONFIG.NTFY_TOKEN) headers.Authorization = 'Bearer ' + CONFIG.NTFY_TOKEN;
  fetchOk_('ntfy', CONFIG.NTFY_SERVER, {
    method: 'post', contentType: 'application/json', headers: headers,
    payload: JSON.stringify({
      topic: CONFIG.NTFY_TOPIC, title: msg.subject, message: msg.lines.join('\n'),
      tags: ['field_hockey'], priority: msg.urgent ? 4 : 3, click: msg.link,
    }),
  });
}

/* --- Webhook: Discord, Slack, Google Chat, or generic JSON -------- */

function sendWebhook_(msg) {
  var url = CONFIG.WEBHOOK_URL;
  if (/discord(app)?\.com\/api\/webhooks/i.test(url)) {
    chunk_('**' + msg.subject + '**\n' + msg.lines.join('\n'), 1900).forEach(function (part) {
      fetchOk_('Discord', url, { method: 'post', contentType: 'application/json', payload: JSON.stringify({ content: part }) });
    });
  } else if (/hooks\.slack\.com|chat\.googleapis\.com/i.test(url)) {
    fetchOk_('webhook', url, { method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ text: '*' + msg.subject + '*\n' + msg.lines.join('\n') + '\n' + msg.link }) });
  } else {
    fetchOk_('webhook', url, { method: 'post', contentType: 'application/json',
      payload: JSON.stringify({ title: msg.subject, text: msg.lines.join('\n'), lines: msg.lines,
                                urgent: msg.urgent, calendar: msg.footer, link: msg.link }) });
  }
}


/* ================================================================== *
 * SMALL UTILITIES
 * ================================================================== */

var DAYS_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];
var MONTHS_NL = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

function hhmm_(d) { return Utilities.formatDate(d, CONFIG.TIMEZONE, 'HH:mm'); }
function ymd_(d)  { return Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd'); }

function fmtDay_(d) {
  var p = Utilities.formatDate(d, CONFIG.TIMEZONE, 'u d M').split(' ');   // u: 1=Mon .. 7=Sun
  return DAYS_NL[parseInt(p[0], 10) % 7] + ' ' + p[1] + ' ' + MONTHS_NL[parseInt(p[2], 10) - 1];
}
function fmt_(d) { return fmtDay_(d) + ' ' + hhmm_(d); }

function whenStr_(p) { return p.timeKnown ? fmt_(p.kickoff) : fmtDay_(p.kickoff) + ' (' + CONFIG.TBD_TEXT + ')'; }

function describeKickoff_(prev) {
  var d = new Date(prev.kickoff);
  return prev.timeKnown ? fmt_(d) : fmtDay_(d) + ' (' + CONFIG.TBD_TEXT + ')';
}

/** Midday on the given local date: safe input for all-day items in any time zone. */
function allDayDate_(d) { return Utilities.parseDate(ymd_(d) + ' 12:00', CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm'); }

function hex_(bytes) {
  return bytes.map(function (b) {
    var h = (b < 0 ? b + 256 : b).toString(16);
    return h.length === 1 ? '0' + h : h;
  }).join('');
}

function readJson_(key, def) {
  var raw = PROP.getProperty(key);
  if (!raw) return def;
  try { return JSON.parse(raw); } catch (e) { return /^\d+$/.test(raw) ? [raw] : def; }
}

function asArray_(v) {
  if (Array.isArray(v)) return v.map(String);
  if (v === null || v === undefined || v === '') return [];
  return [String(v)];
}
