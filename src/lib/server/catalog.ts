import catalogFile from "../../../data/json/foerderprogramme.json";
import type { CatalogEntry } from "@/lib/chat/contract";

export type Programme = (typeof catalogFile.programme)[number];

const programmes: Programme[] = catalogFile.programme;
const byId = new Map(programmes.map((p) => [p.id, p]));

export function getProgramme(id: string): Programme | undefined {
  return byId.get(id);
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
  }));
}

/** Katalog ohne Kontakt- und Herkunftsangaben, als Kontext für die Suche. */
export function catalogForSearch() {
  return programmes.map((p) => {
    const entry: Partial<Programme> & { programmwebsite: string | null } = { ...p, programmwebsite: p.links.programmwebsite ?? null };
    delete entry.kontakt;
    delete entry.quellen;
    delete entry.links;
    return entry;
  });
}
