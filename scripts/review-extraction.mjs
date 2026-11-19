// Markiert Extraktionen aus der Scraper-Datenbank als geprüft oder verworfen.
// Nur geprüfte Extraktionen mit wörtlich gefundenen Belegen liest die App live (src/lib/server/scraper-db.ts).
//
//   npm run review                       offene Extraktionen auflisten
//   npm run review -- 12 geprueft        Extraktion 12 nach Prüfung des Belegs freigeben
//   npm run review -- 12 verworfen       Extraktion 12 verwerfen
//
// Vorher die Zitate mit `npm run scrape -- --report --details` gegen die Programmseite prüfen.
import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

const ROOT = path.resolve(import.meta.dirname, '..');
const DB_FILE = path.resolve(ROOT, process.env.FOERDER_DB_FILE || 'data/database.sqlite');
if (!fs.existsSync(DB_FILE)) {
  console.error(`Keine Datenbank unter ${DB_FILE}. Zuerst npm run scrape -- --extract ausführen.`);
  process.exit(1);
}
const db = new DatabaseSync(DB_FILE);
const [id, status] = process.argv.slice(2);

if (!id) {
  const rows = db.prepare(`SELECT id, programm_id, zeitpunkt, belege_geprueft FROM extraktionen WHERE status = 'neu' ORDER BY programm_id, id`).all();
  if (!rows.length) console.log('Keine offenen Extraktionen.');
  for (const r of rows) console.log(`${String(r.id).padEnd(5)} ${r.programm_id.padEnd(45)} ${r.zeitpunkt.slice(0, 10)}  Belege ${r.belege_geprueft ? 'ok' : 'PRÜFEN'}`);
  process.exit(0);
}

if (!['geprueft', 'verworfen'].includes(status)) {
  console.error('Status muss "geprueft" oder "verworfen" sein.');
  process.exit(1);
}
const row = db.prepare(`SELECT programm_id, belege_geprueft FROM extraktionen WHERE id = ?`).get(Number(id));
if (!row) {
  console.error(`Extraktion ${id} gibt es nicht.`);
  process.exit(1);
}
db.prepare(`UPDATE extraktionen SET status = ? WHERE id = ?`).run(status, Number(id));
console.log(`Extraktion ${id} (${row.programm_id}) ist jetzt ${status}.`);
if (status === 'geprueft' && !row.belege_geprueft) {
  console.warn('Achtung: Nicht alle Belege stehen wörtlich im Seitentext. Die App nutzt diese Extraktion deshalb nicht.');
}
