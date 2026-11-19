// Importiert die Förderprogramme aus raw/ in einen einheitlichen JSON-Katalog.
//
//   npm run import:catalog
//
// Quellen: das Excel-Blatt der Praxispartner und die ergänzenden Programmdokumente (.docx).
// Die Dokumente sind die neueren Fassungen. Ihre Werte haben Vorrang, Excel füllt Lücken.
// Jede Angabe bleibt mit Excel-Zeile bzw. Dokument belegt. Leere oder mehrdeutige Werte
// bleiben null. Strukturierte Bedingungen für die Förderprüfung werden hier bewusst nicht
// erraten, sondern für Demo-Kandidaten manuell ergänzt (siehe docs/vhs-foerderfinder.md).
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const ROOT = path.resolve(import.meta.dirname, '..');
const RAW = path.join(ROOT, 'raw');
const OUT = path.join(ROOT, 'data/json/foerderprogramme.json');
const EXCEL = 'AG Fördermittelguide_Basisbericht.xlsx';

const warnings = [];
const warn = (msg) => warnings.push(msg);

// ---------- Hilfsfunktionen ----------
const clean = (v) => {
  const s = String(v ?? '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{2,}/g, '\n').trim();
  return s === '' || s === '-' ? null : s;
};
const norm = (s) => (s ?? '').toLowerCase().replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss');
const slug = (s) => norm(s).replace(/\(.*?\)/g, (m) => m).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const tokens = (s) => new Set(norm(s).split(/[^a-z0-9+]+/).filter((t) => t.length > 1));
const similarity = (a, b) => {
  const A = tokens(a), B = tokens(b);
  const inter = [...A].filter((t) => B.has(t)).length;
  return inter / Math.max(1, Math.min(A.size, B.size));
};
const toUrl = (s) => {
  const m = clean(s)?.match(/(https?:\/\/\S+|www\.\S+)/);
  if (!m) return null;
  return (m[1].startsWith('http') ? m[1] : 'https://' + m[1]).replace(/[.,;)]+$/, '').replace(/[?&]utm_[^&]*$/, '');
};
const splitList = (s) => (clean(s) ? clean(s).split(/\s*,\s*/).filter(Boolean) : []);
const decodeXml = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

// ---------- Excel ----------
const EXCEL_COLUMNS = {
  'Name': 'kontaktName',
  'E-Mail': 'kontaktEmail',
  'Programm-/Fachbereich': 'fachbereich',
  'Förderprogramm': 'titel',
  'Fördergeber': 'foerdergeber',
  'Zuordnung Fördergeb': 'ebene',
  'Kurzbeschreibung des Programms (max. 1000 Zeichen):': 'kurzbeschreibung',
  'Projektbudget für Antragsteller*innen:': 'projektbudget',
  'Art der Förderung:': 'foerderart',
  'Link zu weiterführender Programmwebsite:': 'programmwebsite',
  'Link zu Projektbeispielen:': 'projektbeispiele',
  'Sonstige Anmerkungen': 'anmerkungen',
};
const EBENEN = new Set(['Land', 'Bund', 'Europa', 'Andere']);

function readExcel() {
  const wb = XLSX.read(fs.readFileSync(path.join(RAW, EXCEL)));
  const sheet = wb.SheetNames[0];
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[sheet], { header: 1, defval: '' });
  const header = rows[0].map((h) => String(h).trim());
  const missing = Object.keys(EXCEL_COLUMNS).filter((c) => !header.includes(c));
  if (missing.length) throw new Error(`Excel: Spalten fehlen: ${missing.join(', ')}`);

  const entries = [];
  rows.slice(1).forEach((row, i) => {
    const zeile = i + 2;
    if (!row.some((c) => clean(c))) return;
    let cells = header.map((_, c) => row[c]);
    // Zeile ohne Fachbereich: Werte sind um eine Spalte nach links verrutscht (z. B. CERV)
    const ebeneIdx = header.indexOf('Zuordnung Fördergeb');
    if (!EBENEN.has(clean(cells[ebeneIdx])) && EBENEN.has(clean(cells[ebeneIdx - 1]))) {
      const fbIdx = header.indexOf('Programm-/Fachbereich');
      cells = [...cells.slice(0, fbIdx), '', ...cells.slice(fbIdx, -1)];
      warn(`Excel Zeile ${zeile}: Spalten um eins verschoben, Fachbereich fehlt. Automatisch korrigiert.`);
    }
    const e = { zeile };
    header.forEach((h, c) => { if (EXCEL_COLUMNS[h]) e[EXCEL_COLUMNS[h]] = clean(cells[c]); });
    if (!e.titel) { warn(`Excel Zeile ${zeile}: kein Programmname, Zeile übersprungen.`); return; }
    entries.push(e);
  });
  return { sheet, entries };
}

// ---------- Programmdokumente (.docx) ----------
const DOC_FIELDS = {
  'Verantwortliche*r': 'verantwortlich',
  'Programm-/Fachbereich': 'fachbereich',
  'Förderprogramm-Name': 'programmName',
  'Fördergeber': 'foerdergeber',
  'Zuordnung Fördergeber': 'ebene',
  'Projektbudget für Antragsteller*innen': 'projektbudget',
  'Art der Förderung': 'foerderart',
  'Programmwebsite': 'programmwebsite',
  'Projektbeispiele': 'projektbeispiele',
  'Projektbeispielen': 'projektbeispiele',
  'Ansprechpartner*in vhs-Verband': 'verantwortlich',
  'Sonstige Anmerkungen': 'anmerkungen',
};

function docxParagraphs(file) {
  const zip = XLSX.CFB.read(fs.readFileSync(file), { type: 'buffer' });
  const xml = XLSX.CFB.find(zip, '/word/document.xml');
  if (!xml) throw new Error(`${path.basename(file)}: word/document.xml fehlt`);
  const text = Buffer.from(xml.content).toString('utf8');
  return [...text.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)]
    .map((m) => decodeXml(m[0].replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '')).trim())
    .filter(Boolean);
}

function readDocs() {
  return fs.readdirSync(RAW).filter((f) => f.endsWith('.docx')).sort().map((datei) => {
    const paras = docxParagraphs(path.join(RAW, datei));
    const d = { datei, ueberschrift: paras[0], beschreibung: [] };
    let current = null;
    for (const p of paras.slice(1)) {
      const label = Object.keys(DOC_FIELDS).find((k) => p.startsWith(k + ':') || p.startsWith(k + ' :'));
      if (label) {
        current = DOC_FIELDS[label];
        const value = p.slice(p.indexOf(':') + 1).trim();
        d[current] = d[current] && current !== 'verantwortlich' ? `${d[current]}\n${value}` : value;
      } else if (current) d[current] += '\n' + p;
      else d.beschreibung.push(p);
    }
    d.beschreibung = d.beschreibung.join('\n');
    for (const k of Object.keys(d)) if (typeof d[k] === 'string') d[k] = clean(d[k]);
    return d;
  });
}

// ---------- Ableitungen ----------
const FOERDERGEBIET = { Land: 'Baden-Württemberg', Bund: 'Deutschland', Europa: 'Europäische Union' };
const MONATE = { januar: 1, februar: 2, märz: 3, april: 4, mai: 5, juni: 6, juli: 7, august: 8, september: 9, oktober: 10, november: 11, dezember: 12 };

function parseEuro(raw, unit) {
  let n = parseFloat(raw.replace(/\.(?=\d{3})/g, '').replace(/\s/g, '').replace(',', '.'));
  if (/mio|million/i.test(unit ?? '')) n *= 1e6;
  return Math.round(n);
}

// Nur eindeutige Formulierungen werden in Zahlen übersetzt, alles andere bleibt Text.
function parseBetrag(text) {
  if (!text) return { minEur: null, maxEur: null };
  const t = text.replace(/–/g, '-');
  const num = String.raw`(\d{1,3}(?:\.\d{3})+|\d+(?:,\d+)?)\s*(Mio\.?|Millionen)?\s*(?:€|Euro)?`;
  let m = t.match(new RegExp(`^(?:Min\\.\\s*)?${num}\\s*(?:-|bis(?: max\\.)?)\\s*${num}`, 'i'));
  // „1–2 Mio.“: Einheit gilt für beide; „300.000–1 Mio.“: Einheit nur für den Höchstwert
  if (m) return { minEur: parseEuro(m[1], m[2] || (m[1].includes('.') ? null : m[4])), maxEur: parseEuro(m[3], m[4]) };
  m = t.match(new RegExp(`Mindestfördersumme[^\\d]*${num}`, 'i'));
  const min = m ? parseEuro(m[1], m[2]) : null;
  // Höchstbetrag nur, wenn die Angabe damit beginnt oder ausdrücklich die Fördersumme nennt,
  // damit Programmvolumen („bis zu 19 Millionen Euro bereitgestellt“) nicht als Projektbetrag gilt
  m = t.match(new RegExp(`(?:^bis (?:zu|maximal)|maximale Fördersumme|^max\\.)\\s*${num}`, 'i'));
  const max = m ? parseEuro(m[1], m[2]) : null;
  if (min || max) return { minEur: min, maxEur: max };
  m = t.match(new RegExp(`^${num}\\.?$`, 'i'));
  if (m) { const v = parseEuro(m[1], m[2]); return { minEur: v, maxEur: v }; }
  return { minEur: null, maxEur: null };
}

// Eigenanteil der antragstellenden vhs. Bedingte Angaben („Bei … mit Eigenanteil …“) bleiben
// unstrukturiert und nur als Beleg erhalten.
function parseEigenanteil(text) {
  const none = { mindestProzent: null, erforderlich: null, beleg: null };
  if (!text) return none;
  const sentence = text.split(/(?<=[.!?])\s+|\n/).find((s) => /eigen(anteil|mittel)/i.test(s))?.trim() ?? null;
  if (!sentence) return none;
  const before = text.slice(Math.max(0, text.indexOf(sentence) - 60), text.indexOf(sentence));
  const conditional = /^bei\b/i.test(sentence) || /\bBei\b[^\n]*$/.test(before); // auch über einen Satzpunkt hinweg
  if (conditional || /teilnehm|privatperson/i.test(sentence)) return { ...none, beleg: (conditional ? before.match(/\bBei\b.*$/s)?.[0] ?? '' : '') + sentence };
  const m = sentence.match(/(?:mindestens|mind\.)\s*(?:ein(?:en)? Anteil von\s*)?(\d{1,2})\s*(?:%|Prozent)/i);
  if (m) return { mindestProzent: Number(m[1]), erforderlich: true, beleg: sentence };
  if (/muss eingebracht|zu tragen|erforderlich/i.test(sentence)) return { mindestProzent: null, erforderlich: true, beleg: sentence };
  return { ...none, beleg: sentence };
}

function parseFrist(texts) {
  const all = texts.filter(Boolean).join('\n');
  const sentence = (re) => all.split(/(?<=[.!?])\s+|\n/).find((s) => re.test(s))?.trim() ?? null;
  let m = all.match(/bis (?:zum )?(\d{1,2})\.\s*(januar|februar|märz|april|mai|juni|juli|august|september|oktober|november|dezember)\s*(20\d\d)/i);
  if (m) return { status: 'datum', datum: `${m[3]}-${String(MONATE[m[2].toLowerCase()]).padStart(2, '0')}-${m[1].padStart(2, '0')}`, beleg: sentence(/bis (?:zum )?\d{1,2}\.\s*[a-zä]+ 20\d\d/i) };
  m = all.match(/bis (?:zum )?(\d{1,2})\.(\d{1,2})\.(20\d\d)/);
  if (m) return { status: 'datum', datum: `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`, beleg: sentence(/bis (?:zum )?\d{1,2}\.\d{1,2}\.20\d\d/) };
  if (/kein Förderaufruf offen/i.test(all)) return { status: 'kein_aufruf', datum: null, beleg: sentence(/kein Förderaufruf offen/i) };
  if (/laufend/i.test(all)) return { status: 'laufend', datum: null, beleg: sentence(/laufend/i) };
  return { status: 'unbekannt', datum: null, beleg: null };
}

function parseKontakt(...values) {
  for (const v of values) {
    const m = clean(v)?.match(/([^,\n]+?),\s*([\w.+-]+@[\w.-]+\.[a-z]{2,})/i);
    if (m) return { name: m[1].trim(), email: m[2] };
  }
  return null;
}

// ---------- Zusammenführen ----------
function matchExcel(doc, excelRows, used) {
  const names = [doc.ueberschrift, doc.programmName].filter(Boolean);
  let best = null, score = 0;
  for (const row of excelRows) {
    if (used.has(row.zeile)) continue;
    const s = Math.max(...names.map((n) => (norm(n) === norm(row.titel) ? 1.01 : similarity(n, row.titel))));
    if (s > score) { best = row; score = s; }
  }
  return score >= 0.6 ? best : null;
}

function build() {
  const { sheet, entries: excelRows } = readExcel();
  const docs = readDocs();
  const used = new Set();
  const programme = [];

  const merge = (doc, row) => {
    const pick = (docVal, excelVal) => docVal ?? excelVal ?? null;
    const titel = pick(doc?.ueberschrift, row?.titel);
    const foerderart = pick(doc?.foerderart, row?.foerderart);
    const projektbudget = pick(doc?.projektbudget, row?.projektbudget);
    const anmerkungen = pick(doc?.anmerkungen, row?.anmerkungen);
    const beschreibung = pick(doc?.beschreibung, row?.kurzbeschreibung);
    const ebene = pick(doc?.ebene, row?.ebene);
    const quellen = [];
    if (row) quellen.push({ typ: 'excel', datei: `raw/${EXCEL}`, blatt: sheet, zeile: row.zeile });
    if (doc) quellen.push({ typ: 'dokument', datei: `raw/${doc.datei}` });
    return {
      id: slug(titel),
      titel,
      kurzname: doc?.programmName && doc.programmName !== titel ? doc.programmName : null,
      foerdergeber: pick(doc?.foerdergeber, row?.foerdergeber),
      ebene,
      foerdergebiet: FOERDERGEBIET[ebene] ?? null,
      fachbereiche: splitList(pick(doc?.fachbereich, row?.fachbereich)),
      kurzbeschreibung: beschreibung,
      foerderung: {
        projektbudget,
        ...parseBetrag(projektbudget),
        art: foerderart,
        eigenanteil: parseEigenanteil([foerderart, projektbudget, beschreibung].filter(Boolean).join('\n')),
      },
      frist: parseFrist([beschreibung, anmerkungen]),
      links: {
        programmwebsite: toUrl(pick(doc?.programmwebsite, row?.programmwebsite)),
        projektbeispiele: toUrl(pick(doc?.projektbeispiele, row?.projektbeispiele)),
      },
      kontakt: parseKontakt(doc?.verantwortlich, row && `${row.kontaktName}, ${row.kontaktEmail}`),
      anmerkungen,
      unterlagen: null, // in den Quellen nicht genannt; für Demo-Kandidaten manuell ergänzen
      quellen,
    };
  };

  for (const doc of docs) {
    const row = matchExcel(doc, excelRows, used);
    if (row) used.add(row.zeile);
    else warn(`${doc.datei}: keine passende Excel-Zeile, nur Dokument verwendet.`);
    programme.push(merge(doc, row));
  }
  for (const row of excelRows.filter((r) => !used.has(r.zeile))) {
    warn(`Excel Zeile ${row.zeile} (${row.titel}): kein Programmdokument, nur Excel verwendet.`);
    programme.push(merge(null, row));
  }

  // Validierung: Pflichtfelder und doppelte IDs
  const seen = new Map();
  for (const p of programme) {
    if (!p.id || !p.titel) throw new Error(`Pflichtfeld fehlt: ${JSON.stringify(p.quellen)}`);
    if (seen.has(p.id)) throw new Error(`Doppelte ID ${p.id}: ${JSON.stringify(seen.get(p.id))} und ${JSON.stringify(p.quellen)}`);
    seen.set(p.id, p.quellen);
    if (!p.links.programmwebsite) warn(`${p.id}: keine Programmwebsite.`);
  }
  programme.sort((a, b) => a.titel.localeCompare(b.titel, 'de'));

  return {
    schemaVersion: 1,
    erzeugt: new Date().toISOString().slice(0, 10),
    quelle: { excel: `raw/${EXCEL}`, blatt: sheet, dokumente: docs.length, excelZeilen: excelRows.length },
    hinweis: 'Automatisch aus raw/ erzeugt (npm run import:catalog). Nicht von Hand bearbeiten. Dokumentwerte haben Vorrang vor Excel. null bedeutet: in den Quellen nicht eindeutig angegeben.',
    programme,
  };
}

const catalog = build();
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(catalog, null, 2) + '\n');
console.log(`${catalog.programme.length} Programme → ${path.relative(ROOT, OUT)}`);
if (warnings.length) console.log(`\nHinweise (${warnings.length}):\n` + warnings.map((w) => '  - ' + w).join('\n'));
