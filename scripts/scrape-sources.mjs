// Ruft die Programmseiten der 24 Programme ab, erkennt Änderungen und speichert alles in SQLite.
// Je Programm links.programmwebsite aus dem Katalog oder die Ersatzseiten aus scripts/scraper-quellen.json.
// Links auf den Seiten werden nicht verfolgt.
//
//   npm run scrape                     alle Programmseiten abrufen
//   npm run scrape -- --extract        geänderte Programmseiten zusätzlich mit Langdock auswerten
//   npm run scrape -- --only idee-bw   nur ein Programm (mehrfach angeben möglich)
//   npm run scrape -- --report         letzten Stand aus der Datenbank anzeigen, nichts abrufen
//
// Regeln: robots.txt wird vor jedem Lauf gelesen (RFC 9309). Gesperrte Seiten werden übersprungen,
// ist robots.txt wegen eines Serverfehlers nicht erreichbar, gilt die ganze Domain als gesperrt.
// Crawl-delay wird eingehalten, mindestens MIN_DELAY_S zwischen zwei Abrufen derselben Domain.
// Domains laufen parallel, Seiten derselben Domain nacheinander. Bedingte Abrufe (ETag,
// Last-Modified) vermeiden unnötige Übertragungen.
//
// Die Datenbank (data/database.sqlite) ist lokal und nicht im Repository. Extrahierte Angaben
// landen als Vorschlag in der Tabelle extraktionen und werden nicht automatisch in den Katalog
// übernommen. Ein Mensch prüft sie vorher anhand des Belegs.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(import.meta.dirname, '..');
const CATALOG = path.join(ROOT, 'data/json/foerderprogramme.json');
const DB_FILE = path.join(ROOT, 'data/database.sqlite');
const ENV_FILE = path.join(ROOT, '.env.local');
const MIN_DELAY_S = 5;
const MAX_DELAY_S = 60; // längere Crawl-delays: Seite in diesem Lauf überspringen
const TIMEOUT_MS = 30_000;
const MAX_TEXT = 200_000;
const EXTRACT_CHARS = 15_000;

// ---------- Optionen und Konfiguration ----------
const args = process.argv.slice(2);
const opt = {
  extract: args.includes('--extract'),
  report: args.includes('--report'),
  only: args.flatMap((a, i) => (a === '--only' && args[i + 1] ? [args[i + 1]] : [])),
};

if (fs.existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
const contact = process.env.SCRAPER_CONTACT?.trim();
const USER_AGENT = `vhs-foerderfinder/0.1 (+https://github.com/Jakoobly/overfitted_hackathon${contact ? '; ' + contact : ''})`;
const ROBOTS_TOKEN = 'vhs-foerderfinder';

// ---------- Datenbank ----------
const db = new DatabaseSync(DB_FILE);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS quellen (
    id            INTEGER PRIMARY KEY,
    url           TEXT NOT NULL UNIQUE,
    programm_id   TEXT NOT NULL,
    typ           TEXT NOT NULL CHECK (typ IN ('programmseite', 'projektbeispiele')),
    aktiv         INTEGER NOT NULL DEFAULT 1
  );
  CREATE TABLE IF NOT EXISTS abrufe (
    id             INTEGER PRIMARY KEY,
    quelle_id      INTEGER NOT NULL REFERENCES quellen(id),
    zeitpunkt      TEXT NOT NULL,
    ergebnis       TEXT NOT NULL CHECK (ergebnis IN ('neu', 'geaendert', 'unveraendert', 'gesperrt', 'uebersprungen', 'fehler')),
    http_status    INTEGER,
    content_type   TEXT,
    etag           TEXT,
    last_modified  TEXT,
    text_hash      TEXT,
    text           TEXT,          -- nur bei neu/geaendert gespeichert
    hinweis        TEXT
  );
  CREATE INDEX IF NOT EXISTS abrufe_quelle ON abrufe(quelle_id, zeitpunkt);
  CREATE TABLE IF NOT EXISTS extraktionen (
    id              INTEGER PRIMARY KEY,
    abruf_id        INTEGER NOT NULL REFERENCES abrufe(id),
    programm_id     TEXT NOT NULL,
    zeitpunkt       TEXT NOT NULL,
    modell          TEXT NOT NULL,
    daten           TEXT NOT NULL,  -- JSON nach EXTRACT_SCHEMA
    belege_geprueft INTEGER NOT NULL, -- 1 = alle Belege wörtlich im Seitentext gefunden
    status          TEXT NOT NULL DEFAULT 'neu' CHECK (status IN ('neu', 'geprueft', 'uebernommen', 'verworfen'))
  );
`);

const now = () => new Date().toISOString();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Bericht ----------
function report() {
  const rows = db.prepare(`
    SELECT q.programm_id, q.typ, q.url, a.zeitpunkt, a.ergebnis, a.http_status, a.hinweis,
           (SELECT MAX(zeitpunkt) FROM abrufe x WHERE x.quelle_id = q.id AND x.ergebnis IN ('neu','geaendert')) AS letzte_aenderung
    FROM quellen q
    JOIN abrufe a ON a.id = (SELECT id FROM abrufe WHERE quelle_id = q.id ORDER BY id DESC LIMIT 1)
    WHERE q.aktiv = 1
    ORDER BY q.programm_id, q.typ`).all();
  for (const r of rows) {
    console.log(`${r.programm_id.slice(0, 44).padEnd(45)} ${r.typ.padEnd(16)} ${r.ergebnis.padEnd(13)} ${String(r.http_status ?? '').padEnd(4)} geändert: ${(r.letzte_aenderung ?? '–').slice(0, 10)}${r.hinweis ? '  ' + r.hinweis : ''}`);
  }
  const ex = db.prepare(`SELECT programm_id, zeitpunkt, belege_geprueft, status, daten FROM extraktionen WHERE status = 'neu' ORDER BY id`).all();
  if (ex.length) {
    console.log(`\nOffene Extraktionen zur Prüfung (${ex.length}):`);
    for (const e of ex) console.log(`  ${e.programm_id} (${e.zeitpunkt.slice(0, 10)}, Belege ${e.belege_geprueft ? 'gefunden' : 'NICHT alle gefunden'}): ${e.daten}`);
  }
}

if (opt.report) { report(); process.exit(0); }

// ---------- Quellen aus dem Katalog ----------
const catalog = JSON.parse(fs.readFileSync(CATALOG, 'utf8'));
const OVERRIDES = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'scraper-quellen.json'), 'utf8')).quellen;
for (const id of Object.keys(OVERRIDES)) if (!catalog.programme.some((p) => p.id === id)) console.warn(`scraper-quellen.json: unbekannte Programm-ID ${id}`);
const upsertSource = db.prepare(`
  INSERT INTO quellen (url, programm_id, typ) VALUES (?, ?, ?)
  ON CONFLICT(url) DO UPDATE SET programm_id = excluded.programm_id, typ = excluded.typ, aktiv = 1
  RETURNING id`);
// Nur bei einem vollen Lauf: Quellen, die nicht mehr im Katalog stehen, als inaktiv markieren
if (!opt.only.length) db.exec('UPDATE quellen SET aktiv = 0');
const sources = [];
for (const p of catalog.programme) {
  if (opt.only.length && !opt.only.includes(p.id)) continue;
  // Je Programm die offizielle Programmseite, außer scraper-quellen.json nennt bessere Seiten.
  // Projektbeispiele und Links auf den Seiten werden nicht abgerufen.
  const urls = OVERRIDES[p.id]?.urls ?? [p.links.programmwebsite].filter(Boolean);
  for (const url of urls) {
    const { id } = upsertSource.get(url, p.id, 'programmseite');
    if (!sources.some((s) => s.url === url)) sources.push({ id, url, programmId: p.id, typ: 'programmseite' });
  }
}
if (opt.only.length && !sources.length) { console.error(`Keine Quellen für: ${opt.only.join(', ')}`); process.exit(1); }

// ---------- robots.txt (RFC 9309, vereinfacht) ----------
function parseRobots(text) {
  const groups = [];
  let current = null, lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*$/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase(), value = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) { current = { agents: [], rules: [], delay: null }; groups.push(current); }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!current) continue;
    if (key === 'allow' || key === 'disallow') current.rules.push({ allow: key === 'allow', path: value });
    if (key === 'crawl-delay' && !Number.isNaN(Number(value))) current.delay = Number(value);
  }
  const specific = groups.filter((g) => g.agents.some((a) => a !== '*' && ROBOTS_TOKEN.startsWith(a)));
  const chosen = specific.length ? specific : groups.filter((g) => g.agents.includes('*'));
  return { rules: chosen.flatMap((g) => g.rules), delay: chosen.map((g) => g.delay).filter((d) => d != null).reduce((a, b) => Math.max(a, b), 0) || null };
}

function ruleMatches(rulePath, target) {
  if (!rulePath) return false;
  const anchored = rulePath.endsWith('$');
  const pattern = rulePath.replace(/\$$/, '').split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + pattern + (anchored ? '$' : '')).test(target);
}

function isAllowed(robots, url) {
  const u = new URL(url);
  const target = decodeURIComponent(u.pathname) + u.search;
  let best = null;
  for (const r of robots.rules) {
    if (!ruleMatches(r.path, target)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return !best || best.allow;
}

// Bei Serverfehler oder Netzwerkproblem einmal nach kurzer Pause erneut versuchen,
// danach gilt die Domain für diesen Lauf als gesperrt.
async function loadRobots(origin, attempt = 1) {
  const retry = async (hinweis) => {
    if (attempt < 2) { await sleep(MIN_DELAY_S * 1000); return loadRobots(origin, attempt + 1); }
    return { blockedAll: true, hinweis };
  };
  try {
    const res = await fetch(origin + '/robots.txt', { headers: { 'User-Agent': USER_AGENT }, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (res.status >= 500) return retry(`robots.txt HTTP ${res.status}: Domain gilt als gesperrt`);
    if (!res.ok) return { rules: [], delay: null, hinweis: `keine robots.txt (HTTP ${res.status})` };
    return parseRobots((await res.text()).slice(0, 500_000));
  } catch (e) {
    return retry(`robots.txt nicht erreichbar (${e.cause?.code ?? e.name}): Domain gilt als gesperrt`);
  }
}

// ---------- Text aus HTML ----------
const ENTITIES = {
  nbsp: ' ', amp: '&', lt: '<', gt: '>', quot: '"', apos: "'",
  auml: 'ä', ouml: 'ö', uuml: 'ü', Auml: 'Ä', Ouml: 'Ö', Uuml: 'Ü', szlig: 'ß',
  eacute: 'é', egrave: 'è', agrave: 'à', aacute: 'á', ccedil: 'ç', oacute: 'ó', uacute: 'ú',
  euro: '€', sect: '§', para: '¶', copy: '©', reg: '®', trade: '™', deg: '°', middot: '·', bull: '•', hellip: '…',
  ndash: '–', mdash: '—', shy: '', bdquo: '„', ldquo: '“', rdquo: '”', sbquo: '‚', lsquo: '‘', rsquo: '’',
  laquo: '«', raquo: '»', equiv: '≡', times: '×', frac12: '½', thinsp: ' ', ensp: ' ', emsp: ' ', zwnj: '', zwj: '',
};
const decodeEntities = (s) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi, (m, e) => {
  if (e[0] === '#') {
    const code = e[1].toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : Number(e.slice(1));
    return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : m;
  }
  return ENTITIES[e] ?? m;
});

function htmlToText(html) {
  const text = html
    .replace(/<(script|style|noscript|svg|template|iframe)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(nav|footer|header)[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  return decodeEntities(text)
    .replace(/[ \t\f\v ]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
    .slice(0, MAX_TEXT);
}

// ---------- Abruf einer Seite ----------
const lastFetch = db.prepare(`SELECT etag, last_modified, text_hash FROM abrufe WHERE quelle_id = ? AND text_hash IS NOT NULL ORDER BY id DESC LIMIT 1`);
const insertFetch = db.prepare(`
  INSERT INTO abrufe (quelle_id, zeitpunkt, ergebnis, http_status, content_type, etag, last_modified, text_hash, text, hinweis)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`);

async function fetchSource(source) {
  const prev = lastFetch.get(source.id);
  const headers = { 'User-Agent': USER_AGENT, 'Accept': 'text/html,application/xhtml+xml,application/pdf;q=0.8,*/*;q=0.5', 'Accept-Language': 'de' };
  if (prev?.etag) headers['If-None-Match'] = prev.etag;
  if (prev?.last_modified) headers['If-Modified-Since'] = prev.last_modified;
  const save = (ergebnis, f = {}) => insertFetch.get(source.id, now(), ergebnis, f.status ?? null, f.type ?? null, f.etag ?? null, f.lastModified ?? null, f.hash ?? null, f.text ?? null, f.hinweis ?? null).id;

  let res;
  try {
    res = await fetch(source.url, { headers, redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (e) {
    return { ergebnis: 'fehler', abrufId: save('fehler', { hinweis: `${e.name}: ${e.message}`.slice(0, 200) }) };
  }
  const meta = { status: res.status, type: res.headers.get('content-type'), etag: res.headers.get('etag'), lastModified: res.headers.get('last-modified') };
  if (res.status === 304) return { ergebnis: 'unveraendert', abrufId: save('unveraendert', { ...meta, hash: prev.text_hash, hinweis: 'HTTP 304' }) };
  if (!res.ok) return { ergebnis: 'fehler', abrufId: save('fehler', { ...meta, hinweis: `HTTP ${res.status}` }) };

  let text, hinweis = null;
  if ((meta.type ?? '').includes('pdf')) {
    const buf = Buffer.from(await res.arrayBuffer());
    meta.hash = crypto.createHash('sha256').update(buf).digest('hex');
    text = null;
    hinweis = 'PDF: nur Prüfsumme, kein Text';
  } else {
    text = htmlToText(await res.text());
    meta.hash = crypto.createHash('sha256').update(text).digest('hex');
  }
  if (res.redirected) hinweis = [hinweis, `umgeleitet auf ${res.url}`].filter(Boolean).join('; ');
  const ergebnis = !prev ? 'neu' : prev.text_hash === meta.hash ? 'unveraendert' : 'geaendert';
  const abrufId = save(ergebnis, { ...meta, text: ergebnis === 'unveraendert' ? null : text, hinweis });
  return { ergebnis, abrufId, text };
}

// ---------- Extraktion mit Langdock ----------
const nullable = (schema) => ({ ...schema, type: [schema.type, 'null'] });
const beleg = { type: ['string', 'null'], description: 'Wörtliches Zitat aus dem Seitentext, sonst null' };
const EXTRACT_SCHEMA = {
  type: 'object', additionalProperties: false,
  required: ['frist', 'aufruf', 'foerderbetrag', 'unterlagen'],
  properties: {
    frist: { type: 'object', additionalProperties: false, required: ['status', 'datum', 'beleg'], properties: {
      status: { type: 'string', enum: ['datum', 'laufend', 'kein_aufruf', 'unbekannt'] },
      datum: nullable({ type: 'string', description: 'YYYY-MM-DD' }), beleg } },
    aufruf: { type: 'object', additionalProperties: false, required: ['offen', 'titel', 'beleg'], properties: {
      offen: nullable({ type: 'boolean' }), titel: nullable({ type: 'string' }), beleg } },
    foerderbetrag: { type: 'object', additionalProperties: false, required: ['minEur', 'maxEur', 'beleg'], properties: {
      minEur: nullable({ type: 'number' }), maxEur: nullable({ type: 'number' }), beleg } },
    unterlagen: { type: 'object', additionalProperties: false, required: ['liste', 'beleg'], properties: {
      liste: { type: 'array', items: { type: 'string' } }, beleg } },
  },
};
const INSTRUCTIONS = `Du liest die offizielle Seite eines Förderprogramms für Volkshochschulen.
Gib nur Angaben zurück, die eindeutig im Seitentext stehen. Erfinde nichts und leite nichts ab.
Für jede Angabe zitierst du in "beleg" den Satz wörtlich aus dem Text. Steht etwas nicht im Text, setze null bzw. eine leere Liste.
frist.status: "datum" bei einem konkreten Einreichungsdatum, "laufend" bei laufender Einreichung, "kein_aufruf" wenn ausdrücklich kein Aufruf offen ist, sonst "unbekannt".
foerderbetrag: Betrag pro Projekt bzw. Antrag, nicht das Gesamtbudget des Programms.`;

let langdock;
async function getLangdock() {
  if (langdock !== undefined) return langdock;
  if (!process.env.LANGDOCK_API_KEY) { console.warn('LANGDOCK_API_KEY fehlt in .env.local: keine Extraktion.'); return (langdock = null); }
  const { default: OpenAI } = await import('openai');
  return (langdock = new OpenAI({ apiKey: process.env.LANGDOCK_API_KEY, baseURL: process.env.LANGDOCK_BASE_URL || 'https://api.langdock.com/openai/eu/v1', timeout: 60_000, maxRetries: 1 }));
}

const insertExtraction = db.prepare(`INSERT INTO extraktionen (abruf_id, programm_id, zeitpunkt, modell, daten, belege_geprueft) VALUES (?, ?, ?, ?, ?, ?)`);
const squash = (s) => s.replace(/\s+/g, ' ').toLowerCase();

async function extract(source, abrufId, text) {
  const client = await getLangdock();
  if (!client || !text) return null;
  const model = process.env.LANGDOCK_MODEL || 'gpt-5.1';
  const res = await client.responses.create({
    model, store: false, instructions: INSTRUCTIONS,
    input: [{ role: 'user', content: `Programm: ${source.programmId}\nURL: ${source.url}\n\nSeitentext:\n${text.slice(0, EXTRACT_CHARS)}` }],
    text: { format: { type: 'json_schema', name: 'programmangaben', strict: true, schema: EXTRACT_SCHEMA } },
  });
  const daten = JSON.parse(res.output_text);
  // Belege gegen den Seitentext prüfen: nur wörtlich gefundene Zitate gelten als belegt
  const belege = [daten.frist.beleg, daten.aufruf.beleg, daten.foerderbetrag.beleg, daten.unterlagen.beleg].filter(Boolean);
  const geprueft = belege.every((b) => squash(text).includes(squash(b))) ? 1 : 0;
  insertExtraction.run(abrufId, source.programmId, now(), model, JSON.stringify(daten), geprueft);
  return { daten, geprueft };
}

// ---------- Lauf ----------
const byOrigin = new Map();
for (const s of sources) {
  const origin = new URL(s.url).origin;
  byOrigin.set(origin, [...(byOrigin.get(origin) ?? []), s]);
}
console.log(`${sources.length} Seiten auf ${byOrigin.size} Domains · User-Agent: ${USER_AGENT}${opt.extract ? ' · mit Extraktion' : ''}\n`);
if (!contact) console.log('Hinweis: SCRAPER_CONTACT in .env.local setzen (Team- oder VHS-Adresse), damit Betreiber euch erreichen können.\n');

const counts = {};
const log = (s, ergebnis, extra = '') => {
  counts[ergebnis] = (counts[ergebnis] ?? 0) + 1;
  console.log(`${ergebnis.padEnd(13)} ${s.programmId.slice(0, 44).padEnd(45)} ${s.typ.padEnd(16)} ${extra}`);
};

await Promise.all([...byOrigin].map(async ([origin, list]) => {
  const robots = await loadRobots(origin);
  const delay = Math.max(MIN_DELAY_S, robots.delay ?? 0);
  for (const [i, s] of list.entries()) {
    if (robots.blockedAll || !isAllowed(robots, s.url)) {
      insertFetch.get(s.id, now(), 'gesperrt', null, null, null, null, null, null, robots.hinweis ?? 'durch robots.txt ausgeschlossen');
      log(s, 'gesperrt', robots.hinweis ?? 'robots.txt');
      continue;
    }
    if (delay > MAX_DELAY_S) {
      insertFetch.get(s.id, now(), 'uebersprungen', null, null, null, null, null, null, `Crawl-delay ${delay}s`);
      log(s, 'uebersprungen', `Crawl-delay ${delay}s`);
      continue;
    }
    if (i > 0) await sleep(delay * 1000);
    const r = await fetchSource(s);
    let extra = robots.hinweis ?? '';
    if (opt.extract && s.typ === 'programmseite' && (r.ergebnis === 'neu' || r.ergebnis === 'geaendert')) {
      try {
        const e = await extract(s, r.abrufId, r.text);
        if (e) extra = `Frist: ${e.daten.frist.status}${e.daten.frist.datum ? ' ' + e.daten.frist.datum : ''}, Belege ${e.geprueft ? 'ok' : 'prüfen'}`;
      } catch (err) {
        extra = `Extraktion fehlgeschlagen: ${String(err.message).slice(0, 120)}`;
      }
    }
    log(s, r.ergebnis, extra);
  }
}));

console.log('\n' + Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(' · ') + `\nDatenbank: ${path.relative(ROOT, DB_FILE)} · Bericht: npm run scrape -- --report`);
db.close();
