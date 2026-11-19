import catalogFile from "../../../data/json/foerderprogramme.json";
import type { CatalogEntry } from "@/lib/chat/contract";
import { scraperInfo } from "./scraper-db";

export type Programme = (typeof catalogFile.programme)[number];

const programmes: Programme[] = catalogFile.programme;
const byId = new Map(programmes.map((p) => [p.id, p]));

export function getProgramme(id: string): Programme | undefined {
  return byId.get(id);
}

export const today = () => new Date().toISOString().slice(0, 10);

/**
 * Ob man sich noch bewerben kann. Grundlage ist der Katalog. Eine geprüfte Angabe von der
 * Programmseite (Scraper-Datenbank) kann ein Programm zusätzlich schließen, aber nie öffnen.
 * Unbekannte Fristen gelten als offen.
 */
export function availability(programme: Programme, date = today()): { verfuegbar: boolean; grund: string | null } {
  if (programme.frist.status === "kein_aufruf") return { verfuegbar: false, grund: "derzeit kein Förderaufruf" };
  if (programme.frist.status === "datum" && programme.frist.datum && programme.frist.datum < date) {
    return { verfuegbar: false, grund: `Antragsfrist am ${programme.frist.datum} abgelaufen` };
  }
  const page = scraperInfo(programme.id)?.angaben;
  if (page?.frist.status === "kein_aufruf" || page?.aufruf.offen === false) {
    return { verfuegbar: false, grund: "laut Programmseite derzeit kein offener Aufruf" };
  }
  if (page?.frist.status === "datum" && page.frist.datum && page.frist.datum < date) {
    return { verfuegbar: false, grund: `Antragsfrist laut Programmseite am ${page.frist.datum} abgelaufen` };
  }
  return { verfuegbar: true, grund: null };
}

export function seitenstand(programmeId: string) {
  return scraperInfo(programmeId)?.seitenstand ?? null;
}

/** Alle Einträge für die Anzeige, wenn die KI nicht erreichbar ist. */
export function catalogEntries(): CatalogEntry[] {
  return programmes.map((p) => ({
    id: p.id,
    titel: p.titel,
    foerdergeber: p.foerdergeber ?? null,
    ebene: p.ebene ?? null,
    foerdergebiet: p.foerdergebiet ?? null,
    fachbereiche: p.fachbereiche ?? [],
    kurzbeschreibung: p.kurzbeschreibung ?? null,
    frist: { status: p.frist.status, datum: p.frist.datum ?? null },
    url: p.links.programmwebsite ?? null,
    seitenstand: seitenstand(p.id),
  }));
}

/** Katalog ohne Kontakt- und Herkunftsangaben, als Kontext für die Suche. */
export function catalogForSearch() {
  return programmes.map((p) => {
    const page = scraperInfo(p.id)?.angaben;
    const entry: Partial<Programme> & {
      programmwebsite: string | null;
      verfuegbarkeit: ReturnType<typeof availability>;
      programmseite?: object;
    } = {
      ...p,
      programmwebsite: p.links.programmwebsite ?? null,
      verfuegbarkeit: availability(p),
    };
    // Geprüfte Angaben von der Programmseite mit Abrufdatum, zusätzlich zum Katalog.
    if (page) {
      entry.programmseite = {
        abgerufenAm: page.abgerufenAm.slice(0, 10),
        frist: page.frist,
        aufruf: page.aufruf,
        foerderbetrag: page.foerderbetrag,
        unterlagen: page.unterlagen,
      };
    }
    delete entry.kontakt;
    delete entry.quellen;
    delete entry.links;
    return entry;
  });
}
