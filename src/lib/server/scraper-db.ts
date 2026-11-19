// Liest die lokale Scraper-Datenbank (scripts/scrape-sources.mjs) zur Laufzeit.
// Fehlt die Datei, etwa auf Vercel, liefern alle Funktionen leere Ergebnisse und die App nutzt nur den Katalog.
// Angaben aus Extraktionen fließen nur ein, wenn ein Mensch sie als geprüft markiert hat
// (scripts/review-extraction.mjs) und alle Belege wörtlich im Seitentext stehen.
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import type { Seitenstand } from "@/lib/chat/contract";

/** Angaben einer geprüften Extraktion, Format wie EXTRACT_SCHEMA im Scraper. */
export type PageFacts = {
  frist: { status: "datum" | "laufend" | "kein_aufruf" | "unbekannt"; datum: string | null; beleg: string | null };
  aufruf: { offen: boolean | null; titel: string | null; beleg: string | null };
  foerderbetrag: { minEur: number | null; maxEur: number | null; beleg: string | null };
  unterlagen: { liste: string[]; beleg: string | null };
};

export type ScraperInfo = {
  seitenstand: Seitenstand;
  /** Nur gesetzt, wenn eine geprüfte Extraktion vorliegt. */
  angaben: (PageFacts & { url: string; abgerufenAm: string }) | null;
};

const CACHE_MS = 60_000;
let cache: { at: number; file: string; data: Map<string, ScraperInfo> } | null = null;

const dbFile = () => path.resolve(process.cwd(), process.env.FOERDER_DB_FILE || "data/database.sqlite");

function load(file: string): Map<string, ScraperInfo> {
  const result = new Map<string, ScraperInfo>();
  if (!fs.existsSync(file)) return result;
  let db: DatabaseSync | undefined;
  try {
    db = new DatabaseSync(file, { readOnly: true });
    const stand = db.prepare(`
      SELECT q.programm_id AS id,
             MAX(CASE WHEN a.ergebnis IN ('neu', 'geaendert', 'unveraendert') THEN a.zeitpunkt END) AS geprueft,
             MAX(CASE WHEN a.ergebnis = 'geaendert' THEN a.zeitpunkt END) AS geaendert
      FROM quellen q JOIN abrufe a ON a.quelle_id = q.id
      WHERE q.aktiv = 1
      GROUP BY q.programm_id`).all() as { id: string; geprueft: string | null; geaendert: string | null }[];
    for (const row of stand) {
      if (!row.geprueft) continue;
      result.set(row.id, { seitenstand: { geprueftAm: row.geprueft, geaendertAm: row.geaendert }, angaben: null });
    }
    // Je Programm die jüngste geprüfte Extraktion mit vollständig belegten Zitaten.
    const reviewed = db.prepare(`
      SELECT e.programm_id AS id, e.daten, q.url, a.zeitpunkt
      FROM extraktionen e JOIN abrufe a ON a.id = e.abruf_id JOIN quellen q ON q.id = a.quelle_id
      WHERE e.status IN ('geprueft', 'uebernommen') AND e.belege_geprueft = 1 AND q.aktiv = 1
        AND e.id = (SELECT MAX(x.id) FROM extraktionen x
                    WHERE x.programm_id = e.programm_id AND x.status IN ('geprueft', 'uebernommen') AND x.belege_geprueft = 1)`).all() as { id: string; daten: string; url: string; zeitpunkt: string }[];
    for (const row of reviewed) {
      const info = result.get(row.id);
      if (!info) continue;
      try {
        info.angaben = { ...(JSON.parse(row.daten) as PageFacts), url: row.url, abgerufenAm: row.zeitpunkt };
      } catch {
        // Ungültiges JSON in einer Extraktion: Eintrag ignorieren, Katalog gilt.
      }
    }
  } catch (error) {
    console.warn(`Scraper-Datenbank ${file} nicht lesbar, nutze nur den Katalog:`, error);
    return new Map();
  } finally {
    db?.close();
  }
  return result;
}

/** Stand aller Programmseiten, höchstens eine Minute alt. */
export function scraperData(): Map<string, ScraperInfo> {
  const file = dbFile();
  if (!cache || cache.file !== file || Date.now() - cache.at > CACHE_MS) {
    cache = { at: Date.now(), file, data: load(file) };
  }
  return cache.data;
}

export function scraperInfo(programmeId: string): ScraperInfo | null {
  return scraperData().get(programmeId) ?? null;
}
